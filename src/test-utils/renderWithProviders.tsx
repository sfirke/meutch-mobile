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

// A fake authenticatedApiFetch answering every collection read with an empty
// page, so router-level tests settle on the screens' empty states.
export function emptyApiFetch() {
  return jest.fn(async (path: string) => {
    const name = path.startsWith('/feed')
      ? 'events'
      : path.startsWith('/circles')
        ? 'circles'
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
