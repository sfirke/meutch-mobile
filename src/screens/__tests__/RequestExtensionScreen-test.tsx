import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { localDateFromCalendarDate, todayCalendarDate } from '../../lib/dates';
import type { LoanDetail } from '../../lib/loans';
import type { UserSummary } from '../../lib/parse';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { RequestExtensionScreen } from '../RequestExtensionScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

type LeaveEvent = {
  preventDefault: jest.Mock;
  data: { action: { type: string } };
};

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockListeners: Record<string, (event: LeaveEvent) => void> = {};
const mockNavigation = {
  addListener: jest.fn(
    (name: string, listener: (event: LeaveEvent) => void) => {
      mockListeners[name] = listener;
      return () => undefined;
    },
  ),
  dispatch: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({
      options,
    }: {
      options?: { headerLeft?: () => React.ReactNode };
    }) => options?.headerLeft?.() ?? null,
  },
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: jest.fn(),
  useNavigation: () => mockNavigation,
}));

jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (
    prevent: boolean,
    callback: (event: { data: LeaveEvent['data'] }) => void,
  ) => {
    mockNavigation.addListener('beforeRemove', (event: LeaveEvent) => {
      if (prevent) {
        event.preventDefault();
        callback({ data: event.data });
      }
    });
  },
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const LOAN_ID = 'd4444444-4444-4444-8444-444444444444';
const ITEM_ID = 'f6666666-6666-4666-8666-666666666666';
const MESSAGE_ID = 'e5555555-5555-4555-8555-555555555555';
const REQUEST_ROUTE = `POST /loans/${LOAN_ID}/extension-requests`;

const owner: UserSummary = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ana',
  last_name: 'Example',
  full_name: 'Ana Example',
  profile_image_url: null,
  profile_viewable: false,
};

const borrower: UserSummary = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Ben',
  last_name: 'Example',
  full_name: 'Ben Example',
  profile_image_url: null,
  profile_viewable: false,
};

// Far-future dates, so today never sets the picker's minimum.
function buildLoan(overrides?: Partial<LoanDetail>): LoanDetail {
  return {
    id: LOAN_ID,
    status: 'approved',
    start_date: '2030-06-01',
    end_date: '2030-06-08',
    item: {
      id: ITEM_ID,
      name: 'Cordless drill',
      available: false,
      image_url: null,
    },
    owner,
    borrower,
    latest_conversation_message_id: MESSAGE_ID,
    due_state: 'on_time',
    days_until_due: 5,
    days_overdue: null,
    pending_extension_request: null,
    created_at: '2026-05-26T18:30:00+00:00',
    ...overrides,
  };
}

function buildMessageSummary(overrides?: Record<string, unknown>) {
  return {
    id: MESSAGE_ID,
    body: 'Can I keep it another week?',
    timestamp: '2026-05-30T12:00:00+00:00',
    is_read: false,
    sender: borrower,
    recipient: owner,
    ...overrides,
  };
}

const REQUEST_RESPONSE = {
  loan: buildLoan(),
  message: buildMessageSummary(),
};

const VALID_MESSAGE = 'Can I keep it another week?';

function setParams(id: string | string[] | undefined) {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue(id === undefined ? {} : { id });
}

function renderScreen(routes?: Record<string, MockRoute>) {
  const apiFetch = mockApiFetch({
    [`/loans/${LOAN_ID}`]: { loan: buildLoan() },
    [REQUEST_ROUTE]: REQUEST_RESPONSE,
    ...routes,
  });
  mockSession({ authenticatedApiFetch: apiFetch });
  setParams(LOAN_ID);
  renderWithProviders(<RequestExtensionScreen />);

  return apiFetch;
}

async function settle() {
  await screen.findByTestId('extension-current-due');
}

function pickDate(date: Date) {
  fireEvent.press(screen.getByTestId('date-field-proposed_end_date'));
  fireEvent(
    screen.getByTestId('date-time-picker'),
    'change',
    {
      type: 'set',
      nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
    },
    date,
  );
  fireEvent.press(screen.getByTestId('date-done-proposed_end_date'));
}

function openPicker() {
  fireEvent.press(screen.getByTestId('date-field-proposed_end_date'));
  return screen.getByTestId('date-time-picker');
}

function typeMessage(text: string) {
  fireEvent.changeText(screen.getByTestId('extension-message'), text);
}

function submitButton() {
  return screen.getByRole('button', { name: 'Send request' });
}

function postBodies(apiFetch: ReturnType<typeof mockApiFetch>) {
  return apiFetch.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([path, init]) => ({ path, body: getRequestBody(init) }));
}

function leave(): LeaveEvent {
  const event: LeaveEvent = {
    preventDefault: jest.fn(),
    data: { action: { type: 'GO_BACK' } },
  };
  act(() => mockListeners.beforeRemove?.(event));
  return event;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
});

describe('<RequestExtensionScreen />', () => {
  test('shows the current due date from the fetched loan', async () => {
    const apiFetch = renderScreen();

    expect(screen.getByLabelText('Loading loan')).toBeTruthy();
    expect(
      await screen.findByTestId('extension-current-due'),
    ).toHaveTextContent('Current due date: Jun 8, 2030');
    expect(apiFetch.mock.calls[0][0]).toBe(`/loans/${LOAN_ID}`);
    expect(screen.getByText('New due date')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Tell the owner why you need longer.'),
    ).toBeTruthy();
  });

  test('starts the picker the day after a future due date', async () => {
    renderScreen();
    await settle();

    expect(openPicker().props.minimumDate).toEqual(new Date(2030, 5, 9));
  });

  test('starts the picker today when the loan is overdue', async () => {
    renderScreen({
      [`/loans/${LOAN_ID}`]: {
        loan: buildLoan({
          start_date: '2020-01-01',
          end_date: '2020-01-08',
          due_state: 'overdue',
          days_until_due: null,
          days_overdue: 30,
        }),
      },
    });
    await settle();

    expect(openPicker().props.minimumDate).toEqual(
      localDateFromCalendarDate(todayCalendarDate()),
    );
  });

  test('keeps submit disabled until a date and a 10-character message', async () => {
    renderScreen();
    await settle();

    expect(submitButton()).toBeDisabled();

    pickDate(new Date(2030, 5, 15));
    expect(submitButton()).toBeDisabled();
    expect(screen.queryByTestId('extension-message-hint')).toBeNull();

    typeMessage('  too short  ');
    expect(submitButton()).toBeDisabled();
    expect(screen.getByTestId('extension-message-hint')).toHaveTextContent(
      'At least 10 characters.',
    );

    typeMessage('Ten chars!');
    expect(submitButton()).toBeEnabled();
    expect(screen.queryByTestId('extension-message-hint')).toBeNull();
    expect(screen.getByTestId('extension-message-counter')).toHaveTextContent(
      '10/1000',
    );
  });

  test('posts the date and trimmed message, then goes back', async () => {
    const apiFetch = renderScreen();
    await settle();

    pickDate(new Date(2030, 5, 15));
    typeMessage(`  ${VALID_MESSAGE}  `);
    fireEvent.press(submitButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(postBodies(apiFetch)).toEqual([
      {
        path: `/loans/${LOAN_ID}/extension-requests`,
        body: { proposed_end_date: '2030-06-15', message: VALID_MESSAGE },
      },
    ]);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('returns to the loan when there is nothing to go back to', async () => {
    mockCanGoBack.mockReturnValue(false);
    renderScreen();
    await settle();

    pickDate(new Date(2030, 5, 15));
    typeMessage(VALID_MESSAGE);
    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(`/loan/${LOAN_ID}`),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('shows a 422 on the proposed date beside the date field', async () => {
    renderScreen({
      [REQUEST_ROUTE]: jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input.',
            details: { proposed_end_date: ['Not a valid date.'] },
          },
        },
        422,
      ),
    });
    await settle();

    pickDate(new Date(2030, 5, 15));
    typeMessage(VALID_MESSAGE);
    fireEvent.press(submitButton());

    expect(
      await screen.findByTestId('field-error-proposed_end_date'),
    ).toHaveTextContent('Not a valid date.');
    expect(screen.queryByTestId('extension-error')).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();

    // Editing clears the server error.
    pickDate(new Date(2030, 5, 16));
    expect(screen.queryByTestId('field-error-proposed_end_date')).toBeNull();
  });

  test("shows a 409's server message", async () => {
    renderScreen({
      [REQUEST_ROUTE]: jsonResponse(
        {
          error: {
            code: 'CONFLICT',
            message:
              'You already have a pending extension request for this loan.',
          },
        },
        409,
      ),
    });
    await settle();

    pickDate(new Date(2030, 5, 15));
    typeMessage(VALID_MESSAGE);
    fireEvent.press(submitButton());

    expect(await screen.findByTestId('extension-error')).toHaveTextContent(
      'You already have a pending extension request for this loan.',
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('shows the error state for an invalid id without fetching', () => {
    const apiFetch = mockApiFetch({});
    mockSession({ authenticatedApiFetch: apiFetch });
    setParams('not-a-uuid');
    renderWithProviders(<RequestExtensionScreen />);

    expect(screen.getByText("This loan isn't available.")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('asks before discarding a typed message', async () => {
    renderScreen();
    await settle();

    expect(leave().preventDefault).not.toHaveBeenCalled();

    typeMessage('Need it longer');
    expect(leave().preventDefault).toHaveBeenCalled();
    expect(await screen.findByText('Discard this request?')).toBeTruthy();
    expect(screen.getByText("Your request won't be sent.")).toBeTruthy();
  });

  test('offers a Cancel button in the header', async () => {
    renderScreen();
    await settle();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockBack).toHaveBeenCalled();
  });
});
