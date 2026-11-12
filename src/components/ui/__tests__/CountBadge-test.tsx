import { render, screen } from '@testing-library/react-native';

import { CountBadge, formatCount, UnreadDot } from '../CountBadge';

describe('<CountBadge />', () => {
  test.each([
    [1, '1'],
    [12, '12'],
    [99, '99'],
    [100, '99+'],
    [120, '99+'],
  ])('shows %i as %s', (count, text) => {
    render(<CountBadge count={count} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByLabelText(`${count} unread`)).toBeTruthy();
  });

  test('renders nothing for zero', () => {
    render(<CountBadge count={0} testID="badge" />);
    expect(screen.queryByTestId('badge')).toBeNull();
  });

  test('takes a custom label and cap', () => {
    render(
      <CountBadge accessibilityLabel="3 pending requests" count={12} max={9} />,
    );
    expect(screen.getByText('9+')).toBeTruthy();
    expect(screen.getByLabelText('3 pending requests')).toBeTruthy();
  });

  test('formatCount caps', () => {
    expect(formatCount(5)).toBe('5');
    expect(formatCount(1000)).toBe('99+');
  });
});

describe('<UnreadDot />', () => {
  test('is hidden from screen readers without a label', () => {
    render(<UnreadDot testID="dot" />);
    expect(
      screen.getByTestId('dot', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/unread/)).toBeNull();
  });

  test('passes a label through', () => {
    render(<UnreadDot accessibilityLabel="2 unread" />);
    expect(screen.getByLabelText('2 unread')).toBeTruthy();
  });
});
