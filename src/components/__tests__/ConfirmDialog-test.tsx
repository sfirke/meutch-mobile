import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, StyleSheet } from 'react-native';

import { ConfirmDialog } from '../ConfirmDialog';

function renderDialog(
  props: Partial<Parameters<typeof ConfirmDialog>[0]> = {},
) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  render(
    <ConfirmDialog
      confirmLabel="Delete"
      message="This cannot be undone."
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="Delete item?"
      visible
      {...props}
    />,
  );

  return { onConfirm, onCancel };
}

function confirmBackground() {
  return StyleSheet.flatten(
    screen.getByTestId('confirm-dialog-confirm').props.style,
  ).backgroundColor;
}

describe('<ConfirmDialog />', () => {
  test('renders nothing when not visible', () => {
    renderDialog({ visible: false });

    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(screen.queryByText('Delete item?')).toBeNull();
  });

  test('renders title, message and default labels', () => {
    renderDialog();

    expect(screen.getByRole('header', { name: 'Delete item?' })).toBeTruthy();
    expect(screen.getByText('This cannot be undone.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  test('uses a custom cancel label', () => {
    renderDialog({ cancelLabel: 'Keep it' });

    expect(screen.getByRole('button', { name: 'Keep it' })).toBeTruthy();
  });

  test('calls onConfirm and onCancel from the buttons', () => {
    const { onConfirm, onCancel } = renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel on backdrop press and hardware back', () => {
    const { onCancel, onConfirm } = renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('pending disables buttons, shows the pending label and ignores dismissal', () => {
    const { onConfirm, onCancel } = renderDialog({
      pending: true,
      pendingLabel: 'Deleting...',
    });

    expect(screen.getByText('Deleting...')).toBeTruthy();
    expect(screen.queryByText('Delete')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Cancel', disabled: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Deleting...', disabled: true }),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Deleting...'));
    fireEvent.press(screen.getByText('Cancel'));
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('pending falls back to the confirm label', () => {
    renderDialog({ pending: true });

    expect(screen.getByText('Delete')).toBeTruthy();
  });

  test('renders the error text', () => {
    renderDialog({ error: 'Item has an active loan.' });

    expect(screen.getByTestId('confirm-dialog-error')).toHaveTextContent(
      'Item has an active loan.',
    );
  });

  test('omits the error when none is given', () => {
    renderDialog({ error: null });

    expect(screen.queryByTestId('confirm-dialog-error')).toBeNull();
  });

  test('destructive changes the confirm button color', () => {
    renderDialog();
    const normal = confirmBackground();

    screen.unmount();
    renderDialog({ destructive: true });

    expect(confirmBackground()).not.toBe(normal);
  });
});
