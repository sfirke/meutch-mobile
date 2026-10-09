import { fireEvent, render, screen } from '@testing-library/react-native';

import type { LoanActivity } from '../../lib/loans';
import type { UserSummary } from '../../lib/parse';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { LoanRow } from '../LoanRow';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

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

function buildLoan(overrides: Partial<LoanActivity> = {}): LoanActivity {
  return {
    id: 'c3333333-3333-4333-8333-333333333333',
    status: 'approved',
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    item: {
      id: 'd4444444-4444-4444-8444-444444444444',
      name: 'Folding Ladder',
      available: false,
      image_url: null,
    },
    owner,
    borrower,
    latest_conversation_message_id: null,
    due_state: 'on_time',
    days_until_due: 3,
    days_overdue: null,
    ...overrides,
  };
}

describe('LoanRow', () => {
  it('distinguishes a pending request from an approved loan by label', () => {
    render(
      <LoanRow
        loan={buildLoan({ status: 'pending', due_state: null })}
        onPress={jest.fn()}
        role="borrowing"
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Folding Ladder, From Ana Example, Loan request pending',
      }),
    ).toBeTruthy();
  });

  it('shows the owner when borrowing', () => {
    render(<LoanRow loan={buildLoan()} role="borrowing" />);

    expect(screen.getByText('Folding Ladder')).toBeTruthy();
    expect(screen.getByText('From Ana Example')).toBeTruthy();
  });

  it('shows the borrower when lending', () => {
    render(<LoanRow loan={buildLoan()} role="lending" />);

    expect(screen.getByText('To Ben Example')).toBeTruthy();
  });

  it('falls back to Deleted User for a missing borrower', () => {
    render(<LoanRow loan={buildLoan({ borrower: null })} role="lending" />);

    expect(screen.getByText('To Deleted User')).toBeTruthy();
  });

  it('shows the date range', () => {
    render(<LoanRow loan={buildLoan()} role="borrowing" />);

    expect(screen.getByText('Jun 1, 2026 to Jun 8, 2026')).toBeTruthy();
  });

  it('shows the overdue chip for an overdue approved loan', () => {
    render(
      <LoanRow
        loan={buildLoan({ due_state: 'overdue', days_overdue: 2 })}
        role="borrowing"
      />,
    );

    expect(screen.getByTestId('loan-row-chip')).toHaveTextContent(
      'Overdue by 2 days',
    );
  });

  it('shows the pending status chip', () => {
    render(
      <LoanRow
        loan={buildLoan({ status: 'pending', due_state: null })}
        role="borrowing"
      />,
    );

    expect(screen.getByTestId('loan-row-chip')).toHaveTextContent(
      'Loan request pending',
    );
  });

  it('shows days until due for an on-time approved loan', () => {
    render(<LoanRow loan={buildLoan()} role="borrowing" />);

    expect(screen.getByTestId('loan-row-chip')).toHaveTextContent(
      'Due in 3 days',
    );
  });

  it('calls onPress with the loan', () => {
    const loan = buildLoan();
    const onPress = jest.fn();
    render(<LoanRow loan={loan} onPress={onPress} role="borrowing" />);

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Folding Ladder, From Ana Example, Due in 3 days',
      }),
    );

    expect(onPress).toHaveBeenCalledWith(loan);
  });

  it('is not a button without onPress', () => {
    render(<LoanRow loan={buildLoan()} role="borrowing" />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
