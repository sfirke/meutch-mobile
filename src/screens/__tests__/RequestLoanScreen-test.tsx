import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import {
  addCalendarDays,
  calendarDateFromLocalDate,
  localDateFromCalendarDate,
  todayCalendarDate,
} from '../../lib/dates';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { RequestLoanScreen } from '../RequestLoanScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

type LeaveEvent = {
  preventDefault: jest.Mock;
  data: { action: { type: string } };
};

const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const LOAN_ID = '11111111-1111-4111-8111-111111111111';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';

const mockReplace = jest.fn();
const mockBack = jest.fn();
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
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: jest.fn(() => ({
    id: '22222222-2222-4222-8222-222222222222',
  })),
  useFocusEffect: jest.fn(),
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

const ana = {
  id: '44444444-4444-4444-8444-444444444444',
  first_name: 'Ana',
  last_name: 'Example',
  full_name: 'Ana Example',
  profile_image_url: null,
  profile_viewable: true,
};

const ben = {
  ...ana,
  id: '55555555-5555-4555-8555-555555555555',
  first_name: 'Ben',
  full_name: 'Ben Example',
};

const REQUEST_PATH = `/items/${ITEM_ID}/loan-requests`;
const MESSAGE = 'I need it for a weekend project.';

function createLoan(overrides?: Record<string, unknown>) {
  return {
    id: LOAN_ID,
    status: 'pending',
    start_date: '2026-06-01',
    end_date: '2026-06-10',
    item: {
      id: ITEM_ID,
      name: 'Extension ladder',
      available: true,
      image_url: null,
    },
    owner: ana,
    borrower: ben,
    latest_conversation_message_id: MESSAGE_ID,
    due_state: null,
    days_until_due: null,
    days_overdue: null,
    ...overrides,
  };
}

function buildMessageSummary(overrides?: Record<string, unknown>) {
  return {
    id: MESSAGE_ID,
    body: MESSAGE,
    timestamp: '2026-05-30T12:00:00+00:00',
    is_read: false,
    sender: ben,
    recipient: ana,
    ...overrides,
  };
}

function buildMutationPayload() {
  return {
    loan: createLoan({ created_at: '2026-05-30T12:00:00' }),
    message: buildMessageSummary(),
  };
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return jsonResponse({ error: { code, message, details } }, status);
}

function renderScreen(routes?: Record<string, MockRoute>) {
  const apiFetch = mockApiFetch({ ...routes });
  mockSession({ authenticatedApiFetch: apiFetch });
  renderWithProviders(<RequestLoanScreen />);

  return apiFetch;
}

function openDate(field: string) {
  fireEvent.press(screen.getByTestId(`date-field-${field}`));
}

function pickDate(field: string, value: string) {
  openDate(field);
  const picked = localDateFromCalendarDate(value) as Date;
  fireEvent(
    screen.getByTestId('date-time-picker'),
    'change',
    {
      type: 'set',
      nativeEvent: { timestamp: picked.getTime(), utcOffset: 0 },
    },
    picked,
  );
  fireEvent.press(screen.getByTestId(`date-done-${field}`));
}

const start = addCalendarDays(todayCalendarDate(), 3);
const end = addCalendarDays(todayCalendarDate(), 7);

function fillForm() {
  pickDate('start_date', start);
  pickDate('end_date', end);
  fireEvent.changeText(screen.getByTestId('request-loan-message'), MESSAGE);
}

function submitButton() {
  return screen.getByRole('button', { name: 'Send request' });
}

function leave() {
  const event: LeaveEvent = {
    preventDefault: jest.fn(),
    data: { action: { type: 'GO_BACK' } },
  };

  act(() => mockListeners.beforeRemove(event));

  return event;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('request loan screen', () => {
  test('renders the fields with submit disabled', () => {
    renderScreen();

    expect(screen.getByTestId('date-field-start_date')).toBeTruthy();
    expect(screen.getByTestId('date-field-end_date')).toBeTruthy();
    expect(screen.getByTestId('request-loan-message')).toBeTruthy();
    expect(
      screen.getByTestId('request-loan-message-counter'),
    ).toHaveTextContent('0/1000');
    expect(submitButton()).toBeDisabled();
  });

  test('sends the request and opens the loan', async () => {
    const apiFetch = renderScreen({
      [`POST ${REQUEST_PATH}`]: buildMutationPayload(),
    });

    pickDate('start_date', start);
    pickDate('end_date', end);
    expect(submitButton()).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('request-loan-message'), MESSAGE);
    expect(
      screen.getByTestId('request-loan-message-counter'),
    ).toHaveTextContent(`${MESSAGE.length}/1000`);
    expect(submitButton()).toBeEnabled();

    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(`/loan/${LOAN_ID}`),
    );
    const posts = apiFetch.mock.calls.filter(
      ([path, init]) => path === REQUEST_PATH && init?.method === 'POST',
    );
    expect(posts.map(([, init]) => getRequestBody(init))).toEqual([
      { start_date: start, end_date: end, message: MESSAGE },
    ]);
    expect(leave().preventDefault).not.toHaveBeenCalled();
  });

  test('shows a 422 message error under the field', async () => {
    renderScreen({
      [`POST ${REQUEST_PATH}`]: errorResponse(
        422,
        'VALIDATION_ERROR',
        'Invalid input.',
        { message: ['Length must be between 10 and 1000.'] },
      ),
    });

    fillForm();
    fireEvent.press(submitButton());

    expect(await screen.findByTestId('field-error-message')).toHaveTextContent(
      'Length must be between 10 and 1000.',
    );
    expect(screen.queryByTestId('request-loan-error')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();

    // Editing clears the error.
    fireEvent.changeText(
      screen.getByTestId('request-loan-message'),
      `${MESSAGE} Thanks!`,
    );
    expect(screen.queryByTestId('field-error-message')).toBeNull();
  });

  test('shows a 409 message as a general error', async () => {
    renderScreen({
      [`POST ${REQUEST_PATH}`]: errorResponse(
        409,
        'CONFLICT',
        'You already have a pending request for this item.',
      ),
    });

    fillForm();
    fireEvent.press(submitButton());

    expect(await screen.findByTestId('request-loan-error')).toHaveTextContent(
      'You already have a pending request for this item.',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("shows the server's 403 message", async () => {
    renderScreen({
      [`POST ${REQUEST_PATH}`]: errorResponse(
        403,
        'FORBIDDEN',
        'You are not allowed to request this item.',
      ),
    });

    fillForm();
    fireEvent.press(submitButton());

    expect(await screen.findByTestId('request-loan-error')).toHaveTextContent(
      'You are not allowed to request this item.',
    );
  });

  test('end date minimum follows the start date', () => {
    renderScreen();

    openDate('end_date');
    let minimum = screen.getByTestId('date-time-picker').props
      .minimumDate as Date;
    expect(calendarDateFromLocalDate(minimum)).toBe(todayCalendarDate());
    fireEvent.press(screen.getByTestId('date-done-end_date'));

    pickDate('start_date', start);
    openDate('end_date');
    minimum = screen.getByTestId('date-time-picker').props.minimumDate as Date;
    expect(calendarDateFromLocalDate(minimum)).toBe(start);
  });

  test('clears an end date that falls before a new start date', () => {
    renderScreen();

    pickDate('start_date', start);
    pickDate('end_date', addCalendarDays(start, 1));
    expect(screen.getByTestId('date-field-end_date')).not.toHaveTextContent(
      'Choose a date',
    );

    pickDate('start_date', addCalendarDays(start, 5));
    expect(screen.getByTestId('date-field-end_date')).toHaveTextContent(
      'Choose a date',
    );
  });

  test('offers a Cancel button in the header', () => {
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockBack).toHaveBeenCalled();
  });

  test('leaves a clean form without asking', () => {
    renderScreen();

    expect(leave().preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard this request?')).toBeNull();
  });

  test('asks before discarding a dirty form', () => {
    renderScreen();
    fireEvent.changeText(screen.getByTestId('request-loan-message'), 'Hi');

    const event = leave();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(screen.getByText('Discard this request?')).toBeTruthy();
    expect(screen.getByText("Your request won't be sent.")).toBeTruthy();

    fireEvent.press(
      within(screen.getByTestId('confirm-dialog')).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();

    leave();
    fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });
});
