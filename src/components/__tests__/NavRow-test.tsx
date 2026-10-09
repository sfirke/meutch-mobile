import { fireEvent, render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { NavRow } from '../NavRow';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

describe('<NavRow />', () => {
  test('renders the label as a button named after it', () => {
    render(<NavRow icon="settings" label="Settings" onPress={jest.fn()} />);

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
  });

  test('honors a custom accessibility label', () => {
    render(
      <NavRow
        accessibilityLabel="Open settings"
        icon="settings"
        label="Settings"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
  });

  test('calls onPress when pressed', () => {
    const onPress = jest.fn();

    render(<NavRow icon="settings" label="Settings" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Settings' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
