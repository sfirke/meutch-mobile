import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { FeedScreen } from '../FeedScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
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
    const authenticatedApiFetch = jest.fn(
      (_path: string) =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByLabelText('Loading')).toBeTruthy();

    resolveFetch(jsonResponse({ events: [], pagination: pagination() }));
    await waitFor(() => expect(screen.queryByLabelText('Loading')).toBeNull(), {
      timeout: 3000,
    });
  });

  test('renders cards for a populated feed and requests page 1', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      jsonResponse({ events: [event], pagination: pagination() }),
    ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText(headlineFor(event))).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe('/feed?page=1');
  });

  test('shows the empty state when the feed has no events', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      jsonResponse({ events: [], pagination: pagination() }),
    ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
  });

  test('shows offline copy and retries on request', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(
        jsonResponse({ events: [event], pagination: pagination() }),
      ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText(headlineFor(event))).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
  });

  test('shows rate-limit copy on a 429 and retries on request', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = jest
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
      ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText('Slow down')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText(headlineFor(event))).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
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

    const authenticatedApiFetch = jest.fn(async (path: string) => {
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
    }) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText(headlineFor(eventA))).toBeTruthy();

    const list = screen.getByTestId('feed-list');
    fireEvent(list, 'endReached');

    expect(await screen.findByText(headlineFor(eventC))).toBeTruthy();
    expect(screen.getAllByText(headlineFor(eventB))).toHaveLength(1);
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);

    fireEvent(list, 'endReached');
    await waitFor(
      () => expect(authenticatedApiFetch).toHaveBeenCalledTimes(2),
      { timeout: 3000 },
    );
  });

  test('keeps the list visible and shows a retry footer when the next page fails', async () => {
    const eventA = giveawayEvent();

    const authenticatedApiFetch = jest
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
      ) as jest.MockedFunction<ApiFetch>;

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
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(3);
  });

  test('pull-to-refresh re-requests only the first page', async () => {
    const eventA = giveawayEvent();
    const eventC = giveawayEvent({
      title: 'Step ladder',
      item_id: 'cccccccc-3333-4333-8333-333333333333',
      created_at: '2026-05-01T12:10:00+00:00',
    });

    const authenticatedApiFetch = jest.fn(async (path: string) => {
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
    }) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    expect(await screen.findByText(headlineFor(eventA))).toBeTruthy();

    const list = screen.getByTestId('feed-list');
    fireEvent(list, 'endReached');
    expect(await screen.findByText(headlineFor(eventC))).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);

    fireEvent(list, 'refresh');

    await waitFor(
      () => expect(authenticatedApiFetch).toHaveBeenCalledTimes(3),
      { timeout: 3000 },
    );
    expect(authenticatedApiFetch.mock.calls[2][0]).toBe('/feed?page=1');
  });

  test('tapping an item-backed event pushes to the item screen', async () => {
    const event = giveawayEvent();
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      jsonResponse({ events: [event], pagination: pagination() }),
    ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    const card = await screen.findByRole('button', {
      name: headlineFor(event),
    });

    fireEvent.press(card);

    expect(push).toHaveBeenCalledWith(`/item/${event.item_id}`);
  });

  test('tapping a circle_join event pushes to the circle screen', async () => {
    const event = circleJoinEvent();
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      jsonResponse({ events: [event], pagination: pagination() }),
    ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    const card = await screen.findByRole('button', {
      name: headlineFor(event),
    });

    fireEvent.press(card);

    expect(push).toHaveBeenCalledWith(`/circle/${event.circle_id}`);
  });

  test('tapping a request event pushes to the request screen', async () => {
    const event = requestEvent();
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      jsonResponse({ events: [event], pagination: pagination() }),
    ) as jest.MockedFunction<ApiFetch>;

    renderFeedScreen(authenticatedApiFetch);

    const card = await screen.findByRole('button', {
      name: headlineFor(event),
    });

    fireEvent.press(card);

    expect(push).toHaveBeenCalledWith(`/request/${event.request_id}`);
  });
});
