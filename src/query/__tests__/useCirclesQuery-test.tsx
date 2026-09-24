import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useCirclesQuery } from '../useCirclesQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const CIRCLE_A = 'a1111111-1111-4111-8111-111111111111';
const CIRCLE_B = 'b2222222-2222-4222-8222-222222222222';

function createCircle(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    name: 'Oak Street Tools',
    description: null,
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-10T12:00:00+00:00',
    image_url: null,
    requires_join_approval: false,
    member_count: 3,
    is_member: false,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance_miles: null,
    ...overrides,
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('dedupes circles that repeat across pages', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    'GET /circles?membership=mine&page=1': {
      circles: [createCircle(CIRCLE_A), createCircle(CIRCLE_B)],
      pagination: {
        page: 1,
        per_page: 2,
        total: 3,
        pages: 2,
        has_next: true,
        has_prev: false,
      },
    },
    'GET /circles?membership=mine&page=2': {
      circles: [createCircle(CIRCLE_B), createCircle(CIRCLE_A)],
      pagination: {
        page: 2,
        per_page: 2,
        total: 3,
        pages: 2,
        has_next: false,
        has_prev: true,
      },
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useCirclesQuery({ membership: 'mine' }), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.circles.map((circle) => circle.id)).toEqual([
    CIRCLE_A,
    CIRCLE_B,
  ]);

  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));

  expect(result.current.circles.map((circle) => circle.id)).toEqual([
    CIRCLE_A,
    CIRCLE_B,
  ]);
});

test('a changed q produces a different query key', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    'GET /circles?membership=discoverable&page=1': {
      circles: [createCircle(CIRCLE_A)],
      pagination: {
        page: 1,
        per_page: 12,
        total: 1,
        pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
    'GET /circles?membership=discoverable&page=1&q=oak': {
      circles: [createCircle(CIRCLE_B, { name: 'Oak Neighbors' })],
      pagination: {
        page: 1,
        per_page: 12,
        total: 1,
        pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result, rerender } = renderHook(
    ({ q }: { q?: string }) =>
      useCirclesQuery({ membership: 'discoverable', q }),
    {
      wrapper: createWrapper(queryClient),
      initialProps: { q: undefined },
    },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.circles.map((circle) => circle.id)).toEqual([CIRCLE_A]);

  rerender({ q: 'oak' });

  await waitFor(() =>
    expect(result.current.circles.map((circle) => circle.id)).toEqual([
      CIRCLE_B,
    ]),
  );
});
