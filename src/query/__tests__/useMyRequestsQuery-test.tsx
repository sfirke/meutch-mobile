import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { MyRequestStatus } from '../../lib/requests';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useMyRequestsQuery } from '../useMyRequestsQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const REQUEST_A = 'a1111111-1111-4111-8111-111111111111';
const REQUEST_B = 'b2222222-2222-4222-8222-222222222222';
const REQUEST_C = 'c3333333-3333-4333-8333-333333333333';

function createRequest(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    title: 'Looking for a ladder',
    description: null,
    seeking: 'loan',
    visibility: 'circles',
    status: 'open',
    expires_at: '2026-12-31T00:00:00+00:00',
    fulfilled_at: null,
    created_at: '2026-01-10T12:00:00+00:00',
    user: {
      id: 'd4444444-4444-4444-8444-444444444444',
      first_name: 'Sam',
      last_name: 'Example',
      full_name: 'Sam Example',
      profile_image_url: null,
      profile_viewable: true,
    },
    ...overrides,
  };
}

function pagination(page: number, hasNext: boolean) {
  return {
    page,
    per_page: 2,
    total: 3,
    pages: 2,
    has_next: hasNext,
    has_prev: page > 1,
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('appends the next page in order', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/requests?status=active&page=1': {
      requests: [createRequest(REQUEST_A), createRequest(REQUEST_B)],
      pagination: pagination(1, true),
    },
    'GET /me/requests?status=active&page=2': {
      requests: [createRequest(REQUEST_C)],
      pagination: pagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMyRequestsQuery('active'), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.requests).toHaveLength(3));

  expect(result.current.requests.map((request) => request.id)).toEqual([
    REQUEST_A,
    REQUEST_B,
    REQUEST_C,
  ]);
  expect(result.current.hasNextPage).toBe(false);
});

test('dedupes requests that repeat across pages', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/requests?status=active&page=1': {
      requests: [createRequest(REQUEST_A), createRequest(REQUEST_B)],
      pagination: pagination(1, true),
    },
    'GET /me/requests?status=active&page=2': {
      requests: [createRequest(REQUEST_B), createRequest(REQUEST_C)],
      pagination: pagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMyRequestsQuery('active'), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.requests).toHaveLength(3));

  expect(result.current.requests.map((request) => request.id)).toEqual([
    REQUEST_A,
    REQUEST_B,
    REQUEST_C,
  ]);
});

test('sends the status and issues a new request when it changes', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/requests?status=active&page=1': {
      requests: [createRequest(REQUEST_A)],
      pagination: pagination(1, false),
    },
    'GET /me/requests?status=fulfilled&page=1': {
      requests: [
        createRequest(REQUEST_B, {
          status: 'fulfilled',
          fulfilled_at: '2026-02-01T00:00:00+00:00',
        }),
      ],
      pagination: pagination(1, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result, rerender } = renderHook(
    ({ status }: { status: MyRequestStatus }) => useMyRequestsQuery(status),
    {
      wrapper: createWrapper(createTestQueryClient()),
      initialProps: { status: 'active' as MyRequestStatus },
    },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.requests.map((request) => request.id)).toEqual([
    REQUEST_A,
  ]);

  rerender({ status: 'fulfilled' });

  await waitFor(() =>
    expect(result.current.requests.map((request) => request.id)).toEqual([
      REQUEST_B,
    ]),
  );
  expect(authenticatedApiFetch.mock.calls.map(([path]) => path)).toEqual([
    '/me/requests?status=active&page=1',
    '/me/requests?status=fulfilled&page=1',
  ]);
});
