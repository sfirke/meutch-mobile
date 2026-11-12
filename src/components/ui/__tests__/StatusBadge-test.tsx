import { render, screen } from '@testing-library/react-native';

import { StatusBadge } from '../StatusBadge';

describe('<StatusBadge />', () => {
  test.each([
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['denied', 'Denied'],
    ['canceled', 'Canceled'],
  ])('labels %s as %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  test('takes a custom label', () => {
    render(<StatusBadge label="Loan request pending" status="pending" />);
    expect(screen.getByText('Loan request pending')).toBeTruthy();
  });
});
