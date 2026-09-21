import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorState } from '../ErrorState';

describe('<ErrorState />', () => {
  test('renders the title and message', () => {
    render(<ErrorState message="Check your connection." title="Offline" />);

    expect(screen.getByText('Offline')).toBeTruthy();
    expect(screen.getByText('Check your connection.')).toBeTruthy();
  });

  test('omits the retry button when onRetry is not given', () => {
    render(<ErrorState message="Gone." title="Not found" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('renders a retry button and calls onRetry when pressed', () => {
    const onRetry = jest.fn();

    render(
      <ErrorState message="Try again." onRetry={onRetry} title="Failed" />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('disables the retry button while isRetrying is true', () => {
    const onRetry = jest.fn();

    render(
      <ErrorState
        isRetrying
        message="Try again."
        onRetry={onRetry}
        title="Failed"
      />,
    );

    const button = screen.getByRole('button', { name: 'Try again' });

    fireEvent.press(button);

    expect(onRetry).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true }),
    );
  });
});
