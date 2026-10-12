import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError, UPLOAD_REQUEST_TIMEOUT_MS } from '../../lib/api';
import type { ItemDetailResponse, ItemWriteInput } from '../../lib/items';
import { feedKeys, itemKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { useUpdateItemMutation } from '../useUpdateItemMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';
const OTHER_ID = 'e5555555-5555-4555-8555-555555555555';
const LIST_KEY = itemKeys.list();
const MINE_KEY = itemKeys.mine({ kind: 'lending' });
const FEED_KEY = feedKeys.list();
const OTHER_DETAIL_KEY = itemKeys.detail(OTHER_ID);

const owner = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

const input: ItemWriteInput = {
  name: 'Cordless drill',
  description: 'Charger included.',
  category_id: 'c3333333-3333-4333-8333-333333333333',
  tags: ['power'],
  is_giveaway: false,
  giveaway_visibility: null,
};

const detailBody = {
  item: {
    id: ITEM_ID,
    name: 'Cordless drill',
    description: 'Charger included.',
    available: true,
    is_giveaway: false,
    giveaway_visibility: null,
    claim_status: null,
    created_at: '2026-05-26T18:30:00+00:00',
    image_url: null,
    owner,
    category: { id: input.category_id, name: 'Tools' },
    tags: [{ id: 'd4444444-4444-4444-8444-444444444444', name: 'power' }],
    images: [],
    current_loan: null,
    claimed_by: null,
    viewer_interest_status: null,
    interested_count: null,
  },
  viewer: {
    is_owner: true,
    shares_circle_with_owner: true,
    is_active_borrower: false,
  },
};

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

  const { result } = renderHook(() => useUpdateItemMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  return { queryClient, authenticatedApiFetch, result };
}

test('patches the item and replaces the cached detail', async () => {
  const { queryClient, authenticatedApiFetch, result } = setup({
    [`PATCH /items/${ITEM_ID}`]: (init?: RequestInit) => {
      expect(getRequestBody(init)).toEqual(input);

      return jsonResponse(detailBody);
    },
  });

  await act(async () => {
    await result.current.mutateAsync({ id: ITEM_ID, input });
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);

  const cached = queryClient.getQueryData<ItemDetailResponse>(
    itemKeys.detail(ITEM_ID),
  );

  expect(cached?.item.id).toBe(ITEM_ID);
  expect(cached?.viewer.is_owner).toBe(true);
  expect(
    queryClient.getQueryState(itemKeys.detail(ITEM_ID))?.isInvalidated,
  ).toBe(false);
});

test('sends photo changes as one multipart request', async () => {
  const { authenticatedApiFetch, result } = setup({
    [`PATCH /items/${ITEM_ID}`]: jsonResponse(detailBody),
  });

  await act(async () => {
    await result.current.mutateAsync({
      id: ITEM_ID,
      input,
      changes: {
        photos: [{ kind: 'new', key: 'k1', uri: 'file:///cache/one.jpg' }],
        deletedImageIds: [],
      },
    });
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);

  const init = authenticatedApiFetch.mock.calls[0][1];

  expect(init?.body).toBeInstanceOf(FormData);
  expect(init?.timeoutMs).toBe(UPLOAD_REQUEST_TIMEOUT_MS);
});

test('marks lists and the feed stale without refetching them', async () => {
  const { queryClient, authenticatedApiFetch, result } = setup({
    [`PATCH /items/${ITEM_ID}`]: jsonResponse(detailBody),
  });

  await act(async () => {
    await result.current.mutateAsync({ id: ITEM_ID, input });
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(MINE_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(FEED_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(OTHER_DETAIL_KEY)?.isInvalidated).toBe(true);
  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
});

test('surfaces a validation error and leaves the cache alone', async () => {
  const { queryClient, result } = setup({
    [`PATCH /items/${ITEM_ID}`]: jsonResponse(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required.',
          details: { name: ['Required.'] },
        },
      },
      422,
    ),
  });

  const error = await act(async () =>
    result.current
      .mutateAsync({ id: ITEM_ID, input })
      .catch((caught: unknown) => caught),
  );

  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(isApiError(error) && error.status).toBe(422);
  expect(error).toHaveProperty('message', 'Name is required.');
  expect(queryClient.getQueryData(itemKeys.detail(ITEM_ID))).toEqual({
    old: true,
  });
  expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
});
