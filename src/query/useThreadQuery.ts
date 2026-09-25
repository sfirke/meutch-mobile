import { useQuery } from '@tanstack/react-query';

import { fetchMessageThread, type MessageThread } from '../lib/messages';
import { isUuid } from '../lib/parse';
import { messageKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/** `messageId` anchors the thread: the route takes a message, not a conversation. */
export function useThreadQuery(messageId: string | undefined) {
  const { authenticatedApiFetch } = useSession();
  const anchorId = messageId ?? '';

  return useQuery<MessageThread>({
    queryKey: messageKeys.thread(anchorId),
    queryFn: ({ signal }) =>
      fetchMessageThread(authenticatedApiFetch, anchorId, { signal }),
    enabled: isUuid(messageId),
  });
}
