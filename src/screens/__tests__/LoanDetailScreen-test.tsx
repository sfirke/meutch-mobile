import { fireEvent, screen, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import type { LoanDetail } from '../../lib/loans';
import type { UserSummary } from '../../lib/parse';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { LoanDetailScreen } from '../LoanDetailScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const LOAN_ID = 'd4444444-4444-4444-8444-444444444444';
const ITEM_ID = 'f6666666-6666-4666-8666-666666666666';
const MESSAGE_ID = 'e5555555-5555-4555-8555-555555555555';

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
    status: 'approved',
    start_date: '2026-06-01',
    end_date: '2026-06-08',
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
    created_at: '2026-05-26T18:30:00+00:00',
    ...overrides,
  };
}

function mockFetch(viewerId: string) {
  const authenticatedApiFetch = jest.fn();

  mockSession({
    authenticatedApiFetch,
    user: {
      id: viewerId,
      email: 'fake.member@example.com',
      email_confirmed: true,
      first_name: 'Fake',
      last_name: 'Member',
      full_name: 'Fake Member',
      profile_image_url: null,
    },
  });

  return authenticatedApiFetch;
}

function setParams(id: string | string[] | undefined) {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue(id === undefined ? {} : { id });
}

type RenderOptions = {
  loan?: Partial<LoanDetail>;
  as?: 'borrower' | 'lender';
};

function renderScreen(options: RenderOptions = {}) {
  const loan = buildLoan(options.loan);
  const authenticatedApiFetch = mockFetch(
    options.as === 'lender' ? owner.id : borrower.id,
  );

  authenticatedApiFetch.mockResolvedValue(jsonResponse({ loan }));
  setParams(LOAN_ID);
  renderWithProviders(<LoanDetailScreen />);

  return { authenticatedApiFetch, loan };
}

function renderError(status: number, code: string) {
  const authenticatedApiFetch = mockFetch(borrower.id);

  authenticatedApiFetch.mockResolvedValue(
    jsonResponse({ error: { code, message: 'Nope.' } }, status),
  );
  setParams(LOAN_ID);
  renderWithProviders(<LoanDetailScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<LoanDetailScreen />', () => {
  test('requests the loan by id and renders its details', async () => {
    const { authenticatedApiFetch } = renderScreen();

    expect(screen.getByLabelText('Loading loan')).toBeTruthy();
    expect(await screen.findByText('Loan approved')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(`/loans/${LOAN_ID}`);
    expect(screen.getByText('Cordless drill')).toBeTruthy();
    expect(screen.getByText('Dates')).toBeTruthy();
    expect(screen.getByText('Jun 1, 2026 to Jun 8, 2026')).toBeTruthy();
    expect(screen.getByText(/^Requested /)).toBeTruthy();
  });

  test('shows the borrower who lent the item and their approved action', async () => {
    renderScreen();

    expect(await screen.findByText('Borrowed from')).toBeTruthy();
    expect(screen.getByText('Ana Example')).toBeTruthy();
    expect(screen.queryByText('Lent to')).toBeNull();
    expect(screen.getByText('Ask for more time on meutch.com.')).toBeTruthy();
  });

  test('offers a pending borrower a cancel note', async () => {
    renderScreen({ loan: { status: 'pending', due_state: null } });

    expect(
      await screen.findByText('Cancel this request on meutch.com.'),
    ).toBeTruthy();
    expect(screen.getByText('Loan request pending')).toBeTruthy();
  });

  test('shows the lender who borrowed the item', async () => {
    renderScreen({ as: 'lender', loan: { status: 'pending' } });

    expect(await screen.findByText('Lent to')).toBeTruthy();
    expect(screen.getByText('Ben Example')).toBeTruthy();
    expect(
      screen.getByText('Approve or deny this request on meutch.com.'),
    ).toBeTruthy();
  });

  test('offers an approved lender the return note', async () => {
    renderScreen({ as: 'lender' });

    expect(
      await screen.findByText(
        'Mark this loan returned or change its due date on meutch.com.',
      ),
    ).toBeTruthy();
  });

  test('has no web-only note for a completed loan', async () => {
    renderScreen({ loan: { status: 'completed', due_state: null } });

    expect(await screen.findByText('Completed')).toBeTruthy();
    expect(screen.queryByText(/on meutch\.com\.$/)).toBeNull();
  });

  test('shows the due line in the status banner', async () => {
    renderScreen({
      loan: { due_state: 'overdue', days_until_due: null, days_overdue: 2 },
    });

    const banner = await screen.findByTestId('loan-status-banner');

    expect(within(banner).getByText('Overdue by 2 days')).toBeTruthy();
  });

  test('opens the item from the item row', async () => {
    renderScreen();

    fireEvent.press(
      await screen.findByRole('button', { name: 'Cordless drill' }),
    );

    expect(mockPush).toHaveBeenCalledWith(`/item/${ITEM_ID}`);
  });

  test('opens the conversation thread', async () => {
    renderScreen();

    fireEvent.press(
      await screen.findByRole('button', { name: 'View conversation' }),
    );

    expect(mockPush).toHaveBeenCalledWith(`/message/${MESSAGE_ID}`);
  });

  test('hides the conversation link when there is none', async () => {
    renderScreen({ loan: { latest_conversation_message_id: null } });

    expect(await screen.findByText('Loan approved')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'View conversation' }),
    ).toBeNull();
  });

  test('links to the counterpart profile when viewable', async () => {
    renderScreen({ loan: { owner: { ...owner, profile_viewable: true } } });

    fireEvent.press(
      await screen.findByRole('link', { name: "View Ana Example's profile" }),
    );

    expect(mockPush).toHaveBeenCalledWith(`/user/${owner.id}`);
  });

  test('has no profile link when the counterpart is not viewable', async () => {
    renderScreen();

    expect(await screen.findByText('Ana Example')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('shows a deleted counterpart', async () => {
    renderScreen({ loan: { owner: null } });

    expect(await screen.findByText('Deleted User')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('<LoanDetailScreen /> errors', () => {
  test('explains a 404 without offering a retry', async () => {
    renderError(404, 'NOT_FOUND');

    expect(
      await screen.findByText(
        "It may have been removed, or you're not part of it.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("This loan isn't available.")).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('explains a 403 without offering a retry', async () => {
    renderError(403, 'FORBIDDEN');

    expect(
      await screen.findByText(
        "It may have been removed, or you're not part of it.",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('shows the error state for an id that is not a uuid', async () => {
    const authenticatedApiFetch = mockFetch(borrower.id);

    setParams('not-a-uuid');
    renderWithProviders(<LoanDetailScreen />);

    expect(
      await screen.findByText(
        'It may have been removed, or the link is wrong.',
      ),
    ).toBeTruthy();
    expect(screen.getByText("This loan isn't available.")).toBeTruthy();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
  });
});
