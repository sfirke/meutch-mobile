import { fireEvent, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { SelectionBar, type SelectionAction } from '../SelectionBar';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

function renderBar(actions: SelectionAction[], onClose = jest.fn()) {
  renderWithProviders(
    <SelectionBar actions={actions} count={3} onClose={onClose} />,
  );

  return onClose;
}

describe('<SelectionBar />', () => {
  test('shows the selected count', () => {
    renderBar([]);

    expect(screen.getByText('3 selected')).toBeTruthy();
  });

  test('close calls onClose', () => {
    const onClose = renderBar([]);

    fireEvent.press(screen.getByTestId('selection-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('each action calls its onPress', () => {
    const archive = jest.fn();
    const read = jest.fn();

    renderBar([
      { key: 'archive', label: 'Archive', icon: 'archive', onPress: archive },
      { key: 'read', label: 'Mark read', icon: 'read', onPress: read },
    ]);

    fireEvent.press(screen.getByTestId('selection-action-archive'));
    fireEvent.press(screen.getByTestId('selection-action-read'));

    expect(archive).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
  });

  test('a disabled action is not pressable and exposes disabled state', () => {
    const onPress = jest.fn();

    renderBar([
      {
        key: 'archive',
        label: 'Archive',
        icon: 'archive',
        onPress,
        disabled: true,
      },
    ]);

    const action = screen.getByTestId('selection-action-archive');
    fireEvent.press(action);

    expect(onPress).not.toHaveBeenCalled();
    expect(action.props.accessibilityState).toEqual({ disabled: true });
  });
});
