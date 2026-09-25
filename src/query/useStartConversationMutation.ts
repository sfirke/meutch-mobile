import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  startConversation,
  type ConversationSubject,
  type MessageSummary,
} from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useStartConversationMutation(subject: ConversationSubject) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<MessageSummary, Error, string>({
    mutationFn: (body) =>
      startConversation(authenticatedApiFetch, subject, body),
    onSuccess: () => {
      // The new message lands in the inbox, possibly as a new conversation.
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}
