import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import type { ApiFetch } from '../../lib/api';
import type { FeedPage } from '../../lib/feed';
import { feedKeys } from '../../lib/queryKeys';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultProfileFixture,
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { FeedScreen } from '../FeedScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const push = jest.fn();

function pagination(overrides?: Partial<Record<string, unknown>>) {
  return {
    page: 1,
    per_page: 20,
    total: 1,
    pages: 1,
    has_next: false,
    has_prev: false,
    ...overrides,
  };
}

function giveawayEvent(overrides?: Record<string, unknown>) {
  return {
    event_type: 'giveaway',
    created_at: '2026-05-01T12:00:00+00:00',
    title: 'Folding step stool',
    action: 'posted a giveaway',
    actor_name: 'Ada Example',
    actor_profile_viewable: true,
    item_id: 'aaaaaaaa-1111-4111-8111-111111111111',
    ...overrides,
  };
}

function circleJoinEvent(overrides?: Record<string, unknown>) {
  return {
    event_type: 'circle_join',
    created_at: '2026-05-01T14:00:00+00:00',
    title: 'Oak Street',
    action: 'joined',
    actor_name: 'Mo Example',
    actor_profile_viewable: true,
    item_id: null,
    circle_id: 'cccccccc-1111-4111-8111-111111111111',
    ...overrides,
  };
}

function requestEvent(overrides?: Record<string, unknown>) {
  return {
    event_type: 'request',
    created_at: '2026-05-01T13:00:00+00:00',
    title: 'Cordless drill',
    action: 'requested an item',
    actor_name: 'Rae Example',
    actor_profile_viewable: true,
    item_id: null,
    request_id: 'rrrrrrrr-1111-4111-8111-111111111111',
    ...overrides,
  };
}

function headlineFor(event: {
  actor_name: string;
  action: string;
  title: string;
}): string {
  return `${event.actor_name} ${event.action} · ${event.title}`;
}

// Answers the filter sheet's profile read and passes every other path to
// `handler`.
function routeFeed(
  handler: (path: string) => Response | Promise<Response>,
  profile = defaultProfileFixture,
) {
  return jest.fn(async (path: string) =>
    path === '/me/profile' ? jsonResponse({ user: profile }) : handler(path),
  ) as jest.MockedFunction<ApiFetch>;
}

// Every request except the profile read.
function feedPaths(authenticatedApiFetch: jest.MockedFunction<ApiFetch>) {
  return authenticatedApiFetch.mock.calls
    .map(([path]) => path)
    .filter((path) => path !== '/me/profile');
}

function openFilters() {
  fireEvent.press(screen.getByTestId('filter-toolbar-filters'));
}

function applyFilters() {
  fireEvent.press(screen.getByTestId('filter-sheet-apply'));
}

function renderFeedScreen(
  authenticatedApiFetch: jest.MockedFunction<ApiFetch>,
) {
  mockSession({ authenticatedApiFetch });

  return renderWithProviders(<FeedScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
});

describe('FeedScreen', () => {
  test('shows a spinner before the response resolves', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const authenticatedApiFetch = routeFeed(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByLabelText('Loading')).toBeTruthy();

    resolveFetch(jsonResponse({ events: [], pagination: pagination() }));
    await waitFor(() => expect(screen.queryByLabelText('Loading')).toBeNull(), {
      timeout: 3000,
    });
  });

  test('renders cards for a populated feed and requests page 1', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = routeFeed(() =>
      jsonResponse({ events: [event], pagination: pagination() }),
    );

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText(headlineFor(event))).toBeTruthy();
    expect(feedPaths(authenticatedApiFetch)).toEqual(['/feed?page=1']);
  });

  test('shows the empty state when the feed has no events', async () => {
    const authenticatedApiFetch = routeFeed(() =>
      jsonResponse({ events: [], pagination: pagination() }),
    );

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
  });

  test('shows offline copy and retries on request', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = routeFeed(
      jest
        .fn()
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(
          jsonResponse({ events: [event], pagination: pagination() }),
        ),
    );

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText(headlineFor(event))).toBeTruthy();
    expect(feedPaths(authenticatedApiFetch)).toHaveLength(2);
  });

  test('shows rate-limit copy on a 429 and retries on request', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = routeFeed(
      jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: "You're doing that a bit too fast.",
              },
            },
            429,
          ),
        )
        .mockResolvedValueOnce(
          jsonResponse({ events: [event], pagination: pagination() }),
        ),
    );

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText('Slow down')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText(headlineFor(event))).toBeTruthy();
    expect(feedPaths(authenticatedApiFetch)).toHaveLength(2);
  });

  test('pages forward, appends results, and dedupes an event repeated across pages', async () => {
    const eventA = giveawayEvent({
      title: 'Folding step stool',
      item_id: 'aaaaaaaa-1111-4111-8111-111111111111',
    });
    const eventB = giveawayEvent({
      title: 'Garden hose',
      actor_name: 'Grace Example',
      item_id: 'bbbbbbbb-2222-4222-8222-222222222222',
      created_at: '2026-05-01T12:05:00+00:00',
    });
    const eventC = giveawayEvent({
      title: 'Step ladder',
      actor_name: 'Lin Example',
      item_id: 'cccccccc-3333-4333-8333-333333333333',
      created_at: '2026-05-01T12:10:00+00:00',
    });

    const authenticatedApiFetch = routeFeed((path) => {
      if (path === '/feed?page=1') {
        return jsonResponse({
          events: [eventA, eventB],
          pagination: pagination({ page: 1, has_next: true }),
        });
      }

      if (path === '/feed?page=2') {
        // eventB reappears on page 2 because live activity shifted the offset.
        return jsonResponse({
          events: [eventB, eventC],
          pagination: pagination({ page: 2, has_next: false }),
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText(headlineFor(eventA))).toBeTruthy();

    const list = screen.getByTestId('feed-list');
    fireEvent(list, 'endReached');

    expect(await screen.findByText(headlineFor(eventC))).toBeTruthy();
    expect(screen.getAllByText(headlineFor(eventB))).toHaveLength(1);
    expect(feedPaths(authenticatedApiFetch)).toHaveLength(2);

    fireEvent(list, 'endReached');
    await waitFor(
      () => expect(feedPaths(authenticatedApiFetch)).toHaveLength(2),
      { timeout: 3000 },
    );
  });

  test('keeps the list visible and shows a retry footer when the next page fails', async () => {
    const eventA = giveawayEvent();

    const authenticatedApiFetch = routeFeed(
      jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            events: [eventA],
            pagination: pagination({ page: 1, has_next: true }),
          }),
        )
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(
          jsonResponse({
            events: [],
            pagination: pagination({ page: 2, has_next: false }),
          }),
        ),
    );

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText(headlineFor(eventA))).toBeTruthy();

    const list = screen.getByTestId('feed-list');
    fireEvent(list, 'endReached');

    expect(await screen.findByText("Couldn't load more")).toBeTruthy();
    expect(screen.getByText(headlineFor(eventA))).toBeTruthy();

    fireEvent.press(screen.getByText('Try again'));

    await waitFor(
      () => expect(screen.queryByText("Couldn't load more")).toBeNull(),
      { timeout: 3000 },
    );
    expect(feedPaths(authenticatedApiFetch)).toHaveLength(3);
  });

  test('pull-to-refresh re-requests only the first page', async () => {
    const eventA = giveawayEvent();
    const eventC = giveawayEvent({
      title: 'Step ladder',
      item_id: 'cccccccc-3333-4333-8333-333333333333',
      created_at: '2026-05-01T12:10:00+00:00',
    });

    const authenticatedApiFetch = routeFeed((path) => {
      if (path === '/feed?page=1') {
        return jsonResponse({
          events: [eventA],
          pagination: pagination({ page: 1, has_next: true }),
        });
      }

      if (path === '/feed?page=2') {
        return jsonResponse({
          events: [eventC],
          pagination: pagination({ page: 2, has_next: false }),
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText(headlineFor(eventA))).toBeTruthy();

    const list = screen.getByTestId('feed-list');
    fireEvent(list, 'endReached');
    expect(await screen.findByText(headlineFor(eventC))).toBeTruthy();
    expect(feedPaths(authenticatedApiFetch)).toHaveLength(2);

    fireEvent(list, 'refresh');

    await waitFor(
      () => expect(feedPaths(authenticatedApiFetch)).toHaveLength(3),
      { timeout: 3000 },
    );
    expect(feedPaths(authenticatedApiFetch)[2]).toBe('/feed?page=1');
  });

  test('tapping an item-backed event pushes to the item screen', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = routeFeed(() =>
      jsonResponse({ events: [event], pagination: pagination() }),
    );

    renderFeedScreen(authenticatedApiFetch);

    const card = await screen.findByRole('button', {
      name: headlineFor(event),
    });

    fireEvent.press(card);

    expect(push).toHaveBeenCalledWith(`/item/${event.item_id}`);
  });

  test('tapping a circle_join event pushes to the circle screen', async () => {
    const event = circleJoinEvent();
    const authenticatedApiFetch = routeFeed(() =>
      jsonResponse({ events: [event], pagination: pagination() }),
    );

    renderFeedScreen(authenticatedApiFetch);

    const card = await screen.findByRole('button', {
      name: headlineFor(event),
    });

    fireEvent.press(card);

    expect(push).toHaveBeenCalledWith(`/circle/${event.circle_id}`);
  });

  test('tapping a request event pushes to the request screen', async () => {
    const event = requestEvent();
    const authenticatedApiFetch = routeFeed(() =>
      jsonResponse({ events: [event], pagination: pagination() }),
    );

    renderFeedScreen(authenticatedApiFetch);

    const card = await screen.findByRole('button', {
      name: headlineFor(event),
    });

    fireEvent.press(card);

    expect(push).toHaveBeenCalledWith(`/request/${event.request_id}`);
  });

  describe('filters', () => {
    const allEvent = giveawayEvent();
    const circlesEvent = requestEvent();
    const withLocation = { ...defaultProfileFixture, has_location: true };

    function page(events: unknown[], overrides?: Record<string, unknown>) {
      return jsonResponse({ events, pagination: pagination(overrides) });
    }

    // The default feed shows `allEvent`; any filtered request shows `circlesEvent`.
    function routeByFilter(profile = defaultProfileFixture) {
      return routeFeed(
        (path) =>
          path === '/feed?page=1' ? page([allEvent]) : page([circlesEvent]),
        profile,
      );
    }

    async function waitForEnabled(testID: string) {
      await waitFor(() =>
        expect(
          screen.getByTestId(testID).props.accessibilityState.disabled,
        ).toBe(false),
      );
    }

    test('shows the toolbar and requests the unfiltered feed once on mount', async () => {
      const authenticatedApiFetch = routeByFilter();

      renderFeedScreen(authenticatedApiFetch);

      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();
      expect(screen.getByText('Filters')).toBeTruthy();
      expect(
        authenticatedApiFetch.mock.calls.map(([path]) => path).sort(),
      ).toEqual(['/feed?page=1', '/me/profile']);
    });

    test('applies a scope only when Apply is tapped', async () => {
      const authenticatedApiFetch = routeByFilter();

      renderFeedScreen(authenticatedApiFetch);
      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();

      openFilters();
      fireEvent.press(screen.getByRole('tab', { name: 'My circles' }));
      await act(async () => {});

      expect(feedPaths(authenticatedApiFetch)).toEqual(['/feed?page=1']);

      applyFilters();

      expect(await screen.findByText(headlineFor(circlesEvent))).toBeTruthy();
      expect(feedPaths(authenticatedApiFetch)).toEqual([
        '/feed?page=1',
        '/feed?page=1&scope=circles',
      ]);
      expect(screen.getByText('Filters (1)')).toBeTruthy();
    });

    test('applies a distance when the member has a location', async () => {
      const authenticatedApiFetch = routeByFilter(withLocation);

      renderFeedScreen(authenticatedApiFetch);
      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();

      openFilters();
      await waitForEnabled('select-none');
      fireEvent.press(screen.getByTestId('select-none'));
      applyFilters();

      expect(await screen.findByText(headlineFor(circlesEvent))).toBeTruthy();
      expect(feedPaths(authenticatedApiFetch).at(-1)).toBe(
        '/feed?page=1&distance=none',
      );

      openFilters();
      await waitForEnabled('select-5');
      fireEvent.press(screen.getByTestId('select-5'));
      applyFilters();

      await waitFor(() =>
        expect(feedPaths(authenticatedApiFetch).at(-1)).toBe(
          '/feed?page=1&distance=5',
        ),
      );
    });

    test('sends the remaining types after one is unticked', async () => {
      const authenticatedApiFetch = routeByFilter();

      renderFeedScreen(authenticatedApiFetch);
      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();

      openFilters();
      fireEvent.press(screen.getByTestId('select-requests'));
      applyFilters();

      expect(await screen.findByText(headlineFor(circlesEvent))).toBeTruthy();
      expect(feedPaths(authenticatedApiFetch).at(-1)).toBe(
        '/feed?page=1&types=giveaways&types=loans&types=circle_joins',
      );
    });

    test('sends both visibility switches when flipped', async () => {
      const authenticatedApiFetch = routeByFilter();

      renderFeedScreen(authenticatedApiFetch);
      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();

      openFilters();
      fireEvent(
        screen.getByLabelText('Show my own activity'),
        'valueChange',
        false,
      );
      fireEvent(
        screen.getByLabelText('Show given-away giveaways'),
        'valueChange',
        false,
      );
      applyFilters();

      expect(await screen.findByText(headlineFor(circlesEvent))).toBeTruthy();
      expect(feedPaths(authenticatedApiFetch).at(-1)).toBe(
        '/feed?page=1&show_own_activity=false&show_claimed_giveaways=false',
      );
      expect(screen.getByText('Filters (2)')).toBeTruthy();
    });

    test('shows the no-matches state for filters, and Clear filters restores the feed', async () => {
      const authenticatedApiFetch = routeFeed((path) =>
        path === '/feed?page=1' ? page([allEvent]) : page([]),
      );

      renderFeedScreen(authenticatedApiFetch);
      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();

      openFilters();
      fireEvent.press(screen.getByRole('tab', { name: 'My circles' }));
      applyFilters();

      expect(
        await screen.findByText('No activity matches these filters'),
      ).toBeTruthy();
      expect(screen.getByTestId('filter-toolbar-filters')).toBeTruthy();

      authenticatedApiFetch.mockClear();
      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));

      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();
      expect(screen.getByText('Filters')).toBeTruthy();
      expect(feedPaths(authenticatedApiFetch)).toEqual(['/feed?page=1']);
    });

    test('keeps the previous events on screen while a filtered feed loads', async () => {
      let resolveFiltered!: (response: Response) => void;
      const pendingFiltered = new Promise<Response>((resolve) => {
        resolveFiltered = resolve;
      });
      const authenticatedApiFetch = routeFeed((path) =>
        path === '/feed?page=1' ? page([allEvent]) : pendingFiltered,
      );

      renderFeedScreen(authenticatedApiFetch);
      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();

      openFilters();
      fireEvent.press(screen.getByRole('tab', { name: 'My circles' }));
      applyFilters();

      expect(await screen.findByLabelText('Updating')).toBeTruthy();
      expect(screen.getByText(headlineFor(allEvent))).toBeTruthy();

      await act(async () => {
        resolveFiltered(page([circlesEvent]));
      });

      expect(await screen.findByText(headlineFor(circlesEvent))).toBeTruthy();
      expect(screen.queryByText(headlineFor(allEvent))).toBeNull();
      expect(screen.queryByLabelText('Updating')).toBeNull();
    });

    test('trims the filtered cache entry before a pull-to-refresh', async () => {
      const laterEvent = giveawayEvent({
        title: 'Step ladder',
        item_id: 'cccccccc-3333-4333-8333-333333333333',
        created_at: '2026-05-01T12:10:00+00:00',
      });
      const authenticatedApiFetch = routeFeed((path) => {
        if (path === '/feed?page=1') {
          return page([allEvent]);
        }

        if (path === '/feed?page=2&scope=circles') {
          return page([laterEvent], { page: 2 });
        }

        return page([circlesEvent], { has_next: true });
      });

      const { queryClient } = renderFeedScreen(authenticatedApiFetch);
      expect(await screen.findByText(headlineFor(allEvent))).toBeTruthy();

      openFilters();
      fireEvent.press(screen.getByRole('tab', { name: 'My circles' }));
      applyFilters();
      expect(await screen.findByText(headlineFor(circlesEvent))).toBeTruthy();

      const list = screen.getByTestId('feed-list');
      fireEvent(list, 'endReached');
      expect(await screen.findByText(headlineFor(laterEvent))).toBeTruthy();

      const key = feedKeys.list({ scope: 'circles' });
      expect(
        queryClient.getQueryData<{ pages: FeedPage[] }>(key)?.pages,
      ).toHaveLength(2);

      authenticatedApiFetch.mockClear();
      fireEvent(list, 'refresh');

      await waitFor(() =>
        expect(
          queryClient.getQueryData<{ pages: FeedPage[] }>(key)?.pages,
        ).toHaveLength(1),
      );
      await waitFor(() =>
        expect(feedPaths(authenticatedApiFetch)).toEqual([
          '/feed?page=1&scope=circles',
        ]),
      );
    });
  });
});
