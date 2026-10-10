import { fireEvent, render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { FilterToolbar, type FilterToolbarProps } from '../FilterToolbar';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

type TestSort = 'newest' | 'distance';

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest first' },
  { value: 'distance' as const, label: 'Distance' },
];

function renderToolbar(props: Partial<FilterToolbarProps<TestSort>> = {}) {
  const onOpenFilters = jest.fn();
  const onChange = jest.fn();

  render(
    <FilterToolbar<TestSort>
      activeFilterCount={0}
      onOpenFilters={onOpenFilters}
      {...props}
    />,
  );

  return { onOpenFilters, onChange };
}

describe('<FilterToolbar />', () => {
  test('shows a plain Filters label with no active filters', () => {
    renderToolbar();

    expect(screen.getByText('Filters')).toBeTruthy();
    expect(screen.getByLabelText('Filters')).toBeTruthy();
  });

  test('shows the active filter count', () => {
    renderToolbar({ activeFilterCount: 3 });

    expect(screen.getByText('Filters (3)')).toBeTruthy();
    expect(screen.getByLabelText('Filters, 3 active')).toBeTruthy();
  });

  test('calls onOpenFilters when the Filters button is pressed', () => {
    const { onOpenFilters } = renderToolbar();

    fireEvent.press(screen.getByTestId('filter-toolbar-filters'));

    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  test('hides the sort button when sort is omitted', () => {
    renderToolbar();

    expect(screen.queryByTestId('filter-toolbar-sort')).toBeNull();
  });

  test('opens the sort sheet and reports the chosen sort', () => {
    const onChange = jest.fn();
    renderToolbar({
      sort: { value: 'newest', options: SORT_OPTIONS, onChange },
    });

    expect(screen.getByText('Sort: Newest first')).toBeTruthy();
    expect(screen.getByLabelText('Sort: Newest first')).toBeTruthy();
    expect(screen.queryByTestId('option-sheet')).toBeNull();

    fireEvent.press(screen.getByTestId('filter-toolbar-sort'));
    expect(screen.getByTestId('option-sheet')).toBeTruthy();

    fireEvent.press(screen.getByTestId('option-distance'));

    expect(onChange).toHaveBeenCalledWith('distance');
    expect(screen.queryByTestId('option-sheet')).toBeNull();
  });
});
