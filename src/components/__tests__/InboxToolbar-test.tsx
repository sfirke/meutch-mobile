import { fireEvent, render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { InboxToolbar } from '../InboxToolbar';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

function renderToolbar(
  props: Partial<Parameters<typeof InboxToolbar>[0]> = {},
) {
  const onSortChange = jest.fn();
  const onMarkAllRead = jest.fn();

  render(
    <InboxToolbar
      markAllReadDisabled={false}
      onMarkAllRead={onMarkAllRead}
      onSortChange={onSortChange}
      sort="newest"
      {...props}
    />,
  );

  return { onSortChange, onMarkAllRead };
}

describe('<InboxToolbar />', () => {
  test('shows the current sort label', () => {
    renderToolbar({ sort: 'unread' });

    expect(screen.getByText('Sort: Unread first')).toBeTruthy();
    expect(screen.getByLabelText('Sort: Unread first')).toBeTruthy();
  });

  test('opens the sheet and reports the chosen sort', () => {
    const { onSortChange } = renderToolbar();

    expect(screen.queryByTestId('option-sheet')).toBeNull();
    fireEvent.press(screen.getByTestId('inbox-sort-button'));
    expect(screen.getByText('Sort by')).toBeTruthy();
    fireEvent.press(screen.getByText('Oldest'));

    expect(onSortChange).toHaveBeenCalledWith('oldest');
    expect(screen.queryByTestId('option-sheet')).toBeNull();
  });

  test('calls onMarkAllRead when pressed', () => {
    const { onMarkAllRead } = renderToolbar();

    fireEvent.press(screen.getByTestId('inbox-mark-all-read'));

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  test('does not call onMarkAllRead when disabled', () => {
    const { onMarkAllRead } = renderToolbar({ markAllReadDisabled: true });

    fireEvent.press(screen.getByTestId('inbox-mark-all-read'));

    expect(onMarkAllRead).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Mark all read', disabled: true }),
    ).toBeTruthy();
  });
});
