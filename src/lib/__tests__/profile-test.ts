import type { ApiFetch } from '../api';
import { isApiError } from '../api';
import {
  fetchProfile,
  fetchSettings,
  updateAboutMe,
  updateSettings,
  type UserSettings,
} from '../profile';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const USER_ID = 'a1111111-1111-4111-8111-111111111111';
const LINK_ID_FIRST = 'c3333333-3333-4333-8333-333333333333';
const LINK_ID_SECOND = 'c4444444-4444-4444-8444-444444444444';

const firstWebLink = {
  id: LINK_ID_FIRST,
  platform_type: 'website',
  platform_name: null,
  display_name: 'Ada Example',
  url: 'https://example.test/ada',
  display_order: 1,
};

const secondWebLink = {
  id: LINK_ID_SECOND,
  platform_type: 'other',
  platform_name: 'Community Wiki',
  display_name: 'Community Wiki',
  url: 'https://example.test/wiki',
  display_order: 2,
};

function createProfilePayload(overrides?: Record<string, unknown>) {
  return {
    id: USER_ID,
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: 'https://cdn.example.test/img/ada.jpg',
    email: 'ada.example@example.test',
    email_confirmed: true,
    about_me: 'Community builder.',
    created_at: '2026-01-15T12:00:00+00:00',
    has_location: true,
    geocoding_failed: false,
    web_links: [firstWebLink, secondWebLink],
    ...overrides,
  };
}

function createSettingsPayload(overrides?: Record<string, unknown>) {
  return {
    vacation_mode: false,
    digest_frequency: 'weekly',
    digest_radius_miles: 10,
    digest_include_giveaways: true,
    digest_include_requests: true,
    digest_include_circle_joins: true,
    digest_include_loans: true,
    digest_giveaways_include_public: false,
    digest_requests_include_public: false,
    ...overrides,
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

describe('fetchProfile', () => {
  test('parses a full profile payload', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ user: createProfilePayload() }),
    );

    const profile = await fetchProfile(fetchImpl);

    expect(getRequestPath(fetchImpl)).toBe('/me/profile');
    expect(profile).toEqual({
      id: USER_ID,
      first_name: 'Ada',
      last_name: 'Example',
      full_name: 'Ada Example',
      profile_image_url: 'https://cdn.example.test/img/ada.jpg',
      email: 'ada.example@example.test',
      email_confirmed: true,
      about_me: 'Community builder.',
      created_at: '2026-01-15T12:00:00+00:00',
      has_location: true,
      geocoding_failed: false,
      web_links: [firstWebLink, secondWebLink],
    });
  });

  test('treats a null about_me as null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        user: createProfilePayload({ about_me: null }),
      }),
    );

    const profile = await fetchProfile(fetchImpl);

    expect(profile.about_me).toBeNull();
  });

  test('treats an absent about_me as null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const payload = createProfilePayload();
    delete (payload as { about_me?: unknown }).about_me;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ user: payload }));

    const profile = await fetchProfile(fetchImpl);

    expect(profile.about_me).toBeNull();
  });

  test('normalizes a relative profile image url to null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        user: createProfilePayload({
          profile_image_url: '/static/img/placeholder.png',
        }),
      }),
    );

    const profile = await fetchProfile(fetchImpl);

    expect(profile.profile_image_url).toBeNull();
  });

  test('keeps web_links in the order the server sent them', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        user: createProfilePayload({
          web_links: [secondWebLink, firstWebLink],
        }),
      }),
    );

    const profile = await fetchProfile(fetchImpl);

    expect(profile.web_links.map((link) => link.id)).toEqual([
      LINK_ID_SECOND,
      LINK_ID_FIRST,
    ]);
  });

  test('rejects a malformed profile payload', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        user: createProfilePayload({ email_confirmed: 'yes' }),
      }),
    );

    await expect(fetchProfile(fetchImpl)).rejects.toThrow(
      'Invalid profile payload.',
    );
  });
});

describe('updateAboutMe', () => {
  test('sends a PATCH with only the about_me field and returns the parsed user', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        user: createProfilePayload({ about_me: 'Updated bio' }),
        image_upload_failed: false,
      }),
    );

    const profile = await updateAboutMe(fetchImpl, 'Updated bio');

    expect(getRequestPath(fetchImpl)).toBe('/me/profile');

    const init = getRequestInit(fetchImpl);
    expect(init?.method).toBe('PATCH');

    const headers = init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(['about_me']);
    expect(body.about_me).toBe('Updated bio');

    expect(profile.about_me).toBe('Updated bio');
  });
});

describe('fetchSettings', () => {
  test('parses a valid settings payload', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ settings: createSettingsPayload() }),
    );

    const settings = await fetchSettings(fetchImpl);

    expect(getRequestPath(fetchImpl)).toBe('/me/settings');
    expect(settings).toEqual(createSettingsPayload());
  });

  test('rejects an unknown digest_frequency', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        settings: createSettingsPayload({ digest_frequency: 'hourly' }),
      }),
    );

    await expect(fetchSettings(fetchImpl)).rejects.toThrow(
      'Invalid settings payload.',
    );
  });

  test('rejects a settings payload missing a field', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const payload = createSettingsPayload();
    delete (payload as { vacation_mode?: unknown }).vacation_mode;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ settings: payload }));

    await expect(fetchSettings(fetchImpl)).rejects.toThrow(
      'Invalid settings payload.',
    );
  });
});

describe('updateSettings', () => {
  const settingsToSend: UserSettings = createSettingsPayload({
    vacation_mode: true,
    digest_frequency: 'daily',
    digest_radius_miles: 25,
  }) as UserSettings;

  test('sends a PATCH with all nine fields and returns the parsed settings', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ settings: settingsToSend }),
    );

    const settings = await updateSettings(fetchImpl, settingsToSend);

    expect(getRequestPath(fetchImpl)).toBe('/me/settings');

    const init = getRequestInit(fetchImpl);
    expect(init?.method).toBe('PATCH');

    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      vacation_mode: true,
      digest_frequency: 'daily',
      digest_radius_miles: 25,
      digest_include_giveaways: true,
      digest_include_requests: true,
      digest_include_circle_joins: true,
      digest_include_loans: true,
      digest_giveaways_include_public: false,
      digest_requests_include_public: false,
    });
    expect(body.digest_radius_miles).toBe(25);
    expect(Number.isInteger(body.digest_radius_miles)).toBe(true);

    expect(settings).toEqual(settingsToSend);
  });

  test('rejects a 422 validation error and carries field details', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed.',
            details: {
              digest_radius_miles: ['Must be between 1 and 50.'],
            },
          },
        },
        422,
      ),
    );

    const error = await updateSettings(fetchImpl, settingsToSend).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('VALIDATION_ERROR');
    expect(isApiError(error) && error.details).toEqual({
      digest_radius_miles: ['Must be between 1 and 50.'],
    });
  });

  test('propagates a 403 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not allowed to update these settings.',
            details: {},
          },
        },
        403,
      ),
    );

    const error = await updateSettings(fetchImpl, settingsToSend).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('FORBIDDEN');
    expect(isApiError(error) && error.status).toBe(403);
  });
});
