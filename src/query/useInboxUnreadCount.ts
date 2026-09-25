import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import type { ConversationPage } from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';

type InboxData = InfiniteData<ConversationPage, number>;

/**
 * No unread-count endpoint exists, so the badge counts the conversations with
 * unread messages on the inbox's cached first page only. It is a hint, not a
 * total: nothing is fetched here, and the count stays 0 until the Inbox tab
 * has loaded once.
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

export function useInboxUnreadCount(): number {
  const queryClient = useQueryClient();

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      queryClient.getQueryCache().subscribe(onStoreChange),
    [queryClient],
  );

  // A plain number, so re-reading it on every cache event is safe as a snapshot.
  const getSnapshot = useCallback(
    () =>
      countUnread(
        queryClient.getQueryData<InboxData>(
          messageKeys.inbox({ status: 'inbox' }),
        ),
      ),
    [queryClient],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}
