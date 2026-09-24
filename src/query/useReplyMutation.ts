import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  replyToMessage,
  type MessageSummary,
  type MessageThread,
} from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/**
 * Sends a reply anchored to `messageId` and appends the returned message to the
 * open thread, so the new bubble renders before any refetch lands.
 */
export function useReplyMutation(messageId: string) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<MessageSummary, Error, string>({
    mutationFn: (body) =>
      replyToMessage(authenticatedApiFetch, messageId, body),
    onSuccess: (message) => {
      queryClient.setQueryData<MessageThread>(
        messageKeys.thread(messageId),
        (thread) =>
          thread && { ...thread, messages: [...thread.messages, message] },
      );

      // A reply changes the inbox preview and the conversation ordering.
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}
