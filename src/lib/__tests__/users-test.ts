import type { ApiFetch } from '../api';
import { isApiError } from '../api';
import { fetchUserProfile, parseUserProfileResponse } from '../users';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const USER_ID = 'a1111111-1111-4111-8111-111111111111';
const CIRCLE_ID = 'b2222222-2222-4222-8222-222222222222';
const WEB_LINK_ID = 'c3333333-3333-4333-8333-333333333333';

function createUser(overrides?: Record<string, unknown>) {
  return {
    id: USER_ID,
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: null,
    about_me: null,
    web_links: [],
    ...overrides,
  };
}

function createResponse(overrides?: Record<string, unknown>) {
  return {
    user: createUser(),
    shared_circles: [],
    access_reason: 'circle',
    ...overrides,
  };
}

describe('parseUserProfileResponse', () => {
  test('parses a valid payload', () => {
    const response = parseUserProfileResponse(createResponse());

    expect(response).toEqual({
      user: {
        id: USER_ID,
        first_name: 'Ada',
        last_name: 'Example',
        full_name: 'Ada Example',
        profile_image_url: null,
        about_me: null,
        web_links: [],
      },
      shared_circles: [],
      access_reason: 'circle',
    });
  });

  test('parses web links and shared circles', () => {
    const response = parseUserProfileResponse(
      createResponse({
        user: createUser({
          about_me: 'Say hi!',
          web_links: [
            {
              id: WEB_LINK_ID,
              platform_type: 'instagram',
              platform_name: null,
              display_name: 'Instagram',
              url: 'https://instagram.com/ada',
              display_order: 0,
            },
          ],
        }),
        shared_circles: [
          {
            id: CIRCLE_ID,
            name: 'Oak Street Tools',
            circle_type: 'open',
            image_url: null,
          },
        ],
        access_reason: 'self',
      }),
    );

    expect(response.user.about_me).toBe('Say hi!');
    expect(response.user.web_links).toEqual([
      {
        id: WEB_LINK_ID,
        platform_type: 'instagram',
        platform_name: null,
        display_name: 'Instagram',
        url: 'https://instagram.com/ada',
        display_order: 0,
      },
    ]);
    expect(response.shared_circles).toEqual([
      {
        id: CIRCLE_ID,
        name: 'Oak Street Tools',
        circle_type: 'open',
        image_url: null,
      },
    ]);
    expect(response.access_reason).toBe('self');
  });

  test('treats missing about_me, web_links, and shared_circles as empty defaults', () => {
    const payload = createResponse();
    delete (payload.user as Record<string, unknown>).about_me;
    delete (payload.user as Record<string, unknown>).web_links;
    delete (payload as Record<string, unknown>).shared_circles;

    const response = parseUserProfileResponse(payload);

    expect(response.user.about_me).toBeNull();
    expect(response.user.web_links).toEqual([]);
    expect(response.shared_circles).toEqual([]);
  });

  test('rejects an unknown access reason', () => {
    expect(() =>
      parseUserProfileResponse(createResponse({ access_reason: 'stranger' })),
    ).toThrow('Invalid user profile payload.');
  });

  test('rejects a payload missing the user', () => {
    expect(() =>
      parseUserProfileResponse({ shared_circles: [], access_reason: 'self' }),
    ).toThrow('Invalid user profile payload.');
  });
});

describe('fetchUserProfile', () => {
  test('requests the expected path and parses the response', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse(createResponse()));

    const response = await fetchUserProfile(fetchImpl, USER_ID);

    expect(fetchImpl.mock.calls[0][0]).toBe(`/users/${USER_ID}`);
    expect(response.user.id).toBe(USER_ID);
    expect(response.access_reason).toBe('circle');
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

    const error = await fetchUserProfile(fetchImpl, USER_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('NOT_FOUND');
    expect(isApiError(error) && error.status).toBe(404);
  });
});
