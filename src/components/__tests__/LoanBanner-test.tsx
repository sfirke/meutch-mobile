import { render, screen } from '@testing-library/react-native';

import type { LoanSummary } from '../../lib/parse';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { LoanBanner } from '../LoanBanner';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const borrower: LoanSummary['borrower'] = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

function buildLoan(overrides: Partial<LoanSummary> = {}): LoanSummary {
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

  test('renders the web-only note', () => {
    render(<LoanBanner loan={buildLoan()} />);

    expect(
      screen.getByText('Approve, deny, or extend this loan on meutch.com.'),
    ).toBeTruthy();
  });

  test('does not render an identity for the borrower', () => {
    render(<LoanBanner loan={buildLoan()} />);

    expect(screen.queryByText('Ada Example')).toBeNull();
  });

  test('omits the dates line when a date fails to parse', () => {
    render(<LoanBanner loan={buildLoan({ start_date: 'not-a-date' })} />);

    expect(screen.queryByText(/to Jun 10, 2026/)).toBeNull();
  });
});
