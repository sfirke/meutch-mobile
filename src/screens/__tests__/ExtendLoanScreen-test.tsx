import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

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
import { ExtendLoanScreen } from '../ExtendLoanScreen';

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
const EXTEND_ROUTE = `POST /loans/${LOAN_ID}/extend`;

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

// Far-future dates, so the picker's minimum (today) never gets in the way.
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
    body: 'Due date changed.',
    timestamp: '2026-05-30T12:00:00+00:00',
    is_read: false,
    sender: owner,
    recipient: borrower,
    ...overrides,
  };
}

const EXTEND_RESPONSE = {
  loan: buildLoan({ end_date: '2030-06-15' }),
  message: buildMessageSummary(),
  is_extension: true,
};

function setParams(id: string | string[] | undefined) {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue(id === undefined ? {} : { id });
}

function renderScreen(routes?: Record<string, MockRoute>) {
  const apiFetch = mockApiFetch({
    [`/loans/${LOAN_ID}`]: { loan: buildLoan() },
    [EXTEND_ROUTE]: EXTEND_RESPONSE,
    ...routes,
  });
  mockSession({ authenticatedApiFetch: apiFetch });
  setParams(LOAN_ID);
  renderWithProviders(<ExtendLoanScreen />);

  return apiFetch;
}

async function settle() {
  await screen.findByTestId('extend-current-due');
}

function pickDate(date: Date) {
  fireEvent.press(screen.getByTestId('date-field-new_end_date'));
  fireEvent(
    screen.getByTestId('date-time-picker'),
    'change',
    {
      type: 'set',
      nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
    },
    date,
  );
  fireEvent.press(screen.getByTestId('date-done-new_end_date'));
}

function submitButton() {
  return screen.getByRole('button', { name: 'Save due date' });
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

describe('<ExtendLoanScreen />', () => {
  test('shows the current due date from the fetched loan', async () => {
    const apiFetch = renderScreen();

    expect(screen.getByLabelText('Loading loan')).toBeTruthy();
    expect(await screen.findByTestId('extend-current-due')).toHaveTextContent(
      'Current due date: Jun 8, 2030',
    );
    expect(apiFetch.mock.calls[0][0]).toBe(`/loans/${LOAN_ID}`);
    expect(screen.getByText('New due date')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Optional note for the borrower'),
    ).toBeTruthy();
  });

  test('keeps submit disabled until a different date is chosen', async () => {
    renderScreen();
    await settle();

    expect(submitButton()).toBeDisabled();

    pickDate(new Date(2030, 5, 8));
    expect(submitButton()).toBeDisabled();

    pickDate(new Date(2030, 5, 15));
    expect(submitButton()).toBeEnabled();
  });

  test('posts only the new date when the note is blank, then goes back', async () => {
    const apiFetch = renderScreen();
    await settle();

    pickDate(new Date(2030, 5, 15));
    fireEvent.changeText(screen.getByTestId('extend-message'), '   ');
    fireEvent.press(submitButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(postBodies(apiFetch)).toEqual([
      {
        path: `/loans/${LOAN_ID}/extend`,
        body: { new_end_date: '2030-06-15' },
      },
    ]);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('includes the trimmed note when one is typed', async () => {
    const apiFetch = renderScreen();
    await settle();

    pickDate(new Date(2030, 5, 15));
    fireEvent.changeText(
      screen.getByTestId('extend-message'),
      '  One more week.  ',
    );
    expect(screen.getByTestId('extend-message-counter')).toHaveTextContent(
      '18/1000',
    );
    fireEvent.press(submitButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(postBodies(apiFetch)[0].body).toEqual({
      new_end_date: '2030-06-15',
      message: 'One more week.',
    });
  });

  test('returns to the loan when there is nothing to go back to', async () => {
    mockCanGoBack.mockReturnValue(false);
    renderScreen();
    await settle();

    pickDate(new Date(2030, 5, 15));
    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(`/loan/${LOAN_ID}`),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('shows a 422 on the new date beside the date field', async () => {
    renderScreen({
      [EXTEND_ROUTE]: jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input.',
            details: { new_end_date: ['Date must be in the future.'] },
          },
        },
        422,
      ),
    });
    await settle();

    pickDate(new Date(2030, 5, 15));
    fireEvent.press(submitButton());

    expect(
      await screen.findByTestId('field-error-new_end_date'),
    ).toHaveTextContent('Date must be in the future.');
    expect(screen.queryByTestId('extend-loan-error')).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();

    // Editing clears the server error.
    pickDate(new Date(2030, 5, 16));
    expect(screen.queryByTestId('field-error-new_end_date')).toBeNull();
  });

  test("shows a 403's server message", async () => {
    renderScreen({
      [EXTEND_ROUTE]: jsonResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only the owner can change the due date.',
          },
        },
        403,
      ),
    });
    await settle();

    pickDate(new Date(2030, 5, 15));
    fireEvent.press(submitButton());

    expect(await screen.findByTestId('extend-loan-error')).toHaveTextContent(
      'Only the owner can change the due date.',
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('shows the error state for an invalid id without fetching', () => {
    const apiFetch = mockApiFetch({});
    mockSession({ authenticatedApiFetch: apiFetch });
    setParams('not-a-uuid');
    renderWithProviders(<ExtendLoanScreen />);

    expect(screen.getByText("This loan isn't available.")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('asks before discarding a chosen date', async () => {
    renderScreen();
    await settle();

    expect(leave().preventDefault).not.toHaveBeenCalled();

    pickDate(new Date(2030, 5, 15));
    expect(leave().preventDefault).toHaveBeenCalled();
    expect(await screen.findByText('Discard these changes?')).toBeTruthy();
    expect(screen.getByText("The due date won't change.")).toBeTruthy();
  });

  test('offers a Cancel button in the header', async () => {
    renderScreen();
    await settle();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockBack).toHaveBeenCalled();
  });
});
