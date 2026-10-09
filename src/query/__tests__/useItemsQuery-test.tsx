import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { itemKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useItemsQuery } from '../useItemsQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const ITEM_A = 'a1111111-1111-4111-8111-111111111111';
const ITEM_B = 'b2222222-2222-4222-8222-222222222222';
const CATEGORY_A = 'e5555555-5555-4555-8555-555555555555';
const CIRCLE_A = 'a7777777-7777-4777-8777-777777777777';

function createItem(id: string) {
  return {
    id,
    name: 'Cordless drill',
    description: null,
    available: true,
    is_giveaway: false,
    giveaway_visibility: null,
    claim_status: null,
    created_at: '2026-01-10T12:00:00+00:00',
    image_url: null,
    owner: null,
    category: { id: 'd4444444-4444-4444-8444-444444444444', name: 'Tools' },
    tags: [],
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

test('requests the bare list when no filters are given', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /items?page=1': {
      items: [createItem(ITEM_A)],
      pagination: pagination(1, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useItemsQuery(), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  expect(authenticatedApiFetch).toHaveBeenCalledWith(
    '/items?page=1',
    expect.anything(),
  );
});

test('passes filters through and caches under itemKeys.list', async () => {
  const filters = {
    q: 'drill',
    categories: [CATEGORY_A],
    circles: [CIRCLE_A],
    itemType: 'loans' as const,
    sort: 'distance' as const,
  };
  const path = `/items?page=1&q=drill&categories=${CATEGORY_A}&circles=${CIRCLE_A}&item_type=loans&sort=distance`;
  const authenticatedApiFetch = mockApiFetch({
    [`GET ${path}`]: {
      items: [createItem(ITEM_A)],
      pagination: pagination(1, false),
    },
  });
  const queryClient = createTestQueryClient();

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useItemsQuery(filters), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(authenticatedApiFetch).toHaveBeenCalledWith(path, expect.anything());
  expect(queryClient.getQueryData(itemKeys.list(filters))).toBeDefined();
});

test('requests the next page only while has_next is true', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /items?page=1': {
      items: [createItem(ITEM_A)],
      pagination: pagination(1, true),
    },
    'GET /items?page=2': {
      items: [createItem(ITEM_B)],
      pagination: pagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useItemsQuery(), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

  expect(authenticatedApiFetch).toHaveBeenLastCalledWith(
    '/items?page=2',
    expect.anything(),
  );
  expect(result.current.hasNextPage).toBe(false);
});
