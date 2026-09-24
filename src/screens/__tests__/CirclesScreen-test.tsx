import { act, fireEvent, screen } from '@testing-library/react-native';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { CirclesScreen } from '../CirclesScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const OAK_ID = 'a1111111-1111-4111-8111-111111111111';
const RIVER_ID = 'a2222222-2222-4222-8222-222222222222';
const MAPLE_ID = 'a3333333-3333-4333-8333-333333333333';

function buildCircle(id: string, name: string) {
  return {
    id,
    name,
    description: 'Shared tools for the block.',
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-15T09:00:00+00:00',
    image_url: null,
    requires_join_approval: false,
    member_count: 12,
    is_member: false,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance_miles: null,
  };
}

const oakStreet = buildCircle(OAK_ID, 'Oak Street Tool Library');
const riverside = buildCircle(RIVER_ID, 'Riverside Makers');
const maple = buildCircle(MAPLE_ID, 'Maple Court Neighbours');

function buildCirclesPage(
  circles: ReturnType<typeof buildCircle>[],
  overrides: Partial<{
    page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  }> = {},
) {
  return {
    circles,
    pagination: {
      page: 1,
      per_page: 12,
      total: circles.length,
      pages: 1,
      has_next: false,
      has_prev: false,
      ...overrides,
    },
  };
}

const apiFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();

function routeCircles(handler: (path: string) => Response | Promise<Response>) {
  apiFetch.mockImplementation(async (path) => {
    if (!path.startsWith('/circles')) {
      throw new Error(`Unexpected request: ${path}`);
    }

    return handler(path);
  });
}

function requestedPaths(): string[] {
  return apiFetch.mock.calls.map(([path]) => path);
}

function expectOnlyReads() {
  for (const [, init] of apiFetch.mock.calls) {
    expect(init?.method ?? 'GET').toBe('GET');
  }
}

function renderCircles() {
  return renderWithProviders(<CirclesScreen searchDebounceMs={0} />);
}

function pressSegment(label: string) {
  fireEvent.press(screen.getByRole('tab', { name: label }));
}

function typeSearch(value: string) {
  fireEvent.changeText(screen.getByLabelText('Search circles'), value);
}

function scrollToEnd() {
  const list = screen.getByTestId('circles-list');

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

describe('<CirclesScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession({ authenticatedApiFetch: apiFetch as unknown as ApiFetch });
  });

  test('shows a loading indicator while the first page is in flight', () => {
    routeCircles(() => new Promise<Response>(() => {}));

    renderCircles();

    expect(screen.getByLabelText('Loading circles')).toBeTruthy();
    expect(requestedPaths()).toEqual(['/circles?membership=mine&page=1']);
  });

  test("renders the member's own circles first", async () => {
    routeCircles(() => jsonResponse(buildCirclesPage([oakStreet, riverside])));

    renderCircles();

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
    expect(screen.getByText('Riverside Makers')).toBeTruthy();
    expect(requestedPaths()).toEqual(['/circles?membership=mine&page=1']);
    expect(screen.queryByLabelText('Search circles')).toBeNull();
    expectOnlyReads();
  });

  test('offers Find circles when the member belongs to no circles', async () => {
    routeCircles((path) =>
      jsonResponse(
        path.includes('membership=mine')
          ? buildCirclesPage([])
          : buildCirclesPage([riverside]),
      ),
    );

    renderCircles();

    expect(
      await screen.findByText("You're not in any circles yet"),
    ).toBeTruthy();
    expect(
      screen.getByText('Circles are the groups you share items with.'),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Find circles' }));

    expect(await screen.findByText('Riverside Makers')).toBeTruthy();
    expect(screen.getByLabelText('Search circles')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/circles?membership=mine&page=1',
      '/circles?membership=discoverable&page=1',
    ]);
    expectOnlyReads();
  });

  test('explains an empty Discover list without a search', async () => {
    routeCircles(() => jsonResponse(buildCirclesPage([])));

    renderCircles();

    expect(
      await screen.findByText("You're not in any circles yet"),
    ).toBeTruthy();

    pressSegment('Discover');

    expect(await screen.findByText('No circles to show')).toBeTruthy();
    expect(
      screen.getByText(
        'Ask a friend for an invitation, or create one on meutch.com.',
      ),
    ).toBeTruthy();
  });

  test('shows the no-matches state for a search, and Clear search restores the list', async () => {
    routeCircles((path) =>
      jsonResponse(
        path.includes('q=') ? buildCirclesPage([]) : buildCirclesPage([maple]),
      ),
    );

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    pressSegment('Discover');
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    typeSearch('kayak');

    expect(await screen.findByText('No circles match “kayak”')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));

    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
  });

  test('debounces typing into a single encoded request', async () => {
    routeCircles((path) =>
      jsonResponse(
        path.includes('q=')
          ? buildCirclesPage([riverside])
          : buildCirclesPage([maple]),
      ),
    );

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    pressSegment('Discover');
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    typeSearch('r');
    typeSearch('riv');
    typeSearch('river makers');

    expect(requestedPaths()).toEqual([
      '/circles?membership=mine&page=1',
      '/circles?membership=discoverable&page=1',
    ]);

    expect(await screen.findByText('Riverside Makers')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/circles?membership=mine&page=1',
      '/circles?membership=discoverable&page=1',
      '/circles?membership=discoverable&page=1&q=river%20makers',
    ]);
    expectOnlyReads();
  });

  test('switching to Discover asks for the discoverable list', async () => {
    routeCircles((path) =>
      jsonResponse(
        path.includes('membership=mine')
          ? buildCirclesPage([oakStreet])
          : buildCirclesPage([riverside]),
      ),
    );

    renderCircles();
    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();

    pressSegment('Discover');

    expect(await screen.findByText('Riverside Makers')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/circles?membership=mine&page=1',
      '/circles?membership=discoverable&page=1',
    ]);
  });

  test('shows offline copy when the request fails with no data, and retries', async () => {
    let attempt = 0;

    routeCircles(() => {
      attempt += 1;

      if (attempt === 1) {
        return Promise.reject(new TypeError('Network request failed'));
      }

      return jsonResponse(buildCirclesPage([oakStreet]));
    });

    renderCircles();

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
  });

  test('requests the next page and de-duplicates repeats', async () => {
    routeCircles((path) =>
      jsonResponse(
        path.includes('page=2')
          ? buildCirclesPage([riverside, maple], {
              page: 2,
              total: 3,
              pages: 2,
            })
          : buildCirclesPage([oakStreet, riverside], {
              has_next: true,
              total: 3,
              pages: 2,
            }),
      ),
    );

    renderCircles();
    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();

    scrollToEnd();

    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    expect(screen.getAllByText('Riverside Makers')).toHaveLength(1);
    expect(requestedPaths()).toEqual([
      '/circles?membership=mine&page=1',
      '/circles?membership=mine&page=2',
    ]);
  });

  test('pull-to-refresh re-requests only the first page', async () => {
    routeCircles((path) =>
      jsonResponse(
        path.includes('page=2')
          ? buildCirclesPage([maple], { page: 2, total: 3, pages: 2 })
          : buildCirclesPage([oakStreet, riverside], {
              has_next: true,
              total: 3,
              pages: 2,
            }),
      ),
    );

    renderCircles();
    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();

    scrollToEnd();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledTimes(2);

    apiFetch.mockClear();

    await act(async () => {
      screen.getByTestId('circles-list').props.refreshControl.props.onRefresh();
    });

    expect(requestedPaths()).toEqual(['/circles?membership=mine&page=1']);
  });

  test('tapping a circle opens its detail screen', async () => {
    routeCircles(() => jsonResponse(buildCirclesPage([oakStreet])));

    renderCircles();

    const card = await screen.findByRole('button', {
      name: 'Oak Street Tool Library',
    });

    fireEvent.press(card);

    expect(mockPush).toHaveBeenCalledWith(`/circle/${OAK_ID}`);
  });
});
