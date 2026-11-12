import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { Lifted } from '../Lifted';

describe('<Lifted />', () => {
  test.each(['sm', 'md', 'lg', 'dialog', 'xl'] as const)(
    'renders its child at offset %s',
    (offset) => {
      render(
        <Lifted offset={offset}>
          <Text>Dialog</Text>
        </Lifted>,
      );

      expect(screen.getByText('Dialog')).toBeTruthy();
    },
  );

  test('leaves the child pressable', () => {
    const onPress = jest.fn();
    render(
      <Lifted reserveSpace showOffset={false}>
        <Pressable accessibilityRole="button" onPress={onPress}>
          <Text>Save</Text>
        </Pressable>
      </Lifted>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
