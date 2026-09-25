import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  fetchConversations,
  type ConversationPage,
  type ConversationSummary,
  type InboxStatus,
} from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/**
 * Infinite `GET /messages`. The inbox is assembled in Python and offset-paged
 * over live data, so a conversation can arrive on two pages as newer messages
 * shift the order — `conversations` is the flattened, de-duplicated list.
 */
export function useInboxQuery(status: InboxStatus) {
  const { authenticatedApiFetch } = useSession();

  const query = useInfiniteQuery({
    queryKey: messageKeys.inbox({ status }),
    queryFn: ({ pageParam, signal }) =>
      fetchConversations(authenticatedApiFetch, {
        status,
        page: pageParam,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ConversationPage): number | undefined =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
  });

  const conversations = useMemo(() => {
    if (!query.data) {
      return [];
    }

    const seen = new Set<string>();
    const deduped: ConversationSummary[] = [];

    for (const page of query.data.pages) {
      for (const conversation of page.conversations) {
        if (!seen.has(conversation.conversation_id)) {
          seen.add(conversation.conversation_id);
          deduped.push(conversation);
        }
      }
    }

    return deduped;
  }, [query.data]);

  return { ...query, conversations };
}
