import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, Text } from 'react-native';

import { FilterSheet } from '../FilterSheet';

function renderSheet(props: Partial<Parameters<typeof FilterSheet>[0]> = {}) {
  const onClose = jest.fn();
  const onReset = jest.fn();
  const onApply = jest.fn();

  render(
    <FilterSheet
      onApply={onApply}
      onClose={onClose}
      onReset={onReset}
      title="Filters"
      visible
      {...props}
    >
      <Text>Filter body</Text>
    </FilterSheet>,
  );

  return { onApply, onClose, onReset };
}

describe('<FilterSheet />', () => {
  test('renders the title and children when visible', () => {
    renderSheet();

    expect(screen.getByTestId('filter-sheet')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Filters' })).toBeTruthy();
    expect(screen.getByText('Filter body')).toBeTruthy();
  });

  test('renders nothing visible when not visible', () => {
    renderSheet({ visible: false });

    expect(screen.queryByTestId('filter-sheet')).toBeNull();
    expect(screen.queryByText('Filter body')).toBeNull();
  });

  test('calls onClose when the backdrop is pressed', () => {
    const { onApply, onClose, onReset } = renderSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  test('calls onClose on hardware back', () => {
    const { onClose } = renderSheet();

    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Reset calls onReset without closing', () => {
    const { onClose, onReset } = renderSheet();

    fireEvent.press(screen.getByTestId('filter-sheet-reset'));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('Apply calls onApply', () => {
    const { onApply, onClose } = renderSheet();

    fireEvent.press(screen.getByTestId('filter-sheet-apply'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('a disabled Apply ignores presses and reports disabled', () => {
    const { onApply } = renderSheet({ applyDisabled: true });

    const apply = screen.getByTestId('filter-sheet-apply');
    fireEvent.press(apply);

    expect(onApply).not.toHaveBeenCalled();
    expect(apply.props.accessibilityState.disabled).toBe(true);
  });
});
