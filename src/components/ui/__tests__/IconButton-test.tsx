import { fireEvent, render, screen } from '@testing-library/react-native';

import { IconButton } from '../IconButton';

describe('<IconButton />', () => {
  test('is a button named by its label and calls onPress', () => {
    const onPress = jest.fn();
    render(
      <IconButton
        accessibilityLabel="Create"
        icon="plus"
        onPress={onPress}
        variant="primary"
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Create' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test.each(['primary', 'outline', 'ghost'] as const)(
    'the %s variant renders',
    (variant) => {
      render(
        <IconButton accessibilityLabel="Send" icon="send" variant={variant} />,
      );

      expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
    },
  );

  test('a disabled icon button does not press', () => {
    const onPress = jest.fn();
    render(
      <IconButton
        accessibilityLabel="Send"
        disabled
        icon="send"
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  test('a loading icon button is busy and does not press', () => {
    const onPress = jest.fn();
    render(
      <IconButton
        accessibilityLabel="Send"
        icon="send"
        loading
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });

  test('passes the hint and testID through', () => {
    render(
      <IconButton
        accessibilityHint="Sends your message"
        accessibilityLabel="Send"
        icon="send"
        testID="send-button"
      />,
    );

    expect(screen.getByTestId('send-button').props.accessibilityHint).toBe(
      'Sends your message',
    );
  });
});
