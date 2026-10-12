import type { InfiniteData } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { ApiFetch } from '../../lib/api';
import type { CirclePage } from '../../lib/circles';
import { circleKeys } from '../../lib/queryKeys';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultProfileFixture,
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
    distance: null,
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

function routeCircles(
  handler: (path: string) => Response | Promise<Response>,
  profile: typeof defaultProfileFixture = defaultProfileFixture,
) {
  apiFetch.mockImplementation(async (path) => {
    if (path.startsWith('/me/profile')) {
      return jsonResponse({ user: profile });
    }

    if (!path.startsWith('/circles')) {
      throw new Error(`Unexpected request: ${path}`);
    }

    return handler(path);
  });
}

function requestedPaths(): string[] {
  return apiFetch.mock.calls
    .map(([path]) => path)
    .filter((path) => path !== '/me/profile');
}

const locatedProfile = { ...defaultProfileFixture, has_location: true };

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

function radiusButton() {
  return screen.getByTestId('circles-radius-button');
}

async function chooseRadius(value: string) {
  fireEvent.press(radiusButton());

  const option = screen.getByTestId(`option-${value}`);

  // The profile answer arrives after the first circles page.
  await waitFor(() => {
    expect(option.props.accessibilityState?.disabled).toBeFalsy();
  });
  fireEvent.press(option);
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
    expect(requestedPaths()).toHaveLength(2);

    apiFetch.mockClear();

    await act(async () => {
      screen.getByTestId('circles-list').props.refreshControl.props.onRefresh();
    });

    expect(requestedPaths()).toEqual(['/circles?membership=mine&page=1']);
  });

  test('offers a distance picker only on Discover', async () => {
    routeCircles(() => jsonResponse(buildCirclesPage([maple])));

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    expect(screen.queryByTestId('circles-radius-button')).toBeNull();

    pressSegment('Discover');

    expect(
      await screen.findByRole('button', { name: 'Within: Any distance' }),
    ).toBeTruthy();
    expect(
      screen.queryByText('A distance hides circles that have no location.'),
    ).toBeNull();
  });

  test('disables distances when the member has no location', async () => {
    routeCircles(() => jsonResponse(buildCirclesPage([maple])));

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    pressSegment('Discover');
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/me/profile', expect.anything());
    });

    fireEvent.press(radiusButton());

    expect(
      screen.getByText('Set a location on the website to filter by distance.'),
    ).toBeTruthy();
    // Any distance leads the list, ahead of the numeric choices.
    expect(
      screen
        .getAllByRole('button', { name: /distance|miles/ })
        .map((row) => row.props.testID as string)
        .filter((testID) => testID.startsWith('option-')),
    ).toEqual([
      'option-any',
      'option-5',
      'option-10',
      'option-25',
      'option-50',
      'option-100',
    ]);

    const option = screen.getByTestId('option-25');

    expect(option.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(option);

    expect(screen.getByText('Within: Any distance')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/circles?membership=mine&page=1',
      '/circles?membership=discoverable&page=1',
    ]);
  });

  test('requests circles within the chosen distance', async () => {
    routeCircles(
      (path) =>
        jsonResponse(
          path.includes('radius=')
            ? buildCirclesPage([riverside])
            : buildCirclesPage([maple]),
        ),
      locatedProfile,
    );

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    pressSegment('Discover');
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    await chooseRadius('25');

    expect(await screen.findByText('Riverside Makers')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Within: 25 miles' }),
    ).toBeTruthy();
    expect(
      screen.getByText('A distance hides circles that have no location.'),
    ).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/circles?membership=mine&page=1',
      '/circles?membership=discoverable&page=1',
      '/circles?membership=discoverable&page=1&radius=25',
    ]);
    expectOnlyReads();
  });

  test('combines a distance with a search', async () => {
    routeCircles(() => jsonResponse(buildCirclesPage([maple])), locatedProfile);

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    pressSegment('Discover');
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    await chooseRadius('25');
    typeSearch('garden');

    await waitFor(() => {
      expect(requestedPaths()).toContain(
        '/circles?membership=discoverable&page=1&q=garden&radius=25',
      );
    });
  });

  test('explains an empty distance result, and Search any distance clears it', async () => {
    routeCircles(
      (path) =>
        jsonResponse(
          path.includes('radius=')
            ? buildCirclesPage([])
            : buildCirclesPage([maple]),
        ),
      locatedProfile,
    );

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    pressSegment('Discover');
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    await chooseRadius('25');

    expect(await screen.findByText('No circles within 25 miles')).toBeTruthy();
    expect(
      screen.getByText('Try a larger distance, or search any distance.'),
    ).toBeTruthy();
    apiFetch.mockClear();

    fireEvent.press(
      screen.getByRole('button', { name: 'Search any distance' }),
    );

    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    expect(screen.getByText('Within: Any distance')).toBeTruthy();
    expect(requestedPaths()).toEqual([
      '/circles?membership=discoverable&page=1',
    ]);
  });

  test('prefers the distance empty state over the search one', async () => {
    routeCircles(
      (path) =>
        jsonResponse(
          path.includes('radius=')
            ? buildCirclesPage([])
            : buildCirclesPage([maple]),
        ),
      locatedProfile,
    );

    renderCircles();
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();
    pressSegment('Discover');
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    await chooseRadius('25');
    typeSearch('kayak');

    await waitFor(() => {
      expect(requestedPaths()).toContain(
        '/circles?membership=discoverable&page=1&q=kayak&radius=25',
      );
    });
    expect(await screen.findByText('No circles within 25 miles')).toBeTruthy();
    expect(screen.queryByText('No circles match “kayak”')).toBeNull();
  });

  test('My circles ignores the chosen distance', async () => {
    routeCircles(
      (path) =>
        jsonResponse(
          path.includes('membership=mine')
            ? buildCirclesPage([oakStreet])
            : buildCirclesPage([riverside]),
        ),
      locatedProfile,
    );

    renderCircles();
    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
    pressSegment('Discover');
    expect(await screen.findByText('Riverside Makers')).toBeTruthy();

    await chooseRadius('25');
    await waitFor(() => {
      expect(requestedPaths()).toContain(
        '/circles?membership=discoverable&page=1&radius=25',
      );
    });
    apiFetch.mockClear();

    pressSegment('My circles');

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
    expect(screen.queryByTestId('circles-radius-button')).toBeNull();
    expect(
      requestedPaths().every(
        (path) => path === '/circles?membership=mine&page=1',
      ),
    ).toBe(true);
  });

  test('pull-to-refresh with a distance trims that list to its first page', async () => {
    routeCircles((path) => {
      if (!path.includes('radius=')) {
        return jsonResponse(buildCirclesPage([oakStreet]));
      }

      return jsonResponse(
        path.includes('page=2')
          ? buildCirclesPage([maple], { page: 2, total: 3, pages: 2 })
          : buildCirclesPage([oakStreet, riverside], {
              has_next: true,
              total: 3,
              pages: 2,
            }),
      );
    }, locatedProfile);

    const { queryClient } = renderCircles();
    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
    pressSegment('Discover');
    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();

    await chooseRadius('25');
    expect(await screen.findByText('Riverside Makers')).toBeTruthy();

    // Under jest the list has no layout pass, so its render window has not
    // grown to the new rows after the data swap; a second scroll extends it.
    await waitFor(() => {
      scrollToEnd();
      expect(requestedPaths()).toContain(
        '/circles?membership=discoverable&page=2&radius=25',
      );
    });
    expect(await screen.findByText('Maple Court Neighbours')).toBeTruthy();

    apiFetch.mockClear();

    await act(async () => {
      screen.getByTestId('circles-list').props.refreshControl.props.onRefresh();
    });

    expect(requestedPaths()).toEqual([
      '/circles?membership=discoverable&page=1&radius=25',
    ]);
    expect(
      queryClient.getQueryData<InfiniteData<CirclePage>>(
        circleKeys.list({ membership: 'discoverable', radius: 25 }),
      )?.pages,
    ).toHaveLength(1);
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
