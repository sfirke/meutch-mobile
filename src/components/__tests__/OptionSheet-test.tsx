import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { OptionSheet } from '../OptionSheet';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

function renderSheet(props: Partial<Parameters<typeof OptionSheet>[0]> = {}) {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  render(
    <OptionSheet
      onClose={onClose}
      onSelect={onSelect}
      options={options}
      title="Pick one"
      value="a"
      visible
      {...props}
    />,
  );

  return { onSelect, onClose };
}

describe('<OptionSheet />', () => {
  test('renders nothing visible when not visible', () => {
    renderSheet({ visible: false });

    expect(screen.queryByTestId('option-sheet')).toBeNull();
    expect(screen.queryByText('Pick one')).toBeNull();
  });

  test('renders the title and options with the current one selected', () => {
    renderSheet();

    expect(screen.getByRole('header', { name: 'Pick one' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Alpha', selected: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Beta', selected: false }),
    ).toBeTruthy();
  });

  test('calls onSelect then onClose when an option is pressed', () => {
    const order: string[] = [];
    const onSelect = jest.fn(() => order.push('select'));
    const onClose = jest.fn(() => order.push('close'));
    renderSheet({ onSelect, onClose });

    fireEvent.press(screen.getByTestId('option-b'));

    expect(onSelect).toHaveBeenCalledWith('b');
    expect(order).toEqual(['select', 'close']);
  });

  test('calls onClose when the backdrop is pressed', () => {
    const { onClose, onSelect } = renderSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('calls onClose on hardware back', () => {
    const { onClose } = renderSheet();

    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
