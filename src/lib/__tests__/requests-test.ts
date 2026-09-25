import type { ApiFetch } from '../api';
import {
  fetchRequestDetail,
  formatRequestDate,
  isRequestExpired,
  parseRequestDetailResponse,
  parseRequestSummary,
} from '../requests';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const REQUEST_ID = 'b2222222-2222-4222-8222-222222222222';
const MESSAGE_ID = 'c3333333-3333-4333-8333-333333333333';

const requester = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

function createRequest(overrides?: Record<string, unknown>) {
  return {
    id: REQUEST_ID,
    title: 'Extension ladder',
    description: null,
    seeking: 'either',
    visibility: 'circles',
    status: 'open',
    expires_at: '2026-06-15T00:00:00',
    fulfilled_at: null,
    created_at: '2026-05-26T18:30:00+00:00',
    updated_at: '2026-05-26T18:30:00+00:00',
    user: requester,
    distance: null,
    ...overrides,
  };
}

describe('parseRequestSummary', () => {
  test('parses a request payload', () => {
    expect(parseRequestSummary(createRequest())).toEqual({
      id: REQUEST_ID,
      title: 'Extension ladder',
      description: null,
      seeking: 'either',
      visibility: 'circles',
      status: 'open',
      expires_at: '2026-06-15T00:00:00',
      fulfilled_at: null,
      created_at: '2026-05-26T18:30:00+00:00',
      user: requester,
      distance: null,
    });
  });

  test('maps unknown enum values to null instead of failing', () => {
    const request = parseRequestSummary(
      createRequest({ seeking: 'swap', visibility: 'secret', status: 'x' }),
    );

    expect(request.seeking).toBeNull();
    expect(request.visibility).toBeNull();
    expect(request.status).toBeNull();
  });

  test('rejects a payload missing its title', () => {
    expect(() => parseRequestSummary(createRequest({ title: '' }))).toThrow(
      'Invalid request payload.',
    );
  });
});

describe('parseRequestDetailResponse', () => {
  test('parses the owner conversations', () => {
    const response = parseRequestDetailResponse({
      request: createRequest(),
      conversations: [
        {
          other_user: requester,
          latest_message: {
            id: MESSAGE_ID,
            body: 'I have one.',
            timestamp: '2026-05-27T10:00:00+00:00',
            is_read: false,
          },
        },
      ],
    });

    expect(response.conversations).toEqual([
      {
        other_user: requester,
        latest_message: {
          id: MESSAGE_ID,
          body: 'I have one.',
          timestamp: '2026-05-27T10:00:00+00:00',
          is_read: false,
        },
      },
    ]);
  });

  test('rejects a conversation without a latest message', () => {
    expect(() =>
      parseRequestDetailResponse({
        request: createRequest(),
        conversations: [{ other_user: requester }],
      }),
    ).toThrow('Invalid request detail payload.');
  });
});

describe('fetchRequestDetail', () => {
  test('requests the detail path and parses the response', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ request: createRequest(), conversations: [] }),
    );

    const response = await fetchRequestDetail(fetchImpl, REQUEST_ID);

    expect(fetchImpl.mock.calls[0][0]).toBe(`/requests/${REQUEST_ID}`);
    expect(response.request.title).toBe('Extension ladder');
    expect(response.conversations).toEqual([]);
  });
});

describe('isRequestExpired', () => {
  const request = parseRequestSummary(createRequest());

  test('stays open through the whole expiration day, in UTC', () => {
    expect(isRequestExpired(request, new Date('2026-06-15T23:59:00Z'))).toBe(
      false,
    );
  });

  test('expires the day after', () => {
    expect(isRequestExpired(request, new Date('2026-06-16T00:00:00Z'))).toBe(
      true,
    );
  });
});

describe('formatRequestDate', () => {
  test('formats the leading calendar date without shifting time zones', () => {
    expect(formatRequestDate('2026-06-15T00:00:00')).toBe('Jun 15, 2026');
    expect(formatRequestDate('2026-06-02T23:30:00-05:00')).toBe('Jun 2, 2026');
  });

  test('returns null for an unparseable value', () => {
    expect(formatRequestDate('soon')).toBeNull();
  });
});
