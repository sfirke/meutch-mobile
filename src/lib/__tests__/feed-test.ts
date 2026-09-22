import type { ApiFetch } from '../api';
import { isApiError } from '../api';
import { fetchFeed } from '../feed';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

function createGiveawayEvent(overrides?: Record<string, unknown>) {
  return {
    event_type: 'giveaway',
    created_at: '2026-05-26T18:30:00+00:00',
    title: 'Folding step stool',
    description: 'Barely used.',
    action: 'posted a giveaway',
    actor_name: 'Ada Example',
    actor_avatar_url: null,
    actor_id: 'a1111111-1111-4111-8111-111111111111',
    actor_profile_viewable: true,
    image_url: 'https://cdn.example.test/img/stool.jpg',
    distance: '2-5 mi',
    item_id: 'b2222222-2222-4222-8222-222222222222',
    claim_status: 'unclaimed',
    ...overrides,
  };
}

const pagination = {
  page: 1,
  per_page: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_prev: false,
};

function getRequestPath(fetchImpl: jest.MockedFunction<ApiFetch>): string {
  return fetchImpl.mock.calls[0][0];
}

describe('fetchFeed', () => {
  test('parses a feed page and requests the expected path', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ events: [createGiveawayEvent()], pagination }),
    );

    const page = await fetchFeed(fetchImpl, { page: 1 });

    expect(getRequestPath(fetchImpl)).toBe('/feed?page=1');
    expect(page.pagination).toEqual(pagination);
    expect(page.events).toEqual([
      {
        event_type: 'giveaway',
        created_at: '2026-05-26T18:30:00+00:00',
        title: 'Folding step stool',
        description: 'Barely used.',
        action: 'posted a giveaway',
        actor_name: 'Ada Example',
        actor_avatar_url: null,
        actor_id: 'a1111111-1111-4111-8111-111111111111',
        actor_profile_viewable: true,
        image_url: 'https://cdn.example.test/img/stool.jpg',
        distance: '2-5 mi',
        item_id: 'b2222222-2222-4222-8222-222222222222',
        request_id: null,
        loan_request_id: null,
        circle_id: null,
        user_id: null,
        status: null,
        claim_status: 'unclaimed',
        extra_circle_count: null,
      },
    ]);
  });

  test('encodes per_page and the plural types filter as repeated keys', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ events: [], pagination }),
    );

    await fetchFeed(fetchImpl, {
      page: 2,
      perPage: 10,
      types: ['requests', 'giveaways', 'loans', 'circle_joins'],
    });

    expect(getRequestPath(fetchImpl)).toBe(
      '/feed?page=2&per_page=10&types=requests&types=giveaways&types=loans&types=circle_joins',
    );
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ events: [], pagination }),
    );

    await fetchFeed(fetchImpl, { page: 1, signal: controller.signal });

    expect(fetchImpl).toHaveBeenCalledWith('/feed?page=1', {
      signal: controller.signal,
    });
  });

  test('normalizes the relative placeholder image url to null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        events: [
          createGiveawayEvent({
            image_url: '/static/img/default_item_photo.png',
            actor_avatar_url: '/static/img/generic_user_avatar.png',
          }),
        ],
        pagination,
      }),
    );

    const page = await fetchFeed(fetchImpl, { page: 1 });

    expect(page.events[0].image_url).toBeNull();
    expect(page.events[0].actor_avatar_url).toBeNull();
  });

  test('treats omitted nullable fields as null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        events: [
          {
            event_type: 'lent',
            created_at: '2026-05-26T18:30:00+00:00',
            title: 'Cordless drill',
            description: null,
            action: 'lent out',
            actor_name: 'Bo Example',
            actor_avatar_url: null,
            actor_id: 'c3333333-3333-4333-8333-333333333333',
            actor_profile_viewable: false,
            image_url: null,
            loan_request_id: 'd4444444-4444-4444-8444-444444444444',
            item_id: 'e5555555-5555-4555-8555-555555555555',
          },
        ],
        pagination,
      }),
    );

    const page = await fetchFeed(fetchImpl, { page: 1 });

    expect(page.events[0].distance).toBeNull();
    expect(page.events[0].status).toBeNull();
    expect(page.events[0].claim_status).toBeNull();
    expect(page.events[0].extra_circle_count).toBeNull();
  });

  test('drops an event whose type this client does not know', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        events: [
          createGiveawayEvent({ event_type: 'wishlist_added' }),
          createGiveawayEvent(),
        ],
        pagination,
      }),
    );

    const page = await fetchFeed(fetchImpl, { page: 1 });

    expect(page.events).toHaveLength(1);
    expect(page.events[0].event_type).toBe('giveaway');
  });

  test('rejects a structurally malformed event', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        events: [createGiveawayEvent({ title: 42 })],
        pagination,
      }),
    );

    await expect(fetchFeed(fetchImpl, { page: 1 })).rejects.toThrow(
      'Invalid feed event payload.',
    );
  });

  test('rejects a payload without pagination', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ events: [] }));

    await expect(fetchFeed(fetchImpl, { page: 1 })).rejects.toThrow(
      'Invalid pagination payload.',
    );
  });

  test('propagates a 422 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters.',
            details: { per_page: ['Must be between 1 and 50.'] },
          },
        },
        422,
      ),
    );

    const error = await fetchFeed(fetchImpl, { page: 1, perPage: 500 }).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('VALIDATION_ERROR');
    expect(isApiError(error) && error.status).toBe(422);
  });
});
