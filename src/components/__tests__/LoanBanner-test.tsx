import { fireEvent, render, screen } from '@testing-library/react-native';

import type { LoanExtensionRequest } from '../../lib/loans';
import type { LoanSummary } from '../../lib/parse';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { LoanBanner } from '../LoanBanner';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const borrower: LoanSummary['borrower'] = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

type BannerLoan = LoanSummary & {
  pending_extension_request?: LoanExtensionRequest | null;
};

const extensionRequest: LoanExtensionRequest = {
  id: 'c3333333-3333-4333-8333-333333333333',
  status: 'pending',
  previous_end_date: '2026-06-10',
  proposed_end_date: '2026-06-17',
  message: 'A few more days, please.',
  created_at: '2026-06-08T12:00:00Z',
  responded_at: null,
};

function buildLoan(overrides: Partial<BannerLoan> = {}): BannerLoan {
  return {
    id: 'b2222222-2222-4222-8222-222222222222',
    start_date: '2026-06-03',
    end_date: '2026-06-10',
    status: 'pending',
    borrower,
    ...overrides,
  };
}

describe('<LoanBanner />', () => {
  test('shows the pending label', () => {
    render(<LoanBanner loan={buildLoan({ status: 'pending' })} />);

    expect(screen.getByText('Loan request pending')).toBeTruthy();
  });

  test('shows the approved label', () => {
    render(<LoanBanner loan={buildLoan({ status: 'approved' })} />);

    expect(screen.getByText('Loan approved')).toBeTruthy();
  });

  test('renders the formatted dates line', () => {
    render(<LoanBanner loan={buildLoan()} />);

    expect(screen.getByText('Jun 3, 2026 to Jun 10, 2026')).toBeTruthy();
  });

  test('opens the loan detail when pressed', () => {
    mockPush.mockClear();
    render(<LoanBanner loan={buildLoan()} />);

    fireEvent.press(screen.getByRole('button', { name: 'View loan' }));

    expect(mockPush).toHaveBeenCalledWith(
      '/loan/b2222222-2222-4222-8222-222222222222',
    );
  });

  test('does not render an identity for the borrower', () => {
    render(<LoanBanner loan={buildLoan()} />);

    expect(screen.queryByText('Ada Example')).toBeNull();
  });

  test('omits the dates line when a date fails to parse', () => {
    render(<LoanBanner loan={buildLoan({ start_date: 'not-a-date' })} />);

    expect(screen.queryByText(/to Jun 10, 2026/)).toBeNull();
  });

  test('shows the requested end date for an approved loan', () => {
    render(
      <LoanBanner
        loan={buildLoan({
          status: 'approved',
          pending_extension_request: extensionRequest,
        })}
      />,
    );

    expect(screen.getByTestId('loan-banner-extension')).toHaveTextContent(
      'More time requested until Jun 17, 2026',
    );
  });

  test('omits the extension line when there is no pending request', () => {
    render(
      <LoanBanner
        loan={buildLoan({
          status: 'approved',
          pending_extension_request: null,
        })}
      />,
    );
    expect(screen.queryByTestId('loan-banner-extension')).toBeNull();

    render(<LoanBanner loan={buildLoan({ status: 'approved' })} />);
    expect(screen.queryByTestId('loan-banner-extension')).toBeNull();
  });

  test('omits the extension line for a pending loan', () => {
    render(
      <LoanBanner
        loan={buildLoan({
          status: 'pending',
          pending_extension_request: extensionRequest,
        })}
      />,
    );

    expect(screen.queryByTestId('loan-banner-extension')).toBeNull();
  });
});
