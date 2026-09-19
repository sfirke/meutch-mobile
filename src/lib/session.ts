import {
  ApiError,
  apiFetch,
  buildJsonRequestInit,
  isApiError,
  readApiError,
  readJsonOrThrow,
  withBearerToken,
  type ApiFetch,
} from './api';
import { secureSessionStorage, type SessionStorage } from './sessionStorage';

export type AuthenticatedUser = {
  id: string;
  email: string;
  email_confirmed: boolean;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image_url: string | null;
};

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  user: AuthenticatedUser;
};

type CurrentUserResponse = {
  user: AuthenticatedUser;
};

type SessionListener = (user: AuthenticatedUser | null) => void;

const ACCESS_EXPIRED_CODE = 'TOKEN_EXPIRED';
const AUTH_REQUIRED_CODE = 'AUTHENTICATION_REQUIRED';
const INVALID_TOKEN_CODE = 'INVALID_TOKEN';
const REVOKED_TOKEN_CODE = 'TOKEN_REVOKED';
const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please sign in again.';

export class SessionRequiredError extends Error {
  constructor() {
    super('You must sign in before making authenticated requests.');
    this.name = 'SessionRequiredError';
  }
}

export class SessionExpiredError extends Error {
  constructor(message = SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseAuthenticatedUser(value: unknown): AuthenticatedUser {
  if (!isObject(value)) {
    throw new Error('Invalid authenticated user payload.');
  }

  const {
    email,
    email_confirmed: emailConfirmed,
    first_name: firstName,
    full_name: fullName,
    id,
    last_name: lastName,
    profile_image_url: profileImageUrl,
  } = value;

  if (
    !isString(id) ||
    !isString(email) ||
    typeof emailConfirmed !== 'boolean' ||
    !isString(firstName) ||
    !isString(lastName) ||
    !isString(fullName) ||
    !(profileImageUrl === null || typeof profileImageUrl === 'string')
  ) {
    throw new Error('Invalid authenticated user payload.');
  }

  return {
    id,
    email,
    email_confirmed: emailConfirmed,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    profile_image_url: profileImageUrl,
  };
}

function parseTokenBundle(value: unknown): TokenBundle {
  if (!isObject(value)) {
    throw new Error('Invalid token bundle payload.');
  }

  const {
    access_token: accessToken,
    access_token_expires_at: accessTokenExpiresAt,
    refresh_token: refreshToken,
    refresh_token_expires_at: refreshTokenExpiresAt,
    token_type: tokenType,
    user,
  } = value;

  if (
    !isString(accessToken) ||
    !isString(refreshToken) ||
    !isString(accessTokenExpiresAt) ||
    !isString(refreshTokenExpiresAt) ||
    tokenType !== 'Bearer'
  ) {
    throw new Error('Invalid token bundle payload.');
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    access_token_expires_at: accessTokenExpiresAt,
    refresh_token_expires_at: refreshTokenExpiresAt,
    user: parseAuthenticatedUser(user),
  };
}

function isSessionInvalidCode(code: string): boolean {
  return (
    code === AUTH_REQUIRED_CODE ||
    code === INVALID_TOKEN_CODE ||
    code === REVOKED_TOKEN_CODE
  );
}

function isAccessExpired(error: unknown): error is ApiError {
  return isApiError(error) && error.code === ACCESS_EXPIRED_CODE;
}

function isTerminalRefreshError(error: unknown): error is ApiError {
  return (
    isApiError(error) &&
    (error.code === ACCESS_EXPIRED_CODE || isSessionInvalidCode(error.code))
  );
}

async function requestTokenBundle(
  request: ApiFetch,
  path: string,
  init: RequestInit,
): Promise<TokenBundle> {
  const response = await request(path, init);
  const payload = await readJsonOrThrow<unknown>(response);

  return parseTokenBundle(payload);
}

async function requestCurrentUser(
  request: ApiFetch,
  accessToken: string,
): Promise<AuthenticatedUser> {
  const response = await request('/auth/me', withBearerToken(accessToken));
  const payload = await readJsonOrThrow<CurrentUserResponse>(response);

  return parseAuthenticatedUser(payload.user);
}

export function createSessionClient(options?: {
  apiFetchImpl?: ApiFetch;
  storage?: SessionStorage;
}) {
  const request = options?.apiFetchImpl ?? apiFetch;
  const storage = options?.storage ?? secureSessionStorage;
  const listeners = new Set<SessionListener>();
  let currentSession: TokenBundle | null = null;

  function notify() {
    const currentUser = currentSession?.user ?? null;

    for (const listener of listeners) {
      listener(currentUser);
    }
  }

  async function setSession(session: TokenBundle | null) {
    currentSession = session;

    if (session) {
      await storage.save(session);
    } else {
      await storage.clear();
    }

    notify();
  }

  let pendingRefresh: Promise<TokenBundle> | null = null;

  // Refresh tokens rotate and the backend revokes the whole family when a
  // rotated token is replayed, so concurrent callers must share one refresh.
  function refreshCurrentSession(): Promise<TokenBundle> {
    if (!pendingRefresh) {
      pendingRefresh = performRefresh().finally(() => {
        pendingRefresh = null;
      });
    }

    return pendingRefresh;
  }

  async function performRefresh(): Promise<TokenBundle> {
    const sessionToRefresh = currentSession;

    if (!sessionToRefresh) {
      throw new SessionRequiredError();
    }

    try {
      const refreshedSession = await requestTokenBundle(
        request,
        '/auth/refresh',
        withBearerToken(sessionToRefresh.refresh_token, {
          method: 'POST',
        }),
      );

      if (currentSession !== sessionToRefresh) {
        // The session was cleared or replaced (logout/login) mid-refresh.
        throw new SessionRequiredError();
      }

      await setSession(refreshedSession);

      return refreshedSession;
    } catch (error) {
      if (isTerminalRefreshError(error)) {
        if (currentSession === sessionToRefresh) {
          await setSession(null);
        }

        throw new SessionExpiredError();
      }

      throw error;
    }
  }

  async function logoutWithToken(token: string): Promise<boolean> {
    try {
      const response = await request(
        '/auth/logout',
        withBearerToken(token, {
          method: 'POST',
        }),
      );

      if (response.ok) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async function authenticatedApiFetch(path: string, init?: RequestInit) {
    if (!currentSession) {
      throw new SessionRequiredError();
    }

    const sendAuthenticatedRequest = (accessToken: string) =>
      request(path, withBearerToken(accessToken, init));

    const response = await sendAuthenticatedRequest(
      currentSession.access_token,
    );

    if (response.status !== 401) {
      return response;
    }

    const error = await readApiError(response);

    if (error.code === ACCESS_EXPIRED_CODE) {
      const refreshedSession = await refreshCurrentSession();
      const retryResponse = await sendAuthenticatedRequest(
        refreshedSession.access_token,
      );

      if (retryResponse.status !== 401) {
        return retryResponse;
      }

      const retryError = await readApiError(retryResponse);

      if (
        retryError.code === ACCESS_EXPIRED_CODE ||
        isSessionInvalidCode(retryError.code)
      ) {
        await setSession(null);
        throw new SessionExpiredError();
      }

      return retryResponse;
    }

    if (isSessionInvalidCode(error.code)) {
      await setSession(null);
      throw new SessionExpiredError();
    }

    return response;
  }

  return {
    subscribe(listener: SessionListener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    getCurrentUser() {
      return currentSession?.user ?? null;
    },

    async login(email: string, password: string) {
      const session = await requestTokenBundle(
        request,
        '/auth/login',
        buildJsonRequestInit(
          {
            email: email.trim(),
            password,
          },
          {
            method: 'POST',
          },
        ),
      );

      await setSession(session);

      return session.user;
    },

    async restoreSession() {
      const storedSession = await storage.load();

      if (!storedSession) {
        currentSession = null;
        notify();
        return null;
      }

      currentSession = storedSession;

      try {
        const user = await requestCurrentUser(
          request,
          storedSession.access_token,
        );
        await setSession({ ...storedSession, user });
        return user;
      } catch (error) {
        if (isAccessExpired(error)) {
          try {
            const refreshedSession = await refreshCurrentSession();
            const user = await requestCurrentUser(
              request,
              refreshedSession.access_token,
            );

            await setSession({ ...refreshedSession, user });

            return user;
          } catch (refreshError) {
            if (refreshError instanceof SessionExpiredError) {
              return null;
            }

            notify();
            return currentSession?.user ?? storedSession.user;
          }
        }

        if (isApiError(error) && isSessionInvalidCode(error.code)) {
          await setSession(null);
          return null;
        }

        notify();
        return currentSession?.user ?? storedSession.user;
      }
    },

    async logout() {
      const session = currentSession;

      if (session) {
        const loggedOutWithAccessToken = await logoutWithToken(
          session.access_token,
        );

        if (!loggedOutWithAccessToken) {
          await logoutWithToken(session.refresh_token);
        }
      }

      await setSession(null);
    },

    async refreshUser() {
      if (!currentSession) {
        throw new SessionRequiredError();
      }

      const response = await authenticatedApiFetch('/auth/me');
      const payload = await readJsonOrThrow<CurrentUserResponse>(response);
      const user = parseAuthenticatedUser(payload.user);

      // A logout may have cleared the session while the request was in flight.
      if (!currentSession) {
        throw new SessionRequiredError();
      }

      await setSession({
        ...currentSession,
        user,
      });

      return user;
    },

    authenticatedApiFetch,
  };
}

export const sessionClient = createSessionClient();
