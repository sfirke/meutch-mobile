import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { feedKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  mockApiFetch,
} from '../../test-utils/renderWithProviders';
import { useFeedQuery } from '../useFeedQuery';

function createEvent(createdAt: string, itemId: string) {
  return {
    event_type: 'giveaway',
    created_at: createdAt,
    title: 'Folding step stool',
    description: null,
    action: 'posted a giveaway',
    actor_name: 'Ada Example',
    actor_avatar_url: null,
    actor_id: 'a1111111-1111-4111-8111-111111111111',
    actor_profile_viewable: true,
    image_url: null,
    distance: '2-5 mi',
    item_id: itemId,
    claim_status: 'unclaimed',
  };
}

const EVENT_A = createEvent(
  '2026-05-26T18:30:00+00:00',
  'b2222222-2222-4222-8222-222222222222',
);
const EVENT_B = createEvent(
  '2026-05-25T18:30:00+00:00',
  'c3333333-3333-4333-8333-333333333333',
);

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

test('requests the bare feed when no filters are given', async () => {
  const fetchImpl = mockApiFetch({
    'GET /feed?page=1': {
      events: [EVENT_A],
      pagination: pagination(1, false),
    },
  });

  const { result } = renderHook(() => useFeedQuery(fetchImpl), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledWith('/feed?page=1', expect.anything());
});

test('passes filters through and caches under feedKeys.list', async () => {
  const filters = {
    scope: 'circles' as const,
    types: ['loans' as const],
    distance: null,
    showOwnActivity: false,
    showClaimedGiveaways: true,
  };
  const path =
    '/feed?page=1&types=loans&scope=circles&distance=none&show_own_activity=false&show_claimed_giveaways=true';
  const fetchImpl = mockApiFetch({
    [`GET ${path}`]: { events: [EVENT_A], pagination: pagination(1, false) },
  });
  const queryClient = createTestQueryClient();

  const { result } = renderHook(() => useFeedQuery(fetchImpl, filters), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(fetchImpl).toHaveBeenCalledWith(path, expect.anything());
  expect(queryClient.getQueryData(feedKeys.list(filters))).toBeDefined();
});

test('follows has_next with the same filters on page 2', async () => {
  const filters = { scope: 'circles' as const, distance: 5 as const };
  const fetchImpl = mockApiFetch({
    'GET /feed?page=1&scope=circles&distance=5': {
      events: [EVENT_A],
      pagination: pagination(1, true),
    },
    'GET /feed?page=2&scope=circles&distance=5': {
      events: [EVENT_B],
      pagination: pagination(2, false),
    },
  });

  const { result } = renderHook(() => useFeedQuery(fetchImpl, filters), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

  expect(fetchImpl).toHaveBeenLastCalledWith(
    '/feed?page=2&scope=circles&distance=5',
    expect.anything(),
  );
  expect(result.current.hasNextPage).toBe(false);
});

test('de-duplicates events that appear on two pages', async () => {
  const fetchImpl = mockApiFetch({
    'GET /feed?page=1': {
      events: [EVENT_A],
      pagination: pagination(1, true),
    },
    'GET /feed?page=2': {
      events: [EVENT_A, EVENT_B],
      pagination: pagination(2, false),
    },
  });

  const { result } = renderHook(() => useFeedQuery(fetchImpl), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

  expect(result.current.events.map((event) => event.created_at)).toEqual([
    EVENT_A.created_at,
    EVENT_B.created_at,
  ]);
});
