import { act, fireEvent, screen } from '@testing-library/react-native';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { MyItemsScreen, SEARCH_DEBOUNCE_MS } from '../MyItemsScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: jest.fn(),
  Stack: {
    Screen: ({
      options,
    }: {
      options?: { headerRight?: () => React.ReactNode };
    }) => options?.headerRight?.() ?? null,
  },
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const OWNER = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

const DRILL_ID = 'b2222222-2222-4222-8222-222222222222';
const LADDER_ID = 'b3333333-3333-4333-8333-333333333333';
const LAMP_ID = 'b4444444-4444-4444-8444-444444444444';

function buildItem(id: string, name: string, isGiveaway = false) {
  return {
    id,
    name,
    description: null,
    available: true,
    is_giveaway: isGiveaway,
    giveaway_visibility: isGiveaway ? 'public' : null,
    claim_status: isGiveaway ? 'unclaimed' : null,
    created_at: '2026-05-26T18:30:00+00:00',
    image_url: 'https://images.example.test/items/placeholder.jpg',
    owner: OWNER,
    category: { id: 'c5555555-5555-4555-8555-555555555555', name: 'Tools' },
    tags: [],
  };
}

const drill = buildItem(DRILL_ID, 'Cordless drill');
const ladder = buildItem(LADDER_ID, 'Step ladder');
const lamp = buildItem(LAMP_ID, 'Desk lamp', true);

function buildItemsPage(
  items: ReturnType<typeof buildItem>[],
  overrides: Partial<{
    page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  }> = {},
) {
  return {
    items,
    pagination: {
      page: 1,
      per_page: 12,
      total: items.length,
      pages: 1,
      has_next: false,
      has_prev: false,
      ...overrides,
    },
  };
}

type ApiHandler = (path: string) => Response | Promise<Response>;

const apiFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();

function routeItems(handler: ApiHandler) {
  apiFetch.mockImplementation(async (path) => {
    if (path.startsWith('/me/items')) {
      return handler(path);
    }

    throw new Error(`Unexpected request: ${path}`);
  });
}

function requestedPaths(): string[] {
  return apiFetch.mock.calls.map(([path]) => path);
}

async function flushDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 50);
  });
}

function typeSearch(value: string) {
  fireEvent.changeText(screen.getByLabelText('Search my items'), value);
}

function scrollToEnd() {
  const list = screen.getByTestId('my-items-list');

  // VirtualizedList only measures content through onContentSizeChange, which
  // never fires without a layout pass under jest.
  fireEvent(list, 'contentSizeChange', 320, 1200);
  fireEvent.scroll(list, {
    nativeEvent: {
      contentOffset: { x: 0, y: 600 },
      contentSize: { height: 1200, width: 320 },
      layoutMeasurement: { height: 600, width: 320 },
    },
  });
}

describe('<MyItemsScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession({ authenticatedApiFetch: apiFetch as unknown as ApiFetch });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('shows a loading indicator, then the lending items', async () => {
    let resolveFirst!: (response: Response) => void;
    routeItems(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    renderWithProviders(<MyItemsScreen />);

    expect(screen.getByLabelText('Loading items')).toBeTruthy();
    expect(requestedPaths()).toEqual(['/me/items?kind=lending&page=1']);

    await act(async () => {
      resolveFirst(jsonResponse(buildItemsPage([drill, ladder, lamp])));
    });

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.getByText('Step ladder')).toBeTruthy();
    expect(screen.getAllByTestId('my-items-grid-spacer')).toHaveLength(1);
  });

  test('switching segments requests the new kind and keeps the search', async () => {
    routeItems((path) =>
      path.includes('kind=active_giveaways')
        ? jsonResponse(buildItemsPage([lamp]))
        : jsonResponse(buildItemsPage([drill])),
    );

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('lamp');
    await flushDebounce();

    fireEvent.press(screen.getByRole('tab', { name: 'Giving away' }));

    expect(await screen.findByText('Desk lamp')).toBeTruthy();
    expect(screen.getByLabelText('Search my items').props.value).toBe('lamp');
    expect(requestedPaths()).toEqual([
      '/me/items?kind=lending&page=1',
      '/me/items?kind=lending&page=1&q=lamp',
      '/me/items?kind=active_giveaways&page=1&q=lamp',
    ]);
  });

  test('says Loading, not Searching, on a segment switch with no search', async () => {
    let resolveGiveaways!: (response: Response) => void;
    routeItems((path) =>
      path.includes('kind=active_giveaways')
        ? new Promise<Response>((resolve) => {
            resolveGiveaways = resolve;
          })
        : jsonResponse(buildItemsPage([drill])),
    );

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Giving away' }));

    expect(await screen.findByText('Loading...')).toBeTruthy();
    expect(screen.queryByText('Searching...')).toBeNull();

    await act(async () => {
      resolveGiveaways(jsonResponse(buildItemsPage([lamp])));
    });

    expect(await screen.findByText('Desk lamp')).toBeTruthy();
  });

  test('says Searching while a search request is in flight', async () => {
    let resolveSearch!: (response: Response) => void;
    routeItems((path) =>
      path.includes('q=')
        ? new Promise<Response>((resolve) => {
            resolveSearch = resolve;
          })
        : jsonResponse(buildItemsPage([drill])),
    );

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('lamp');
    await flushDebounce();

    expect(await screen.findByText('Searching...')).toBeTruthy();
    expect(screen.queryByText('Loading...')).toBeNull();

    await act(async () => {
      resolveSearch(jsonResponse(buildItemsPage([lamp])));
    });

    expect(await screen.findByText('Desk lamp')).toBeTruthy();
  });

  test('sends q only after the debounce', async () => {
    routeItems((path) =>
      path.includes('q=')
        ? jsonResponse(buildItemsPage([ladder]))
        : jsonResponse(buildItemsPage([drill])),
    );

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('s');
    typeSearch('step ladder');

    expect(requestedPaths()).toEqual(['/me/items?kind=lending&page=1']);

    await flushDebounce();

    expect(await screen.findByText('Step ladder')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/me/items?kind=lending&page=1',
      '/me/items?kind=lending&page=1&q=step%20ladder',
    ]);
  });

  test('shows the empty state for each segment with a List an item action', async () => {
    routeItems(() => jsonResponse(buildItemsPage([])));

    renderWithProviders(<MyItemsScreen />);

    expect(await screen.findByText('Nothing listed to lend')).toBeTruthy();
    expect(
      screen.getByText('Items you list for lending show up here.'),
    ).toBeTruthy();
    // Index 0 is the header button; 1 is the empty-state action.
    fireEvent.press(screen.getAllByRole('button', { name: 'List an item' })[1]);
    expect(mockPush).toHaveBeenCalledWith('/item/new');
    mockPush.mockClear();

    fireEvent.press(screen.getByRole('tab', { name: 'Giving away' }));

    expect(await screen.findByText('No giveaways in progress')).toBeTruthy();
    expect(
      screen.getByText(
        "Items you're giving away show up here until they're claimed.",
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'List an item' })[1]);
    expect(mockPush).toHaveBeenCalledWith('/item/new');

    fireEvent.press(screen.getByRole('tab', { name: 'Given away' }));

    expect(await screen.findByText('Nothing given away recently')).toBeTruthy();
    expect(
      screen.getByText(
        'Giveaways you handed off in the last 90 days show up here.',
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: 'List an item' }),
    ).toHaveLength(1);
  });

  test('the header button opens the new item form', async () => {
    routeItems(() => jsonResponse(buildItemsPage([drill])));

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'List an item' }));

    expect(mockPush).toHaveBeenCalledWith('/item/new');
  });

  test('shows the no-matches state, and Clear search restores the list', async () => {
    routeItems((path) =>
      path.includes('q=')
        ? jsonResponse(buildItemsPage([]))
        : jsonResponse(buildItemsPage([drill])),
    );

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('kayak');
    await flushDebounce();

    expect(await screen.findByText('No items match “kayak”')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    await flushDebounce();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
  });

  test('shows an error state and retries', async () => {
    let attempt = 0;

    routeItems(() => {
      attempt += 1;

      if (attempt === 1) {
        return Promise.reject(new TypeError('Network request failed'));
      }

      return jsonResponse(buildItemsPage([drill]));
    });

    renderWithProviders(<MyItemsScreen />);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
  });

  test('loads the next page when the end is reached', async () => {
    routeItems((path) =>
      path.includes('page=2')
        ? jsonResponse(buildItemsPage([lamp], { page: 2, total: 3, pages: 2 }))
        : jsonResponse(
            buildItemsPage([drill, ladder], {
              has_next: true,
              total: 3,
              pages: 2,
            }),
          ),
    );

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    scrollToEnd();

    expect(await screen.findByText('Desk lamp')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/me/items?kind=lending&page=1',
      '/me/items?kind=lending&page=2',
    ]);
  });

  test('trims to the first page on pull-to-refresh', async () => {
    routeItems((path) =>
      path.includes('page=2')
        ? jsonResponse(buildItemsPage([lamp], { page: 2, total: 3, pages: 2 }))
        : jsonResponse(
            buildItemsPage([drill, ladder], {
              has_next: true,
              total: 3,
              pages: 2,
            }),
          ),
    );

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    scrollToEnd();
    expect(await screen.findByText('Desk lamp')).toBeTruthy();

    apiFetch.mockClear();

    await act(async () => {
      screen
        .getByTestId('my-items-list')
        .props.refreshControl.props.onRefresh();
    });

    expect(requestedPaths()).toEqual(['/me/items?kind=lending&page=1']);
  });

  test('pushes the item detail route when a card is tapped', async () => {
    routeItems(() => jsonResponse(buildItemsPage([drill])));

    renderWithProviders(<MyItemsScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cordless drill' }));

    expect(mockPush).toHaveBeenCalledWith(`/item/${DRILL_ID}`);
  });
});
