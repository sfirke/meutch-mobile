import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import type { LoanDetail } from '../../lib/loans';
import type { UserSummary } from '../../lib/parse';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { describeLoanActions, LoanActions } from '../LoanActions';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const LOAN_ID = 'd4444444-4444-4444-8444-444444444444';

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

function buildLoan(overrides?: Partial<LoanDetail>): LoanDetail {
  return {
    id: LOAN_ID,
    status: 'pending',
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    item: {
      id: 'f6666666-6666-4666-8666-666666666666',
      name: 'Cordless drill',
      available: true,
      image_url: null,
    },
    owner,
    borrower,
    latest_conversation_message_id: null,
    due_state: null,
    days_until_due: null,
    days_overdue: null,
    created_at: '2026-05-26T18:30:00+00:00',
    ...overrides,
  };
}

function mutationResponse(loan: LoanDetail) {
  return {
    loan,
    message: {
      id: 'e5555555-5555-4555-8555-555555555555',
      body: 'Loan updated.',
      timestamp: '2026-05-30T12:00:00+00:00',
      is_read: false,
      sender: owner,
      recipient: borrower,
    },
  };
}

function renderActions(
  loan: LoanDetail,
  isBorrower: boolean,
  routes: Parameters<typeof mockApiFetch>[0] = {},
) {
  const authenticatedApiFetch = mockApiFetch(routes);

  mockSession({ authenticatedApiFetch });
  renderWithProviders(<LoanActions isBorrower={isBorrower} loan={loan} />);

  return authenticatedApiFetch;
}

function kinds(status: LoanDetail['status'], isBorrower: boolean) {
  return describeLoanActions({ status }, isBorrower).map((a) => a.kind);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('describeLoanActions', () => {
  test('a pending borrower can only cancel the request', () => {
    expect(kinds('pending', true)).toEqual(['cancel']);
  });

  test('a pending owner can approve, deny, or change the due date', () => {
    expect(kinds('pending', false)).toEqual(['approve', 'deny', 'extend']);
  });

  test('an approved borrower has nothing yet', () => {
    expect(kinds('approved', true)).toEqual([]);
  });

  test('an approved owner can mark returned, change the due date, or cancel', () => {
    expect(kinds('approved', false)).toEqual([
      'complete',
      'extend',
      'owner-cancel',
    ]);
  });

  test.each(['completed', 'denied', 'canceled', null] as const)(
    'a %s loan has no actions for either side',
    (status) => {
      expect(kinds(status, true)).toEqual([]);
      expect(kinds(status, false)).toEqual([]);
    },
  );
});

describe('<LoanActions />', () => {
  test('renders nothing for an approved borrower', () => {
    renderActions(buildLoan({ status: 'approved' }), true);

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('labels the owner buttons on a pending request', () => {
    renderActions(buildLoan(), false);

    expect(screen.getByTestId('loan-action-approve')).toHaveTextContent(
      'Approve',
    );
    expect(screen.getByTestId('loan-action-deny')).toHaveTextContent('Deny');
    expect(
      within(screen.getByTestId('loan-action-extend')).getByText(
        'Change due date',
      ),
    ).toBeTruthy();
  });

  test('approving asks first, then posts and closes the dialog', async () => {
    const loan = buildLoan();
    const authenticatedApiFetch = renderActions(loan, false, {
      [`POST /loans/${LOAN_ID}/approve`]: mutationResponse({
        ...loan,
        status: 'approved',
      }),
    });

    fireEvent.press(screen.getByTestId('loan-action-approve'));

    const dialog = screen.getByTestId('confirm-dialog');

    expect(within(dialog).getByText('Approve this request?')).toBeTruthy();
    expect(
      within(dialog).getByText(
        'Ben will be able to borrow Cordless drill from Jun 1, 2026 to Jun 8, 2026.',
      ),
    ).toBeTruthy();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
      `/loans/${LOAN_ID}/approve`,
    );
    expect(authenticatedApiFetch.mock.calls[0][1]?.method).toBe('POST');
  });

  test('a denied deny keeps the dialog open with the server message', async () => {
    renderActions(buildLoan(), false, {
      [`POST /loans/${LOAN_ID}/deny`]: jsonResponse(
        {
          error: {
            code: 'CONFLICT',
            message: 'This request was already cancelled.',
          },
        },
        409,
      ),
    });

    fireEvent.press(screen.getByTestId('loan-action-deny'));
    expect(screen.getByText('Deny this request?')).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    const dialog = await screen.findByTestId('confirm-dialog');

    expect(
      await within(dialog).findByText('This request was already cancelled.'),
    ).toBeTruthy();
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
  });

  test("shows a 403's own message", async () => {
    renderActions(buildLoan({ status: 'approved' }), false, {
      [`POST /loans/${LOAN_ID}/complete`]: jsonResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only the owner can mark this loan returned.',
          },
        },
        403,
      ),
    });

    fireEvent.press(screen.getByTestId('loan-action-complete'));
    expect(screen.getByText('Mark this loan returned?')).toBeTruthy();
    expect(screen.getByText('The item becomes available again.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByTestId('confirm-dialog-error')).toHaveTextContent(
      'Only the owner can mark this loan returned.',
    );
  });

  test('keeping the request sends nothing and closes the dialog', async () => {
    const authenticatedApiFetch = renderActions(buildLoan(), true);

    fireEvent.press(screen.getByTestId('loan-action-cancel'));

    const dialog = screen.getByTestId('confirm-dialog');

    expect(within(dialog).getByText('Cancel this request?')).toBeTruthy();
    expect(within(dialog).getByText('Cancel request')).toBeTruthy();
    fireEvent.press(within(dialog).getByRole('button', { name: 'Keep' }));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
  });

  test('cancelling a loan uses the owner-cancel action', async () => {
    const loan = buildLoan({ status: 'approved' });
    const authenticatedApiFetch = renderActions(loan, false, {
      [`POST /loans/${LOAN_ID}/owner-cancel`]: mutationResponse({
        ...loan,
        status: 'canceled',
      }),
    });

    fireEvent.press(screen.getByTestId('loan-action-owner-cancel'));
    expect(screen.getByText('Cancel this loan?')).toBeTruthy();
    expect(screen.getByText('This ends the loan early.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
      `/loans/${LOAN_ID}/owner-cancel`,
    );
  });

  test('Change due date opens the extend route without a dialog', () => {
    const authenticatedApiFetch = renderActions(buildLoan(), false);

    fireEvent.press(screen.getByTestId('loan-action-extend'));

    expect(mockPush).toHaveBeenCalledWith(`/loan/${LOAN_ID}/extend`);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
  });
});
