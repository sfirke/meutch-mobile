import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '../EmptyState';

describe('<EmptyState />', () => {
  test('renders the title only when no message or action is given', () => {
    render(<EmptyState title="No items yet" />);

    expect(screen.getByText('No items yet')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('renders an optional message', () => {
    render(<EmptyState message="Check back later." title="No items yet" />);

    expect(screen.getByText('Check back later.')).toBeTruthy();
  });

  test('renders an action button and calls onAction when pressed', () => {
    const onAction = jest.fn();

    render(
      <EmptyState
        actionLabel="Browse items"
        onAction={onAction}
        title="No items yet"
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Browse items' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  test('omits the action button when onAction is missing', () => {
    render(<EmptyState actionLabel="Browse items" title="No items yet" />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
