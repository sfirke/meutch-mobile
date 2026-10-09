import { fireEvent, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockApiFetch,
  type MockRoute,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import {
  BrowseFilterSheet,
  type BrowseFilters,
  DEFAULT_BROWSE_FILTERS,
} from '../BrowseFilterSheet';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const TOOLS_ID = 'c1111111-1111-4111-8111-111111111111';
const GARDEN_ID = 'c2222222-2222-4222-8222-222222222222';
const KITCHEN_ID = 'c3333333-3333-4333-8333-333333333333';
const OAK_ID = 'a1111111-1111-4111-8111-111111111111';
const MAPLE_ID = 'a2222222-2222-4222-8222-222222222222';

const CIRCLES_PATH = '/circles?membership=mine&page=1&per_page=50';

function createCircle(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-10T12:00:00+00:00',
    image_url: null,
    requires_join_approval: false,
    member_count: 3,
    is_member: true,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance_miles: null,
  };
}

function circlesPage(circles: ReturnType<typeof createCircle>[]) {
  return {
    circles,
    pagination: {
      page: 1,
      per_page: 50,
      total: circles.length,
      pages: circles.length > 0 ? 1 : 0,
      has_next: false,
      has_prev: false,
    },
  };
}

const defaultRoutes: Record<string, MockRoute> = {
  '/categories': {
    categories: [
      { id: TOOLS_ID, name: 'Tools' },
      { id: GARDEN_ID, name: 'Garden' },
      { id: KITCHEN_ID, name: 'Kitchen' },
    ],
  },
  [CIRCLES_PATH]: circlesPage([
    createCircle(OAK_ID, 'Oak Street'),
    createCircle(MAPLE_ID, 'Maple Lane'),
  ]),
};

function renderSheet({
  visible = true,
  filters = DEFAULT_BROWSE_FILTERS,
  routes = {},
}: {
  visible?: boolean;
  filters?: BrowseFilters;
  routes?: Record<string, MockRoute>;
} = {}) {
  const authenticatedApiFetch = mockApiFetch({ ...defaultRoutes, ...routes });
  const onApply = jest.fn();
  const onClose = jest.fn();

  mockSession({ authenticatedApiFetch });
  renderWithProviders(
    <BrowseFilterSheet
      filters={filters}
      onApply={onApply}
      onClose={onClose}
      visible={visible}
    />,
  );

  return { authenticatedApiFetch, onApply, onClose };
}

describe('<BrowseFilterSheet />', () => {
  test('requests nothing while hidden', () => {
    const { authenticatedApiFetch } = renderSheet({ visible: false });

    expect(screen.queryByTestId('filter-sheet')).toBeNull();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
  });

  test('loads categories and circles when visible', async () => {
    const { authenticatedApiFetch } = renderSheet();

    expect(screen.getByText('Filter items')).toBeTruthy();
    expect(screen.getByLabelText('Loading categories')).toBeTruthy();
    expect(screen.getByLabelText('Loading circles')).toBeTruthy();
    expect(await screen.findByTestId(`select-${TOOLS_ID}`)).toBeTruthy();
    expect(await screen.findByTestId(`select-${OAK_ID}`)).toBeTruthy();
    expect(screen.getByText('Kitchen')).toBeTruthy();
    expect(screen.getByText('Maple Lane')).toBeTruthy();
    expect(screen.getAllByText('Nothing ticked means all.')).toHaveLength(2);

    const paths = authenticatedApiFetch.mock.calls.map(([path]) => path);
    expect(paths).toContain('/categories');
    expect(paths).toContain(CIRCLES_PATH);
  });

  test('applies ticked categories and circles', async () => {
    const { onApply } = renderSheet();

    fireEvent.press(await screen.findByTestId(`select-${GARDEN_ID}`));
    fireEvent.press(await screen.findByTestId(`select-${MAPLE_ID}`));

    expect(onApply).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('filter-sheet-apply'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      itemType: 'both',
      categories: [GARDEN_ID],
      circles: [MAPLE_ID],
    });
  });

  test('applies the chosen item type', async () => {
    const { onApply } = renderSheet();

    await screen.findByTestId(`select-${TOOLS_ID}`);
    fireEvent.press(screen.getByText('Loans'));
    fireEvent.press(screen.getByTestId('filter-sheet-apply'));

    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_BROWSE_FILTERS,
      itemType: 'loans',
    });
  });

  test('reset returns the draft to the defaults', async () => {
    const { onApply } = renderSheet();

    fireEvent.press(await screen.findByTestId(`select-${TOOLS_ID}`));
    fireEvent.press(await screen.findByTestId(`select-${OAK_ID}`));
    fireEvent.press(screen.getByText('Giveaways'));
    fireEvent.press(screen.getByTestId('filter-sheet-reset'));

    expect(
      screen.getByTestId(`select-${TOOLS_ID}`).props.accessibilityState.checked,
    ).toBe(false);

    fireEvent.press(screen.getByTestId('filter-sheet-apply'));

    expect(onApply).toHaveBeenCalledWith(DEFAULT_BROWSE_FILTERS);
  });

  test('rows reflect the applied filters', async () => {
    renderSheet({
      filters: {
        itemType: 'both',
        categories: [KITCHEN_ID],
        circles: [OAK_ID],
      },
    });

    const kitchen = await screen.findByTestId(`select-${KITCHEN_ID}`);
    const oak = await screen.findByTestId(`select-${OAK_ID}`);

    expect(kitchen.props.accessibilityState.checked).toBe(true);
    expect(oak.props.accessibilityState.checked).toBe(true);
    expect(
      screen.getByTestId(`select-${TOOLS_ID}`).props.accessibilityState.checked,
    ).toBe(false);
  });

  test('shows an error for categories while circles still load', async () => {
    renderSheet({
      routes: {
        '/categories': jsonResponse(
          { error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } },
          500,
        ),
      },
    });

    expect(await screen.findByText("Couldn't load categories.")).toBeTruthy();
    expect(await screen.findByTestId(`select-${OAK_ID}`)).toBeTruthy();
  });

  test('shows a message when the member is in no circles', async () => {
    renderSheet({ routes: { [CIRCLES_PATH]: circlesPage([]) } });

    expect(
      await screen.findByText("You're not in any circles yet."),
    ).toBeTruthy();
    expect(await screen.findByTestId(`select-${TOOLS_ID}`)).toBeTruthy();
  });
});
