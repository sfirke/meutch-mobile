import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchMyItems,
  type ItemListPage,
  type ItemSummary,
  type MyItemKind,
} from '../lib/items';
import { itemKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export type UseMyItemsQueryOptions = {
  kind: MyItemKind;
  q?: string;
};

/**
 * Infinite `GET /me/items` page, flattened and de-duplicated by `id` (offset
 * paging over live data can repeat a row across pages).
 */
export function useMyItemsQuery({ kind, q }: UseMyItemsQueryOptions) {
  const { authenticatedApiFetch } = useSession();

  const query = useInfiniteQuery({
    queryKey: itemKeys.mine({ kind, q }),
    queryFn: ({ pageParam, signal }) =>
      fetchMyItems(authenticatedApiFetch, {
        kind,
        q,
        page: pageParam,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ItemListPage): number | undefined =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
    // Keeps the previous list on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const items: ItemSummary[] = [];
  const seenIds = new Set<string>();

  for (const page of query.data?.pages ?? []) {
    for (const item of page.items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    }
  }

  return { ...query, items };
}
