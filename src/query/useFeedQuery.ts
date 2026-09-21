import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { ApiFetch } from '../lib/api';
import { fetchFeed, type FeedEvent, type FeedPage } from '../lib/feed';
import { feedKeys } from '../lib/queryKeys';

/**
 * Stable identity for a feed event, which the backend does not give an id.
 * Combines the event type, timestamp, and whichever subject id is set.
 */
export function getFeedEventKey(event: FeedEvent): string {
  const subjectId =
    event.item_id ??
    event.request_id ??
    event.loan_request_id ??
    event.circle_id ??
    event.user_id ??
    '';

  return `${event.event_type}:${event.created_at}:${subjectId}`;
}

/**
 * Wraps `useInfiniteQuery` over `GET /feed`. The feed is offset-paginated
 * over live data, so the same event can arrive on two pages as newer
 * activity shifts later ones — `events` is the flattened, de-duplicated list.
 */
export function useFeedQuery(fetchImpl: ApiFetch) {
  const query = useInfiniteQuery<FeedPage>({
    queryKey: feedKeys.list(),
    queryFn: ({ pageParam, signal }) =>
      fetchFeed(fetchImpl, { page: pageParam as number, signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
  });

  const events = useMemo(() => {
    if (!query.data) {
      return [];
    }

    const seen = new Set<string>();
    const deduped: FeedEvent[] = [];

    for (const page of query.data.pages) {
      for (const event of page.events) {
        const key = getFeedEventKey(event);

        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(event);
        }
      }
    }

    return deduped;
  }, [query.data]);

  return { ...query, events };
}
