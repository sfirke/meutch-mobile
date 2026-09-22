import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useCircleDetailQuery } from '../useCircleDetailQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const CIRCLE_ID = 'c1111111-1111-4111-8111-111111111111';

function createCircleDetail(overrides?: Record<string, unknown>) {
  return {
    id: CIRCLE_ID,
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
    can_view_members: true,
    is_last_member: false,
    pending_join_request: null,
    members: [],
    members_total: 0,
    members_page: 1,
    members_pages: 0,
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

test('fetches and unwraps a circle detail', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    [`GET /circles/${CIRCLE_ID}`]: { circle: createCircleDetail() },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useCircleDetailQuery(CIRCLE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.id).toBe(CIRCLE_ID);
  expect(result.current.data?.name).toBe('Oak Street Tools');
});

test('does not fetch for a non-UUID id', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useCircleDetailQuery('not-a-uuid'), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isPending).toBe(true));
  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});

test('does not fetch for an undefined id', () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  renderHook(() => useCircleDetailQuery(undefined), {
    wrapper: createWrapper(queryClient),
  });

  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});
