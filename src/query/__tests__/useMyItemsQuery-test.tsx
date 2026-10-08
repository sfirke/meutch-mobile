import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { MyItemKind } from '../../lib/items';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useMyItemsQuery } from '../useMyItemsQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const ITEM_A = 'a1111111-1111-4111-8111-111111111111';
const ITEM_B = 'b2222222-2222-4222-8222-222222222222';
const ITEM_C = 'c3333333-3333-4333-8333-333333333333';

function createItem(id: string, overrides?: Record<string, unknown>) {
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
    'GET /me/items?kind=lending&page=1': {
      items: [createItem(ITEM_A), createItem(ITEM_B)],
      pagination: pagination(1, true),
    },
    'GET /me/items?kind=lending&page=2': {
      items: [createItem(ITEM_C)],
      pagination: pagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMyItemsQuery({ kind: 'lending' }), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.items).toHaveLength(3));

  expect(result.current.items.map((item) => item.id)).toEqual([
    ITEM_A,
    ITEM_B,
    ITEM_C,
  ]);
  expect(result.current.hasNextPage).toBe(false);
});

test('dedupes items that repeat across pages', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/items?kind=lending&page=1': {
      items: [createItem(ITEM_A), createItem(ITEM_B)],
      pagination: pagination(1, true),
    },
    'GET /me/items?kind=lending&page=2': {
      items: [createItem(ITEM_B), createItem(ITEM_C)],
      pagination: pagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMyItemsQuery({ kind: 'lending' }), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.items).toHaveLength(3));

  expect(result.current.items.map((item) => item.id)).toEqual([
    ITEM_A,
    ITEM_B,
    ITEM_C,
  ]);
});

test('sends the kind and issues a new request when it changes', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/items?kind=lending&page=1': {
      items: [createItem(ITEM_A)],
      pagination: pagination(1, false),
    },
    'GET /me/items?kind=active_giveaways&page=1': {
      items: [createItem(ITEM_B, { is_giveaway: true })],
      pagination: pagination(1, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result, rerender } = renderHook(
    ({ kind }: { kind: MyItemKind }) => useMyItemsQuery({ kind }),
    {
      wrapper: createWrapper(createTestQueryClient()),
      initialProps: { kind: 'lending' as MyItemKind },
    },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.items.map((item) => item.id)).toEqual([ITEM_A]);

  rerender({ kind: 'active_giveaways' });

  await waitFor(() =>
    expect(result.current.items.map((item) => item.id)).toEqual([ITEM_B]),
  );
  expect(authenticatedApiFetch.mock.calls.map(([path]) => path)).toEqual([
    '/me/items?kind=lending&page=1',
    '/me/items?kind=active_giveaways&page=1',
  ]);
});

test('sends q trimmed and omits it when blank', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/items?kind=lending&page=1': {
      items: [createItem(ITEM_A)],
      pagination: pagination(1, false),
    },
    'GET /me/items?kind=lending&page=1&q=drill': {
      items: [createItem(ITEM_B)],
      pagination: pagination(1, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result, rerender } = renderHook(
    ({ q }: { q?: string }) => useMyItemsQuery({ kind: 'lending', q }),
    {
      wrapper: createWrapper(createTestQueryClient()),
      initialProps: { q: '   ' as string | undefined },
    },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(authenticatedApiFetch).toHaveBeenLastCalledWith(
    '/me/items?kind=lending&page=1',
    expect.anything(),
  );

  rerender({ q: '  drill ' });

  await waitFor(() =>
    expect(result.current.items.map((item) => item.id)).toEqual([ITEM_B]),
  );
  expect(authenticatedApiFetch).toHaveBeenLastCalledWith(
    '/me/items?kind=lending&page=1&q=drill',
    expect.anything(),
  );
});
