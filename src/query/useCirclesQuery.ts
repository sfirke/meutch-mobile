import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchCircles,
  type CircleMembership,
  type CirclePage,
  type CircleSummary,
} from '../lib/circles';
import { circleKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export type UseCirclesQueryOptions = {
  membership: CircleMembership;
  q?: string;
};

/**
 * Infinite `GET /circles` page, flattened and de-duplicated by `id` (offset
 * paging over live data can repeat a row across pages, as with the feed).
 */
export function useCirclesQuery({ membership, q }: UseCirclesQueryOptions) {
  const { authenticatedApiFetch } = useSession();

  const query = useInfiniteQuery({
    queryKey: circleKeys.list({ membership, q }),
    queryFn: ({ pageParam, signal }) =>
      fetchCircles(authenticatedApiFetch, {
        membership,
        q,
        page: pageParam,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: CirclePage): number | undefined =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
    // Keeps the previous search on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const circles: CircleSummary[] = [];
  const seenIds = new Set<string>();

  for (const page of query.data?.pages ?? []) {
    for (const circle of page.circles) {
      if (!seenIds.has(circle.id)) {
        seenIds.add(circle.id);
        circles.push(circle);
      }
    }
  }

  return { ...query, circles };
}
