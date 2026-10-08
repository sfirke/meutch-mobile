import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { requestKeys } from '../lib/queryKeys';
import {
  fetchMyRequests,
  type MyRequestStatus,
  type RequestListPage,
  type RequestSummary,
} from '../lib/requests';
import { useSession } from '../session/SessionProvider';

/**
 * Infinite `GET /me/requests` page for one status, flattened and de-duplicated
 * by `id` (offset paging over live data can repeat a row across pages).
 */
export function useMyRequestsQuery(status: MyRequestStatus) {
  const { authenticatedApiFetch } = useSession();

  const query = useInfiniteQuery({
    queryKey: requestKeys.mine({ status }),
    queryFn: ({ pageParam, signal }) =>
      fetchMyRequests(authenticatedApiFetch, {
        status,
        page: pageParam,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: RequestListPage): number | undefined =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
    // Keeps the previous list on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const requests: RequestSummary[] = [];
  const seenIds = new Set<string>();

  for (const page of query.data?.pages ?? []) {
    for (const request of page.requests) {
      if (!seenIds.has(request.id)) {
        seenIds.add(request.id);
        requests.push(request);
      }
    }
  }

  return { ...query, requests };
}
