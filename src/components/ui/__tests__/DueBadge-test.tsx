import { render, screen } from '@testing-library/react-native';

import type { LoanActivity } from '../../../lib/loans';
import { DueBadge } from '../DueBadge';

function buildLoan(overrides: Partial<LoanActivity> = {}): LoanActivity {
  return {
    id: 'c3333333-3333-4333-8333-333333333333',
    status: 'approved',
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    item: {
      id: 'd4444444-4444-4444-8444-444444444444',
      name: 'Folding ladder',
      available: false,
      image_url: null,
    },
    owner: null,
    borrower: null,
    latest_conversation_message_id: null,
    due_state: 'on_time',
    days_until_due: 3,
    days_overdue: null,
    pending_extension_request: null,
    ...overrides,
  };
}

describe('<DueBadge />', () => {
  test.each<[string, Partial<LoanActivity>, string]>([
    [
      'overdue by one day',
      { due_state: 'overdue', days_overdue: 1 },
      'Overdue by 1 day',
    ],
    [
      'overdue by days',
      { due_state: 'overdue', days_overdue: 4 },
      'Overdue by 4 days',
    ],
    ['due today', { due_state: 'due_today', days_until_due: 0 }, 'Due today'],
    ['due soon', { due_state: 'due_soon', days_until_due: 1 }, 'Due in 1 day'],
    ['on time', { due_state: 'on_time', days_until_due: 9 }, 'Due in 9 days'],
  ])('%s', (_name, overrides, text) => {
    render(<DueBadge loan={buildLoan(overrides)} />);
    expect(screen.getByText(text)).toBeTruthy();
  });

  test('renders nothing for a loan that is not approved', () => {
    render(<DueBadge loan={buildLoan({ status: 'pending' })} testID="due" />);
    expect(screen.queryByTestId('due')).toBeNull();
  });
});
