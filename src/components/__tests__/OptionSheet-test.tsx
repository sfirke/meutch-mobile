import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, ScrollView } from 'react-native';

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

  test('renders a long list inside a ScrollView', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      value: `v${i}`,
      label: `Option ${i}`,
    }));
    renderSheet({ options: many, value: 'v20' });

    expect(screen.UNSAFE_getByType(ScrollView)).toBeTruthy();
    many.forEach((o) => expect(screen.getByText(o.label)).toBeTruthy());
  });

  test('keeps selection and callbacks working with a long list', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      value: `v${i}`,
      label: `Option ${i}`,
    }));
    const { onSelect, onClose } = renderSheet({ options: many, value: 'v20' });

    expect(
      screen.getByRole('button', { name: 'Option 20', selected: true }),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId('option-v24'));

    expect(onSelect).toHaveBeenCalledWith('v24');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
