import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../Button';

describe('<Button />', () => {
  test('renders its label as a button and calls onPress', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} variant="primary" />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test.each([
    'primary',
    'outline',
    'danger',
    'outlineDanger',
    'light',
    'link',
  ] as const)('the %s variant renders its label', (variant) => {
    render(<Button label="Go" variant={variant} />);

    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });

  test('a disabled button does not press and says so', () => {
    const onPress = jest.fn();
    render(
      <Button disabled label="Save" onPress={onPress} variant="primary" />,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  test('a loading button is busy and does not press', () => {
    const onPress = jest.fn();
    render(<Button label="Save" loading onPress={onPress} variant="primary" />);

    const button = screen.getByRole('button', { name: 'Save' });
    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
  });

  test('passes accessibility props and testID through', () => {
    render(
      <Button
        accessibilityHint="Opens the item"
        accessibilityLabel="Open lawn mower"
        accessibilityState={{ selected: true }}
        label="Open"
        testID="open-button"
        variant="outline"
      />,
    );

    const button = screen.getByTestId('open-button');
    expect(button).toHaveAccessibleName('Open lawn mower');
    expect(button.props.accessibilityHint).toBe('Opens the item');
    expect(button).toBeSelected();
  });

  test('can take the link role', () => {
    render(<Button accessibilityRole="link" label="Help" variant="link" />);

    expect(screen.getByRole('link', { name: 'Help' })).toBeTruthy();
  });

  test('shows a leading icon alongside the label', () => {
    render(<Button icon="plus" label="List an item" variant="primary" />);

    expect(screen.getByText('List an item')).toBeTruthy();
  });
});
