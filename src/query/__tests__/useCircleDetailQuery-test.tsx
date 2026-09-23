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
  expect(result.current.circle?.id).toBe(CIRCLE_ID);
  expect(result.current.circle?.name).toBe('Oak Street Tools');
  expect(result.current.hasNextPage).toBe(false);
});

function createMember(index: number) {
  return {
    user: {
      id: `d${index}111111-1111-4111-8111-111111111111`,
      first_name: 'Fake',
      last_name: `Member${index}`,
      full_name: `Fake Member${index}`,
      profile_image_url: null,
    },
    joined_at: '2026-02-10T09:00:00+00:00',
    is_admin: false,
  };
}

test('pages through members and merges them without duplicates', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    [`GET /circles/${CIRCLE_ID}`]: {
      circle: createCircleDetail({
        members: [createMember(1), createMember(2)],
        members_total: 3,
        members_pages: 2,
      }),
    },
    [`GET /circles/${CIRCLE_ID}?members_page=2`]: {
      circle: createCircleDetail({
        name: 'Renamed Mid-Scroll',
        members: [createMember(2), createMember(3)],
        members_total: 3,
        members_page: 2,
        members_pages: 2,
      }),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useCircleDetailQuery(CIRCLE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  await result.current.fetchNextPage();

  await waitFor(() => expect(result.current.circle?.members).toHaveLength(3));
  expect(authenticatedApiFetch).toHaveBeenLastCalledWith(
    `/circles/${CIRCLE_ID}?members_page=2`,
    expect.anything(),
  );
  expect(result.current.circle?.members.map((m) => m.user.last_name)).toEqual([
    'Member1',
    'Member2',
    'Member3',
  ]);
  expect(result.current.circle?.name).toBe('Oak Street Tools');
  expect(result.current.circle?.members_page).toBe(2);
  expect(result.current.hasNextPage).toBe(false);
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
