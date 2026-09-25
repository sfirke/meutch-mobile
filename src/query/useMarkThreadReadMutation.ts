import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  markThreadRead,
  type MarkThreadReadResponse,
  type MessageThread,
} from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/**
 * Marks the thread read. The inbox's `unread_count` also counts messages tied
 * to a pending loan request, which this action leaves unread, so a row can stay
 * unread after the thread is opened. That matches the web app.
 */
export function useMarkThreadReadMutation(messageId: string) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<MarkThreadReadResponse, Error, void>({
    mutationFn: () => markThreadRead(authenticatedApiFetch, messageId),
    onSuccess: () => {
      queryClient.setQueryData<MessageThread>(
        messageKeys.thread(messageId),
        (thread) => thread && { ...thread, has_unread_messages: false },
      );

      void queryClient.invalidateQueries({
        queryKey: [...messageKeys.all, 'inbox'],
      });
    },
  });
}
