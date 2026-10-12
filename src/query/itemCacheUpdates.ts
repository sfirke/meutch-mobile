import {
  hashKey,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import { feedKeys, itemKeys } from '../lib/queryKeys';

/**
 * Marks item and feed lists stale without refetching, since reads are
 * rate-limited; each list refetches when it is next shown. `exceptKey` is
 * left alone (the detail entry the caller just wrote).
 */
export function markItemListsStale(
  queryClient: QueryClient,
  exceptKey?: QueryKey,
) {
  const exceptHash = exceptKey ? hashKey(exceptKey) : null;

  void queryClient.invalidateQueries({
    queryKey: itemKeys.all,
    predicate: (query) => query.queryHash !== exceptHash,
    refetchType: 'none',
  });
  void queryClient.invalidateQueries({
    queryKey: feedKeys.all,
    refetchType: 'none',
  });
}
