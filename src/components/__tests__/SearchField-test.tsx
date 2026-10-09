import { fireEvent, render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { SearchField } from '../SearchField';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

function setup(value: string) {
  const onChangeText = jest.fn();
  const onClear = jest.fn();

  render(
    <SearchField
      onChangeText={onChangeText}
      onClear={onClear}
      placeholder="Search items"
      value={value}
    />,
  );

  return { onChangeText, onClear };
}

describe('<SearchField />', () => {
  test('renders the placeholder and value', () => {
    setup('drill');

    expect(screen.getByPlaceholderText('Search items')).toBeTruthy();
    expect(screen.getByDisplayValue('drill')).toBeTruthy();
  });

  test('uses the placeholder as the default accessibility label', () => {
    setup('');

    expect(screen.getByLabelText('Search items')).toBeTruthy();
  });

  test('calls onChangeText when typing', () => {
    const { onChangeText } = setup('');

    fireEvent.changeText(screen.getByPlaceholderText('Search items'), 'saw');

    expect(onChangeText).toHaveBeenCalledWith('saw');
  });

  test('hides Clear when empty', () => {
    setup('');

    expect(screen.queryByLabelText('Clear')).toBeNull();
  });

  test('shows Clear when non-empty and calls onClear when pressed', () => {
    const { onClear } = setup('saw');

    fireEvent.press(screen.getByLabelText('Clear'));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
