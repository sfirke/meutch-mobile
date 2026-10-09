import { fireEvent, render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { SelectList } from '../SelectList';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

function renderList(props: Partial<Parameters<typeof SelectList>[0]> = {}) {
  const onChange = jest.fn();

  render(
    <SelectList onChange={onChange} options={options} value={[]} {...props} />,
  );

  return { onChange };
}

describe('<SelectList />', () => {
  test('checked state reflects value', () => {
    renderList({ value: ['b'] });

    expect(
      screen.getByTestId('select-a').props.accessibilityState.checked,
    ).toBe(false);
    expect(
      screen.getByTestId('select-b').props.accessibilityState.checked,
    ).toBe(true);
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeTruthy();
  });

  test('multiple mode uses checkbox rows', () => {
    renderList({ multiple: true, value: ['a'] });

    expect(
      screen.getByRole('checkbox', { name: 'Alpha', checked: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'Beta', checked: false }),
    ).toBeTruthy();
  });

  test('multiple mode adds an unchecked value after the others', () => {
    const { onChange } = renderList({ multiple: true, value: ['c', 'a'] });

    fireEvent.press(screen.getByTestId('select-b'));

    expect(onChange).toHaveBeenCalledWith(['c', 'a', 'b']);
  });

  test('multiple mode removes a checked value and keeps the rest in order', () => {
    const { onChange } = renderList({
      multiple: true,
      value: ['c', 'a', 'b'],
    });

    fireEvent.press(screen.getByTestId('select-a'));

    expect(onChange).toHaveBeenCalledWith(['c', 'b']);
  });

  test('single mode replaces the selection', () => {
    const { onChange } = renderList({ value: ['a'] });

    fireEvent.press(screen.getByTestId('select-b'));

    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  test('single mode ignores a tap on the selected row', () => {
    const { onChange } = renderList({ value: ['a'] });

    fireEvent.press(screen.getByTestId('select-a'));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('a disabled row ignores presses and reports disabled', () => {
    const { onChange } = renderList({
      multiple: true,
      options: [...options, { value: 'd', label: 'Delta', disabled: true }],
    });

    const row = screen.getByTestId('select-d');
    fireEvent.press(row);

    expect(onChange).not.toHaveBeenCalled();
    expect(row.props.accessibilityState.disabled).toBe(true);
  });

  test('renders a hint under the label', () => {
    renderList({
      options: [{ value: 'a', label: 'Alpha', hint: 'Only nearby items' }],
    });

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Only nearby items')).toBeTruthy();
  });

  test('applies the container accessibility label', () => {
    renderList({ accessibilityLabel: 'Category' });

    expect(screen.getByLabelText('Category')).toBeTruthy();
  });
});
