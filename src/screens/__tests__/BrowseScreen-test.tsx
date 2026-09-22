import { act, fireEvent, screen } from '@testing-library/react-native';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { BrowseScreen, SEARCH_DEBOUNCE_MS } from '../BrowseScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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
const HAMMER_ID = 'b4444444-4444-4444-8444-444444444444';

function buildItem(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    available: true,
    is_giveaway: false,
    giveaway_visibility: null,
    claim_status: null,
    created_at: '2026-05-26T18:30:00+00:00',
    image_url: 'https://images.example.test/items/placeholder.jpg',
    owner: OWNER,
    category: { id: 'c5555555-5555-4555-8555-555555555555', name: 'Tools' },
    tags: [],
  };
}

const drill = buildItem(DRILL_ID, 'Cordless drill');
const ladder = buildItem(LADDER_ID, 'Step ladder');
const hammer = buildItem(HAMMER_ID, 'Claw hammer');

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

function buildCirclesPage(total: number) {
  return {
    circles: [],
    pagination: {
      page: 1,
      per_page: 1,
      total,
      pages: total,
      has_next: false,
      has_prev: false,
    },
  };
}

type ApiHandler = (path: string) => Response | Promise<Response>;

const apiFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();

function routeApi(routes: { items: ApiHandler; circles?: ApiHandler }) {
  apiFetch.mockImplementation(async (path) => {
    if (path.startsWith('/circles')) {
      if (!routes.circles) {
        throw new Error(`Unexpected circles request: ${path}`);
      }

      return routes.circles(path);
    }

    if (path.startsWith('/items')) {
      return routes.items(path);
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
  fireEvent.changeText(screen.getByLabelText('Search items'), value);
}

function scrollToEnd() {
  const list = screen.getByTestId('browse-list');

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

describe('<BrowseScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSession({ authenticatedApiFetch: apiFetch as unknown as ApiFetch });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('shows a loading indicator while the first page is in flight', () => {
    routeApi({ items: () => new Promise<Response>(() => {}) });

    renderWithProviders(<BrowseScreen />);

    expect(screen.getByLabelText('Loading items')).toBeTruthy();
    expect(requestedPaths()).toEqual(['/items?page=1']);
  });

  test('renders the returned items and requests the first page without q', async () => {
    routeApi({ items: () => jsonResponse(buildItemsPage([drill, ladder])) });

    renderWithProviders(<BrowseScreen />);

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.getByText('Step ladder')).toBeTruthy();
    expect(requestedPaths()).toEqual(['/items?page=1']);
  });

  test('keeps a lone final card at half width with a spacer', async () => {
    routeApi({
      items: () => jsonResponse(buildItemsPage([drill, ladder, hammer])),
    });

    renderWithProviders(<BrowseScreen />);

    expect(await screen.findByText('Claw hammer')).toBeTruthy();
    expect(screen.getAllByTestId('browse-grid-spacer')).toHaveLength(1);
  });

  test('debounces typing into a single encoded request', async () => {
    routeApi({
      items: (path) =>
        path.includes('q=')
          ? jsonResponse(buildItemsPage([ladder]))
          : jsonResponse(buildItemsPage([drill])),
    });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('s');
    typeSearch('st');
    typeSearch('step ladder');

    expect(requestedPaths()).toEqual(['/items?page=1']);

    await flushDebounce();

    expect(await screen.findByText('Step ladder')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/items?page=1',
      '/items?page=1&q=step%20ladder',
    ]);
  });

  test('keeps the previous results on screen while a new search loads', async () => {
    let resolveSearch!: (response: Response) => void;
    const pendingSearch = new Promise<Response>((resolve) => {
      resolveSearch = resolve;
    });

    routeApi({
      items: (path) =>
        path.includes('q=')
          ? pendingSearch
          : jsonResponse(buildItemsPage([drill])),
    });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('ladder');
    await flushDebounce();

    expect(screen.getByText('Cordless drill')).toBeTruthy();
    expect(screen.getByLabelText('Searching')).toBeTruthy();

    await act(async () => {
      resolveSearch(jsonResponse(buildItemsPage([ladder])));
    });

    expect(await screen.findByText('Step ladder')).toBeTruthy();
    expect(screen.queryByText('Cordless drill')).toBeNull();
  });

  test('shows the no-matches state for a search, and Clear search restores the list', async () => {
    routeApi({
      items: (path) =>
        path.includes('q=')
          ? jsonResponse(buildItemsPage([]))
          : jsonResponse(buildItemsPage([drill])),
      circles: () => jsonResponse(buildCirclesPage(2)),
    });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('kayak');
    await flushDebounce();

    expect(await screen.findByText('No items match “kayak”')).toBeTruthy();
    expect(
      requestedPaths().filter((path) => path.startsWith('/circles')),
    ).toHaveLength(1);

    fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    await flushDebounce();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
  });

  test('explains circle membership when the member belongs to no circles', async () => {
    routeApi({
      items: () => jsonResponse(buildItemsPage([])),
      circles: () => jsonResponse(buildCirclesPage(0)),
    });

    renderWithProviders(<BrowseScreen />);

    expect(await screen.findByText('Join a circle to see items')).toBeTruthy();
    expect(screen.queryByText('Nothing to borrow yet')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  test('shows the nothing-shared state when the member has circles', async () => {
    routeApi({
      items: () => jsonResponse(buildItemsPage([])),
      circles: () => jsonResponse(buildCirclesPage(3)),
    });

    renderWithProviders(<BrowseScreen />);

    expect(await screen.findByText('Nothing to borrow yet')).toBeTruthy();
    expect(screen.queryByText('Join a circle to see items')).toBeNull();
  });

  test('does not probe circles when the item list is not empty', async () => {
    routeApi({ items: () => jsonResponse(buildItemsPage([drill])) });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    expect(
      requestedPaths().filter((path) => path.startsWith('/circles')),
    ).toHaveLength(0);
  });

  test('falls back to the generic empty copy when the circles probe fails', async () => {
    routeApi({
      items: () => jsonResponse(buildItemsPage([])),
      circles: () =>
        jsonResponse(
          { error: { code: 'SERVER_ERROR', message: 'Boom.', details: {} } },
          500,
        ),
    });

    renderWithProviders(<BrowseScreen />);

    expect(await screen.findByText('Nothing to borrow yet')).toBeTruthy();
    expect(screen.queryByText('Join a circle to see items')).toBeNull();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  test('shows offline copy when the request fails with no data, and retries', async () => {
    let attempt = 0;

    routeApi({
      items: () => {
        attempt += 1;

        if (attempt === 1) {
          return Promise.reject(new TypeError('Network request failed'));
        }

        return jsonResponse(buildItemsPage([drill]));
      },
    });

    renderWithProviders(<BrowseScreen />);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
  });

  test('shows rate-limit copy for a 429 response', async () => {
    routeApi({
      items: () =>
        jsonResponse(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests.',
              details: {},
            },
          },
          429,
        ),
    });

    renderWithProviders(<BrowseScreen />);

    expect(await screen.findByText('Slow down')).toBeTruthy();
  });

  test('requests the next page with the same q and de-duplicates repeats', async () => {
    routeApi({
      items: (path) => {
        if (path.includes('page=2')) {
          return jsonResponse(
            buildItemsPage([ladder, hammer], { page: 2, total: 3, pages: 2 }),
          );
        }

        if (path.includes('q=')) {
          return jsonResponse(
            buildItemsPage([drill, ladder], {
              has_next: true,
              total: 3,
              pages: 2,
            }),
          );
        }

        return jsonResponse(buildItemsPage([drill]));
      },
    });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    typeSearch('tool');
    await flushDebounce();
    expect(await screen.findByText('Step ladder')).toBeTruthy();

    scrollToEnd();

    expect(await screen.findByText('Claw hammer')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/items?page=1',
      '/items?page=1&q=tool',
      '/items?page=2&q=tool',
    ]);
    expect(screen.getAllByText('Step ladder')).toHaveLength(1);
  });

  test('keeps the grid and offers a footer retry when the next page fails', async () => {
    let nextPageAttempt = 0;

    routeApi({
      items: (path) => {
        if (path.includes('page=2')) {
          nextPageAttempt += 1;

          if (nextPageAttempt === 1) {
            return Promise.reject(new TypeError('Network request failed'));
          }

          return jsonResponse(
            buildItemsPage([hammer], { page: 2, total: 3, pages: 2 }),
          );
        }

        return jsonResponse(
          buildItemsPage([drill, ladder], {
            has_next: true,
            total: 3,
            pages: 2,
          }),
        );
      },
    });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    scrollToEnd();

    expect(await screen.findByText("Couldn't load more")).toBeTruthy();
    expect(screen.getByText('Step ladder')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Claw hammer')).toBeTruthy();
    expect(screen.queryByText("Couldn't load more")).toBeNull();
  });

  test('trims the cache to the first page before a pull-to-refresh', async () => {
    routeApi({
      items: (path) =>
        path.includes('page=2')
          ? jsonResponse(
              buildItemsPage([hammer], { page: 2, total: 3, pages: 2 }),
            )
          : jsonResponse(
              buildItemsPage([drill, ladder], {
                has_next: true,
                total: 3,
                pages: 2,
              }),
            ),
    });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    scrollToEnd();
    expect(await screen.findByText('Claw hammer')).toBeTruthy();

    apiFetch.mockClear();

    await act(async () => {
      screen.getByTestId('browse-list').props.refreshControl.props.onRefresh();
    });

    expect(requestedPaths()).toEqual(['/items?page=1']);
  });

  test('pushes the item detail route when a card is tapped', async () => {
    routeApi({ items: () => jsonResponse(buildItemsPage([drill])) });

    renderWithProviders(<BrowseScreen />);
    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cordless drill' }));

    expect(mockPush).toHaveBeenCalledWith(`/item/${DRILL_ID}`);
  });
});
