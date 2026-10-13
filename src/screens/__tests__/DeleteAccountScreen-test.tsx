import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { ApiFetch } from '../../lib/api';
import type { LoanActivity } from '../../lib/loans';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { DeleteAccountScreen } from '../DeleteAccountScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const BORROWING = 'GET /me/loans?role=borrowing&status=all&page=1&per_page=50';
const LENDING = 'GET /me/loans?role=lending&status=all&page=1&per_page=50';
const PHRASE = 'DELETE MY ACCOUNT';

function loan(id: string, overrides?: Partial<LoanActivity>): LoanActivity {
  return {
    id,
    status: 'approved',
    start_date: '2026-06-01',
    end_date: '2026-06-10',
    item: {
      id: `item-${id}`,
      name: 'Extension ladder',
      available: false,
      image_url: null,
    },
    owner: null,
    borrower: null,
    latest_conversation_message_id: null,
    due_state: 'on_time',
    days_until_due: 3,
    days_overdue: null,
    ...overrides,
  };
}

function page(loans: LoanActivity[]) {
  return {
    loans,
    pagination: {
      page: 1,
      per_page: 50,
      total: loans.length,
      pages: 1,
      has_next: false,
      has_prev: false,
    },
  };
}

const NO_LOANS = { [BORROWING]: page([]), [LENDING]: page([]) };

const serverError = () =>
  jsonResponse({ error: { code: 'UNKNOWN', message: 'Boom.' } }, 500);

const discardSession = jest.fn(async () => undefined);

function renderScreen(routes: Record<string, unknown>) {
  const authenticatedApiFetch = mockApiFetch(routes);

  mockSession({
    authenticatedApiFetch: authenticatedApiFetch as unknown as ApiFetch,
    discardSession,
  });
  renderWithProviders(<DeleteAccountScreen />);

  return authenticatedApiFetch;
}

function typePhrase(value: string) {
  fireEvent.changeText(screen.getByTestId('field-confirmation'), value);
}

function deleteButton() {
  return screen.getByRole('button', { name: 'Delete my account' });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('delete account screen', () => {
  test('lists the consequences of deleting', async () => {
    renderScreen(NO_LOANS);

    expect(screen.getByTestId('delete-account-warning')).toBeTruthy();
    expect(screen.getByText('This action cannot be undone')).toBeTruthy();
    expect(screen.getByText('Deleting your account will:')).toBeTruthy();

    for (const text of [
      'Permanently delete all your items',
      'Remove you from all circles',
      'Cancel all pending loan requests',
      'Remove your profile and personal information',
      'Preserve your name in messages and loan history for other members',
    ]) {
      expect(screen.getByText(`• ${text}`)).toBeTruthy();
    }

    await screen.findByTestId('no-outstanding-loans');
  });

  test('shows only the non-zero counts and links to my loans', async () => {
    renderScreen({
      [BORROWING]: page([
        loan('loan-1', { due_state: 'overdue', days_overdue: 2 }),
        loan('loan-2'),
      ]),
      [LENDING]: page([loan('loan-3', { status: 'pending' })]),
    });

    expect(screen.getByTestId('loans-checking')).toBeTruthy();
    await screen.findByTestId('outstanding-loans');

    expect(screen.getByText('Outstanding loans notice')).toBeTruthy();
    expect(
      screen.getByText(
        '• You are currently borrowing 2 items - please return them first',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        '• You have 1 pending request for your items - these will be automatically denied',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/currently lending/)).toBeNull();
    expect(screen.queryByText(/pending requests? to borrow/)).toBeNull();
    expect(screen.queryByTestId('loans-checking')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'View my loans' }));

    expect(mockPush).toHaveBeenCalledWith('/profile/loans');
  });

  test('says a single lent loan will continue until returned', async () => {
    renderScreen({
      [BORROWING]: page([]),
      [LENDING]: page([loan('loan-1')]),
    });

    expect(
      await screen.findByText(
        '• You are currently lending 1 item - this loan will continue until it is returned',
      ),
    ).toBeTruthy();
  });

  test('shows a quiet line when nothing is outstanding', async () => {
    renderScreen(NO_LOANS);

    expect(await screen.findByTestId('no-outstanding-loans')).toBeTruthy();
    expect(screen.queryByTestId('outstanding-loans')).toBeNull();
  });

  test('offers a retry when the loans check fails and still allows deleting', async () => {
    renderScreen({
      [BORROWING]: serverError,
      [LENDING]: page([]),
      'DELETE /me': { deleted: true },
    });

    expect(
      await screen.findByText("We couldn't check your outstanding loans."),
    ).toBeTruthy();
    expect(screen.getByTestId('loans-retry')).toBeTruthy();

    typePhrase(PHRASE);
    fireEvent.press(deleteButton());
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(discardSession).toHaveBeenCalled());
  });

  test('keeps the button disabled until the exact phrase is typed', async () => {
    renderScreen(NO_LOANS);
    await screen.findByTestId('no-outstanding-loans');

    expect(deleteButton().props.accessibilityState.disabled).toBe(true);

    typePhrase('delete my account');
    expect(deleteButton().props.accessibilityState.disabled).toBe(true);

    typePhrase(PHRASE);
    expect(deleteButton().props.accessibilityState.disabled).toBe(false);
  });

  test('deletes the account after confirming and discards the session', async () => {
    const fetch = renderScreen({
      ...NO_LOANS,
      'DELETE /me': { deleted: true },
    });
    await screen.findByTestId('no-outstanding-loans');

    typePhrase(PHRASE);
    fireEvent.press(deleteButton());

    expect(screen.getByText('Delete your account?')).toBeTruthy();
    expect(screen.getByText('This cannot be undone.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() =>
      expect(discardSession).toHaveBeenCalledWith(
        'Your account has been deleted.',
      ),
    );

    const call = fetch.mock.calls.find(([path]) => path === '/me');

    expect(call?.[1]?.method).toBe('DELETE');
    expect(getRequestBody(call?.[1])).toEqual({ confirmation: PHRASE });
  });

  test('shows a delete failure in the dialog and keeps the session', async () => {
    renderScreen({ ...NO_LOANS, 'DELETE /me': serverError });
    await screen.findByTestId('no-outstanding-loans');

    typePhrase(PHRASE);
    fireEvent.press(deleteButton());
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByTestId('confirm-dialog-error')).toBeTruthy();
    expect(discardSession).not.toHaveBeenCalled();
  });

  test('goes back from the cancel button', async () => {
    renderScreen(NO_LOANS);
    await screen.findByTestId('no-outstanding-loans');

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockBack).toHaveBeenCalled();
  });
});
