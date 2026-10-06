import {
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import type { ConversationPage } from '../lib/messages';
import { isObject } from '../lib/parse';
import { messageKeys } from '../lib/queryKeys';

type InboxData = InfiniteData<ConversationPage, number>;

/**
 * No unread-count endpoint exists, so the badge counts the conversations with
 * unread messages on the inbox's cached first page only. It is a hint, not a
 * total: nothing is fetched here, and the count stays 0 until the Inbox tab
 * has loaded once. The inbox is cached once per sort, so the most recently
 * updated entry wins.
 */
function countUnread(data: InboxData | undefined): number {
  const firstPage = data?.pages[0];

  if (!firstPage) {
    return 0;
  }

  return firstPage.conversations.filter(
    (conversation) => conversation.unread_count > 0,
  ).length;
}

function latestInboxData(queryClient: QueryClient): InboxData | undefined {
  let latest: { data: InboxData; updatedAt: number } | undefined;

  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: [...messageKeys.all, 'inbox'] })) {
    const filters = query.queryKey[2];

    if (
      !isObject(filters) ||
      filters.status !== 'inbox' ||
      query.state.data === undefined
    ) {
      continue;
    }

    if (!latest || query.state.dataUpdatedAt > latest.updatedAt) {
      latest = {
        data: query.state.data as InboxData,
        updatedAt: query.state.dataUpdatedAt,
      };
    }
  }

  return latest?.data;
}

export function useInboxUnreadCount(): number {
  const queryClient = useQueryClient();

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      queryClient.getQueryCache().subscribe(onStoreChange),
    [queryClient],
  );

  // A plain number, so re-reading it on every cache event is safe as a snapshot.
  const getSnapshot = useCallback(
    () => countUnread(latestInboxData(queryClient)),
    [queryClient],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}
