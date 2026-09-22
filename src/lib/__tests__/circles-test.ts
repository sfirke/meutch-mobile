import type { ApiFetch } from '../api';
import { isApiError } from '../api';
import {
  cancelJoinRequest,
  fetchCircleDetail,
  fetchCircles,
  fetchHasCircles,
  joinCircle,
} from '../circles';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

function createPagination(total: number) {
  return {
    page: 1,
    per_page: 1,
    total,
    pages: total,
    has_next: total > 1,
    has_prev: false,
  };
}

function getRequestPath(fetchImpl: jest.MockedFunction<ApiFetch>): string {
  return fetchImpl.mock.calls[0][0];
}

function getRequestInit(
  fetchImpl: jest.MockedFunction<ApiFetch>,
): RequestInit | undefined {
  return fetchImpl.mock.calls[0][1];
}

const CIRCLE_ID = 'c1111111-1111-4111-8111-111111111111';
const MEMBER_ID = 'a2222222-2222-4222-8222-222222222222';

const member = {
  id: MEMBER_ID,
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

const circlesPagination = {
  page: 1,
  per_page: 12,
  total: 1,
  pages: 1,
  has_next: false,
  has_prev: false,
};

function createCircleSummary(overrides?: Record<string, unknown>) {
  return {
    id: CIRCLE_ID,
    name: 'Oak Street Tools',
    description: 'Neighborhood tool share.',
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-10T12:00:00+00:00',
    image_url: 'https://cdn.example.test/img/circle.jpg',
    requires_join_approval: false,
    member_count: 5,
    is_member: false,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance_miles: 1.25,
    ...overrides,
  };
}

describe('fetchHasCircles', () => {
  test('returns true when the member has at least one circle', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [
          { id: 'a1111111-1111-4111-8111-111111111111', name: 'Maple Street' },
        ],
        pagination: createPagination(4),
      }),
    );

    await expect(fetchHasCircles(fetchImpl)).resolves.toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      '/circles?membership=mine&per_page=1',
    );
  });

  test('returns false when the member has no circles', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ circles: [], pagination: createPagination(0) }),
    );

    await expect(fetchHasCircles(fetchImpl)).resolves.toBe(false);
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ circles: [], pagination: createPagination(0) }),
    );

    await fetchHasCircles(fetchImpl, { signal: controller.signal });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/circles?membership=mine&per_page=1',
      { signal: controller.signal },
    );
  });

  test('rejects a payload without pagination', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ circles: [] }));

    await expect(fetchHasCircles(fetchImpl)).rejects.toThrow(
      'Invalid pagination payload.',
    );
  });

  test('propagates an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters.',
            details: {},
          },
        },
        422,
      ),
    );

    const error = await fetchHasCircles(fetchImpl).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('VALIDATION_ERROR');
    expect(isApiError(error) && error.status).toBe(422);
  });
});

describe('fetchCircles', () => {
  test('parses a circle page and requests the expected path', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [createCircleSummary()],
        pagination: circlesPagination,
      }),
    );

    const page = await fetchCircles(fetchImpl, {
      membership: 'discoverable',
      q: 'oak',
      page: 1,
    });

    expect(getRequestPath(fetchImpl)).toBe(
      '/circles?membership=discoverable&page=1&q=oak',
    );
    expect(page.pagination).toEqual(circlesPagination);
    expect(page.circles).toEqual([
      {
        id: CIRCLE_ID,
        name: 'Oak Street Tools',
        description: 'Neighborhood tool share.',
        circle_type: 'open',
        is_regional: false,
        regional_radius_miles: null,
        created_at: '2026-01-10T12:00:00+00:00',
        image_url: 'https://cdn.example.test/img/circle.jpg',
        requires_join_approval: false,
        member_count: 5,
        is_member: false,
        is_admin: false,
        has_pending_join_request: false,
        pending_join_request_count: 0,
        distance_miles: 1.25,
      },
    ]);
  });

  test('omits a blank search query', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ circles: [], pagination: circlesPagination }),
    );

    await fetchCircles(fetchImpl, { membership: 'mine', q: '   ', page: 1 });

    expect(getRequestPath(fetchImpl)).toBe('/circles?membership=mine&page=1');
  });

  test('sends per_page only when given', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ circles: [], pagination: circlesPagination }),
    );

    await fetchCircles(fetchImpl, {
      membership: 'discoverable',
      page: 2,
      perPage: 20,
    });

    expect(getRequestPath(fetchImpl)).toBe(
      '/circles?membership=discoverable&page=2&per_page=20',
    );
  });

  test('parses a null distance_miles', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [createCircleSummary({ distance_miles: null })],
        pagination: circlesPagination,
      }),
    );

    const page = await fetchCircles(fetchImpl, {
      membership: 'mine',
      page: 1,
    });

    expect(page.circles[0].distance_miles).toBeNull();
  });

  test('treats an absent distance_miles the same as null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const summary = createCircleSummary();

    delete (summary as Record<string, unknown>).distance_miles;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [summary],
        pagination: circlesPagination,
      }),
    );

    const page = await fetchCircles(fetchImpl, {
      membership: 'mine',
      page: 1,
    });

    expect(page.circles[0].distance_miles).toBeNull();
  });

  test('maps an unknown circle_type to null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [createCircleSummary({ circle_type: 'members_only' })],
        pagination: circlesPagination,
      }),
    );

    const page = await fetchCircles(fetchImpl, {
      membership: 'mine',
      page: 1,
    });

    expect(page.circles[0].circle_type).toBeNull();
  });

  test('normalizes a relative image url to null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [
          createCircleSummary({ image_url: '/static/img/circle-default.png' }),
        ],
        pagination: circlesPagination,
      }),
    );

    const page = await fetchCircles(fetchImpl, {
      membership: 'mine',
      page: 1,
    });

    expect(page.circles[0].image_url).toBeNull();
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ circles: [], pagination: circlesPagination }),
    );

    await fetchCircles(fetchImpl, {
      membership: 'mine',
      page: 1,
      signal: controller.signal,
    });

    expect(fetchImpl).toHaveBeenCalledWith('/circles?membership=mine&page=1', {
      signal: controller.signal,
    });
  });

  test('rejects a malformed circle', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [createCircleSummary({ is_regional: 'yes' })],
        pagination: circlesPagination,
      }),
    );

    await expect(
      fetchCircles(fetchImpl, { membership: 'mine', page: 1 }),
    ).rejects.toThrow('Invalid circle payload.');
  });

  test('propagates a 404 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found.',
            details: {},
          },
        },
        404,
      ),
    );

    const error = await fetchCircles(fetchImpl, {
      membership: 'mine',
      page: 1,
    }).catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('NOT_FOUND');
    expect(isApiError(error) && error.status).toBe(404);
  });
});

describe('fetchCircleDetail', () => {
  test('parses a detail payload with members', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circle: createCircleSummary({
          is_member: true,
          can_view_members: true,
          is_last_member: false,
          pending_join_request: null,
          members: [
            {
              user: member,
              joined_at: '2026-02-01T09:00:00+00:00',
              is_admin: true,
            },
          ],
          members_total: 1,
          members_page: 1,
          members_pages: 1,
        }),
      }),
    );

    const { circle } = await fetchCircleDetail(fetchImpl, CIRCLE_ID);

    expect(getRequestPath(fetchImpl)).toBe(`/circles/${CIRCLE_ID}`);
    expect(circle.can_view_members).toBe(true);
    expect(circle.members).toEqual([
      { user: member, joined_at: '2026-02-01T09:00:00+00:00', is_admin: true },
    ]);
    expect(circle.members_total).toBe(1);
    expect(circle.pending_join_request).toBeNull();
  });

  test('parses hidden members as an empty list', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circle: createCircleSummary({
          circle_type: 'closed',
          can_view_members: false,
          is_last_member: false,
          pending_join_request: null,
          members: [],
          members_total: 0,
          members_page: 1,
          members_pages: 0,
        }),
      }),
    );

    const { circle } = await fetchCircleDetail(fetchImpl, CIRCLE_ID);

    expect(circle.can_view_members).toBe(false);
    expect(circle.members).toEqual([]);
  });

  test('parses a present pending_join_request', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circle: createCircleSummary({
          circle_type: 'closed',
          has_pending_join_request: true,
          can_view_members: false,
          is_last_member: false,
          pending_join_request: {
            id: 'd3333333-3333-4333-8333-333333333333',
            message: 'Would love to join.',
            status: 'pending',
            created_at: '2026-02-02T09:00:00+00:00',
          },
          members: [],
          members_total: 0,
          members_page: 1,
          members_pages: 0,
        }),
      }),
    );

    const { circle } = await fetchCircleDetail(fetchImpl, CIRCLE_ID);

    expect(circle.pending_join_request).toEqual({
      id: 'd3333333-3333-4333-8333-333333333333',
      message: 'Would love to join.',
      status: 'pending',
      created_at: '2026-02-02T09:00:00+00:00',
    });
  });

  test('treats an absent pending_join_request as null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const circle = createCircleSummary({
      can_view_members: true,
      is_last_member: false,
      members: [],
      members_total: 0,
      members_page: 1,
      members_pages: 0,
    });

    fetchImpl.mockResolvedValueOnce(createMockResponse({ circle }));

    const { circle: parsed } = await fetchCircleDetail(fetchImpl, CIRCLE_ID);

    expect(parsed.pending_join_request).toBeNull();
  });

  test('rejects a malformed detail payload', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circle: createCircleSummary({
          can_view_members: true,
          is_last_member: false,
          members: [{ user: member, joined_at: '2026-02-01T09:00:00+00:00' }],
          members_total: 1,
          members_page: 1,
          members_pages: 1,
        }),
      }),
    );

    await expect(fetchCircleDetail(fetchImpl, CIRCLE_ID)).rejects.toThrow(
      'Invalid circle detail payload.',
    );
  });

  test('propagates a 404 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found.',
            details: {},
          },
        },
        404,
      ),
    );

    const error = await fetchCircleDetail(fetchImpl, CIRCLE_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('NOT_FOUND');
    expect(isApiError(error) && error.status).toBe(404);
  });
});

describe('joinCircle', () => {
  test('sends a POST with a JSON message when given', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        membership_status: 'pending',
        join_request: {
          id: 'd3333333-3333-4333-8333-333333333333',
          message: 'Would love to join.',
          status: 'pending',
          created_at: '2026-02-02T09:00:00+00:00',
        },
      }),
    );

    const result = await joinCircle(fetchImpl, CIRCLE_ID, {
      message: 'Would love to join.',
    });

    expect(getRequestPath(fetchImpl)).toBe(`/circles/${CIRCLE_ID}/join`);
    const init = getRequestInit(fetchImpl);

    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      message: 'Would love to join.',
    });
    expect(result).toEqual({
      membership_status: 'pending',
      join_request: {
        id: 'd3333333-3333-4333-8333-333333333333',
        message: 'Would love to join.',
        status: 'pending',
        created_at: '2026-02-02T09:00:00+00:00',
      },
    });
  });

  test('sends an empty body when no message is given', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ membership_status: 'member', join_request: null }),
    );

    const result = await joinCircle(fetchImpl, CIRCLE_ID);

    const init = getRequestInit(fetchImpl);

    expect(JSON.parse(init?.body as string)).toEqual({});
    expect(result).toEqual({ membership_status: 'member', join_request: null });
  });

  test('rejects an unrecognized membership_status', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ membership_status: 'joined', join_request: null }),
    );

    await expect(joinCircle(fetchImpl, CIRCLE_ID)).rejects.toThrow(
      'Invalid join circle payload.',
    );
  });

  test('propagates a 400 already-joined error as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'INVALID_ACTION',
            message: 'You are already a member of this circle.',
            details: {},
          },
        },
        400,
      ),
    );

    const error = await joinCircle(fetchImpl, CIRCLE_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('INVALID_ACTION');
    expect(isApiError(error) && error.status).toBe(400);
  });
});

describe('cancelJoinRequest', () => {
  test('sends a POST with no body and parses the response', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ canceled: true }));

    const result = await cancelJoinRequest(fetchImpl, CIRCLE_ID);

    expect(getRequestPath(fetchImpl)).toBe(
      `/circles/${CIRCLE_ID}/cancel-request`,
    );
    const init = getRequestInit(fetchImpl);

    expect(init).toEqual({ method: 'POST' });
    expect(result).toEqual({ canceled: true });
  });

  test('parses canceled: false when there was no pending request', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ canceled: false }));

    const result = await cancelJoinRequest(fetchImpl, CIRCLE_ID);

    expect(result).toEqual({ canceled: false });
  });

  test('rejects a malformed response', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({}));

    await expect(cancelJoinRequest(fetchImpl, CIRCLE_ID)).rejects.toThrow(
      'Invalid cancel join request payload.',
    );
  });

  test('propagates an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not allowed to do this.',
            details: {},
          },
        },
        403,
      ),
    );

    const error = await cancelJoinRequest(fetchImpl, CIRCLE_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('FORBIDDEN');
    expect(isApiError(error) && error.status).toBe(403);
  });
});
