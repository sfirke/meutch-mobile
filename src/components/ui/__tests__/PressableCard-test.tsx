import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PressableCard } from '../PressableCard';

describe('<PressableCard />', () => {
  test('is a button that calls onPress', () => {
    const onPress = jest.fn();
    render(
      <PressableCard accessibilityLabel="Ladder" onPress={onPress}>
        <Text>Ladder</Text>
      </PressableCard>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Ladder' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('calls onLongPress', () => {
    const onLongPress = jest.fn();
    render(
      <PressableCard onLongPress={onLongPress} testID="card">
        <Text>Ladder</Text>
      </PressableCard>,
    );

    fireEvent(screen.getByTestId('card'), 'longPress');

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  test('does not press when disabled and reports the disabled state', () => {
    const onPress = jest.fn();
    render(
      <PressableCard accessibilityLabel="Ladder" disabled onPress={onPress}>
        <Text>Ladder</Text>
      </PressableCard>,
    );

    const card = screen.getByRole('button', { name: 'Ladder' });
    fireEvent.press(card);

    expect(onPress).not.toHaveBeenCalled();
    expect(card).toBeDisabled();
  });

  test('accepts a different accessibility role', () => {
    render(
      <PressableCard accessibilityLabel="Tent" accessibilityRole="link">
        <Text>Tent</Text>
      </PressableCard>,
    );

    expect(screen.getByRole('link', { name: 'Tent' })).toBeTruthy();
  });
});
