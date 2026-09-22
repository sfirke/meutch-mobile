/**
 * Shared render helper: wraps a component in SafeAreaProvider + a fresh,
 * retry-free QueryClient. Callers that render anything using useSession must
 * first declare, at module scope:
 *   jest.mock('<relative path>/session/SessionProvider', () => ({ useSession: jest.fn() }));
 * then call mockSession(...) (or buildSessionValue(...) directly) in the test.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import { type ReactElement } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import type { ApiFetch } from '../lib/api';
import { useSession } from '../session/SessionProvider';

const safeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = createTestQueryClient();

  const renderResult = render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
    options,
  );

  return { ...renderResult, queryClient };
}

export type SessionValue = ReturnType<typeof useSession>;

const defaultSessionUser: NonNullable<SessionValue['user']> = {
  id: 'fake-user-1',
  email: 'fake.member@example.com',
  email_confirmed: true,
  first_name: 'Fake',
  last_name: 'Member',
  full_name: 'Fake Member',
  profile_image_url: null,
};

export function buildSessionValue(
  overrides?: Partial<SessionValue>,
): SessionValue {
  return {
    authenticatedApiFetch: jest.fn(),
    errorMessage: null,
    refreshUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    status: 'signed-in',
    user: defaultSessionUser,
    ...overrides,
  };
}

export function mockSession(overrides?: Partial<SessionValue>): SessionValue {
  const value = buildSessionValue(overrides);

  jest.mocked(useSession).mockReturnValue(value);

  return value;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone(): Response {
      return jsonResponse(body, status);
    },
  } as unknown as Response;
}

// Profile/settings fixtures for the /me endpoints; spread overrides in
// screen tests.
export const defaultProfileFixture = {
  ...defaultSessionUser,
  about_me: null,
  created_at: '2026-01-15T12:00:00+00:00',
  has_location: false,
  geocoding_failed: false,
  web_links: [] as {
    id: string;
    platform_type: string;
    platform_name: string;
    display_name: string;
    url: string;
    display_order: number;
  }[],
};

export const defaultSettingsFixture = {
  vacation_mode: false,
  digest_frequency: 'weekly' as 'none' | 'daily' | 'weekly',
  digest_radius_miles: 10,
  digest_include_giveaways: true,
  digest_include_requests: true,
  digest_include_circle_joins: true,
  digest_include_loans: true,
  digest_giveaways_include_public: false,
  digest_requests_include_public: false,
};

// A fake authenticatedApiFetch answering every collection read with an empty
// page, so router-level tests settle on the screens' empty states.
export function emptyApiFetch() {
  return jest.fn(async (path: string) => {
    if (path.startsWith('/me/profile')) {
      return jsonResponse({ user: defaultProfileFixture });
    }

    if (path.startsWith('/me/settings')) {
      return jsonResponse({ settings: defaultSettingsFixture });
    }

    const name = path.startsWith('/feed')
      ? 'events'
      : path.startsWith('/circles')
        ? 'circles'
        : path.startsWith('/messages')
          ? 'conversations'
          : 'items';

    return jsonResponse({
      [name]: [],
      pagination: {
        page: 1,
        per_page: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_prev: false,
      },
    });
  });
}

// A route value: a plain body (200), a Response (from jsonResponse), or a
// function of the request init returning either.
export type MockRoute =
  ((init?: RequestInit) => Response | unknown) | Response | unknown;

function isResponseLike(value: unknown): value is Response {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Response).json === 'function' &&
    typeof (value as Response).status === 'number' &&
    typeof (value as Response).ok === 'boolean'
  );
}

function lookupRoute(
  routes: Record<string, MockRoute>,
  method: string,
  path: string,
): { key: string; route: MockRoute } | undefined {
  const strippedPath = path.split('?')[0];
  const candidates =
    method === 'GET'
      ? [`GET ${path}`, path, `GET ${strippedPath}`, strippedPath]
      : [`${method} ${path}`, `${method} ${strippedPath}`];

  for (const candidate of candidates) {
    if (candidate in routes) {
      return { key: candidate, route: routes[candidate] };
    }
  }

  return undefined;
}

// A fake authenticatedApiFetch driven by a map of 'METHOD path' -> response
// (method omitted means GET). Matches the exact path first, then the path
// with its query string stripped. Unmatched requests 404 so tests fail
// loudly instead of hanging.
export function mockApiFetch(
  routes: Record<string, MockRoute>,
): jest.Mock<ReturnType<ApiFetch>, Parameters<ApiFetch>> {
  return jest.fn(async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const match = lookupRoute(routes, method, path);

    if (!match) {
      return jsonResponse(
        {
          error: {
            code: 'NOT_FOUND',
            message: `No mock route for ${method} ${path}`,
          },
        },
        404,
      );
    }

    const resolved =
      typeof match.route === 'function'
        ? (match.route as (init?: RequestInit) => Response | unknown)(init)
        : match.route;

    return isResponseLike(resolved) ? resolved : jsonResponse(resolved);
  });
}

// Parses a request's JSON body, for asserting exact write payloads.
export function getRequestBody(init?: RequestInit): unknown {
  return typeof init?.body === 'string'
    ? (JSON.parse(init.body) as unknown)
    : undefined;
}
