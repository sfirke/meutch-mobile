import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import { feedKeys, itemKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  jsonResponse,
  mockApiFetch,
  mockSession,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { useDeleteItemMutation } from '../useDeleteItemMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';
const OTHER_ID = 'e5555555-5555-4555-8555-555555555555';
const LIST_KEY = itemKeys.list();
const MINE_KEY = itemKeys.mine({ kind: 'lending' });
const FEED_KEY = feedKeys.list();
const OTHER_DETAIL_KEY = itemKeys.detail(OTHER_ID);

function setup(routes: Record<string, MockRoute>) {
  const queryClient = createTestQueryClient();

  // Kept and fresh, so seeded entries are neither dropped (gcTime: 0 in the
  // test client) nor refetched on their own.
  queryClient.setQueryDefaults(itemKeys.all, {
    gcTime: Infinity,
    staleTime: Infinity,
  });
  queryClient.setQueryDefaults(feedKeys.all, {
    gcTime: Infinity,
    staleTime: Infinity,
  });
  queryClient.setQueryData(LIST_KEY, { items: [] });
  queryClient.setQueryData(MINE_KEY, { items: [] });
  queryClient.setQueryData(FEED_KEY, { items: [] });
  queryClient.setQueryData(OTHER_DETAIL_KEY, { stale: false });
  queryClient.setQueryData(itemKeys.detail(ITEM_ID), { old: true });

  const authenticatedApiFetch = mockApiFetch(routes);

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useDeleteItemMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  return { queryClient, authenticatedApiFetch, result };
}

const DELETED = { deleted: true, item_id: ITEM_ID };

test('deletes the item and removes its cached detail', async () => {
  const { queryClient, authenticatedApiFetch, result } = setup({
    [`DELETE /items/${ITEM_ID}`]: DELETED,
  });

  await act(async () => {
    await result.current.mutateAsync({ id: ITEM_ID });
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  expect(result.current.data).toEqual(DELETED);
  expect(queryClient.getQueryState(itemKeys.detail(ITEM_ID))).toBeUndefined();
  expect(queryClient.getQueryData(OTHER_DETAIL_KEY)).toEqual({ stale: false });
});

test('marks lists and the feed stale without refetching them', async () => {
  const { queryClient, authenticatedApiFetch, result } = setup({
    [`DELETE /items/${ITEM_ID}`]: DELETED,
  });

  await act(async () => {
    await result.current.mutateAsync({ id: ITEM_ID });
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(MINE_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(FEED_KEY)?.isInvalidated).toBe(true);
  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
});

test('surfaces a 409 with the server message and keeps the cache', async () => {
  const message = 'This item has an active loan and cannot be deleted.';
  const { queryClient, result } = setup({
    [`DELETE /items/${ITEM_ID}`]: jsonResponse(
      { error: { code: 'CONFLICT', message, details: {} } },
      409,
    ),
  });

  const error = await act(async () =>
    result.current
      .mutateAsync({ id: ITEM_ID })
      .catch((caught: unknown) => caught),
  );

  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(isApiError(error) && error.status).toBe(409);
  expect(error).toHaveProperty('message', message);
  expect(queryClient.getQueryData(itemKeys.detail(ITEM_ID))).toEqual({
    old: true,
  });
  expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
});
