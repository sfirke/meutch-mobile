import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { fetchItems, type ItemListPage } from '../lib/items';
import { itemKeys, type ItemListFilters } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export type UseItemsQueryOptions = ItemListFilters;

/**
 * Infinite `GET /items` page. `per_page` is left off deliberately: the backend
 * rejects anything above 50 rather than clamping, and the default suits a grid.
 */
export function useItemsQuery(filters: UseItemsQueryOptions = {}) {
  const { authenticatedApiFetch } = useSession();

  return useInfiniteQuery({
    queryKey: itemKeys.list(filters),
    queryFn: ({ pageParam, signal }) =>
      fetchItems(authenticatedApiFetch, {
        page: pageParam,
        q: filters.q,
        categories: filters.categories,
        circles: filters.circles,
        itemType: filters.itemType,
        sort: filters.sort,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ItemListPage): number | undefined =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
    // Keeps the previous search on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
