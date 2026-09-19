import {
  createSessionClient,
  SessionRequiredError,
  type TokenBundle,
} from '../session';
import type { ApiFetch } from '../api';
import type { SessionStorage } from '../sessionStorage';

function createTokenBundle(overrides?: Partial<TokenBundle>): TokenBundle {
  return {
    access_token: 'access-token-1',
    refresh_token: 'refresh-token-1',
    token_type: 'Bearer',
    access_token_expires_at: '2026-05-26T18:30:00+00:00',
    refresh_token_expires_at: '2026-06-25T18:30:00+00:00',
    user: {
      id: '02d79872-e6fb-4f88-bad6-b09fb2f74fd8',
      email: 'tester@example.com',
      email_confirmed: true,
      first_name: 'Tess',
      last_name: 'Ter',
      full_name: 'Tess Ter',
      profile_image_url: null,
    },
    ...overrides,
  };
}

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

function createMockStorage(initialValue: TokenBundle | null = null): {
  storage: SessionStorage;
  getValue: () => TokenBundle | null;
} {
  let storedSession = initialValue;

  return {
    storage: {
      load: jest.fn(async () => storedSession),
      save: jest.fn(async (session: TokenBundle) => {
        storedSession = session;
      }),
      clear: jest.fn(async () => {
        storedSession = null;
      }),
    },
    getValue: () => storedSession,
  };
}

describe('createSessionClient', () => {
  test('login stores the returned token bundle', async () => {
    const apiFetch = jest.fn() as jest.MockedFunction<ApiFetch>;
    const session = createTokenBundle();
    const { storage, getValue } = createMockStorage();

    apiFetch.mockResolvedValueOnce(createMockResponse(session));

    const client = createSessionClient({ apiFetchImpl: apiFetch, storage });
    const user = await client.login(' tester@example.com ', 'secret123');

    expect(user.email).toBe('tester@example.com');
    expect(getValue()).toEqual(session);
    expect(apiFetch).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'tester@example.com',
          password: 'secret123',
        }),
      }),
    );
  });

  test('restore refreshes an expired access token and replaces the stored refresh token', async () => {
    const originalSession = createTokenBundle();
    const refreshedSession = createTokenBundle({
      access_token: 'access-token-2',
      refresh_token: 'refresh-token-2',
    });
    const restoredUser = {
      ...refreshedSession.user,
      full_name: 'Tess Tested',
    };
    const apiFetch = jest.fn() as jest.MockedFunction<ApiFetch>;
    const { storage, getValue } = createMockStorage(originalSession);

    apiFetch
      .mockResolvedValueOnce(
        createMockResponse(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired.' } },
          401,
        ),
      )
      .mockResolvedValueOnce(createMockResponse(refreshedSession))
      .mockResolvedValueOnce(createMockResponse({ user: restoredUser }));

    const client = createSessionClient({ apiFetchImpl: apiFetch, storage });
    const user = await client.restoreSession();

    expect(user).toEqual(restoredUser);
    expect(getValue()).toEqual({ ...refreshedSession, user: restoredUser });
    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      '/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-1',
        }),
      }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer refresh-token-1',
        }),
      }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-2',
        }),
      }),
    );
  });

  test('authenticatedApiFetch refreshes once and retries with the rotated access token', async () => {
    const originalSession = createTokenBundle();
    const refreshedSession = createTokenBundle({
      access_token: 'access-token-2',
      refresh_token: 'refresh-token-2',
    });
    const feedResponse = createMockResponse({ items: [] });
    const apiFetch = jest.fn() as jest.MockedFunction<ApiFetch>;
    const { storage } = createMockStorage();

    apiFetch
      .mockResolvedValueOnce(createMockResponse(originalSession))
      .mockResolvedValueOnce(
        createMockResponse(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired.' } },
          401,
        ),
      )
      .mockResolvedValueOnce(createMockResponse(refreshedSession))
      .mockResolvedValueOnce(feedResponse);

    const client = createSessionClient({ apiFetchImpl: apiFetch, storage });

    await client.login('tester@example.com', 'secret123');

    const response = await client.authenticatedApiFetch('/feed', {
      headers: {
        'X-Debug': '1',
      },
    });

    expect(response).toBe(feedResponse);
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/feed',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-1',
          'X-Debug': '1',
        }),
      }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer refresh-token-1',
        }),
      }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      4,
      '/feed',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-2',
          'X-Debug': '1',
        }),
      }),
    );
  });

  test('concurrent expired requests share a single refresh-token rotation', async () => {
    const originalSession = createTokenBundle();
    const refreshedSession = createTokenBundle({
      access_token: 'access-token-2',
      refresh_token: 'refresh-token-2',
    });
    const { storage } = createMockStorage();
    const apiFetch = jest.fn(async (path: string, init?: RequestInit) => {
      const authorization = (init?.headers as Record<string, string>)
        ?.Authorization;

      if (path === '/auth/login') {
        return createMockResponse(originalSession);
      }

      if (path === '/auth/refresh') {
        return createMockResponse(refreshedSession);
      }

      if (authorization === 'Bearer access-token-1') {
        return createMockResponse(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired.' } },
          401,
        );
      }

      return createMockResponse({ items: [] });
    }) as jest.MockedFunction<ApiFetch>;

    const client = createSessionClient({ apiFetchImpl: apiFetch, storage });

    await client.login('tester@example.com', 'secret123');

    const responses = await Promise.all([
      client.authenticatedApiFetch('/feed'),
      client.authenticatedApiFetch('/items'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(
      apiFetch.mock.calls.filter(([path]) => path === '/auth/refresh'),
    ).toHaveLength(1);
  });

  test('restore clears the stored session when refresh token reuse revoked the family', async () => {
    const originalSession = createTokenBundle();
    const apiFetch = jest.fn() as jest.MockedFunction<ApiFetch>;
    const { storage, getValue } = createMockStorage(originalSession);

    apiFetch
      .mockResolvedValueOnce(
        createMockResponse(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired.' } },
          401,
        ),
      )
      .mockResolvedValueOnce(
        createMockResponse(
          { error: { code: 'TOKEN_REVOKED', message: 'Revoked.' } },
          401,
        ),
      );

    const client = createSessionClient({ apiFetchImpl: apiFetch, storage });
    const restoredUser = await client.restoreSession();

    expect(restoredUser).toBeNull();
    expect(getValue()).toBeNull();
    expect(client.getCurrentUser()).toBeNull();
  });

  test('logout clears local state even when it must fall back to the refresh token', async () => {
    const session = createTokenBundle();
    const apiFetch = jest.fn() as jest.MockedFunction<ApiFetch>;
    const { storage, getValue } = createMockStorage();

    apiFetch
      .mockResolvedValueOnce(createMockResponse(session))
      .mockResolvedValueOnce(
        createMockResponse(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired.' } },
          401,
        ),
      )
      .mockResolvedValueOnce(
        createMockResponse({ message: 'You have been logged out.' }),
      );

    const client = createSessionClient({ apiFetchImpl: apiFetch, storage });

    await client.login('tester@example.com', 'secret123');
    await client.logout();

    expect(getValue()).toBeNull();
    expect(client.getCurrentUser()).toBeNull();
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-1',
        }),
      }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer refresh-token-1',
        }),
      }),
    );
  });

  test('throws when an authenticated request is attempted without a session', async () => {
    const apiFetch = jest.fn() as jest.MockedFunction<ApiFetch>;
    const { storage } = createMockStorage();
    const client = createSessionClient({ apiFetchImpl: apiFetch, storage });

    await expect(client.authenticatedApiFetch('/feed')).rejects.toBeInstanceOf(
      SessionRequiredError,
    );
  });
});
