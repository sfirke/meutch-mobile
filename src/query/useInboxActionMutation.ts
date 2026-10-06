import {
  hashKey,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import type { ApiFetch } from '../lib/api';
import {
  archiveConversation,
  bulkArchive,
  bulkMarkRead,
  bulkMarkUnread,
  bulkUnarchive,
  markAllRead,
  unarchiveConversation,
  type ConversationPage,
  type ConversationSummary,
  type InboxSort,
  type InboxStatus,
} from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export type InboxAction =
  'archive' | 'unarchive' | 'markRead' | 'markUnread' | 'markAllRead';

export type InboxActionVariables =
  | {
      action: 'archive' | 'unarchive' | 'markRead' | 'markUnread';
      conversationIds: string[];
    }
  | { action: 'markAllRead' };

/** `marked` is only set for `markUnread`. */
export type InboxActionResult = { marked?: number };

export type InboxFolder = { status: InboxStatus; sort: InboxSort };

type InboxData = InfiniteData<ConversationPage, number>;

async function runAction(
  fetchImpl: ApiFetch,
  status: InboxStatus,
  variables: InboxActionVariables,
): Promise<InboxActionResult> {
  if (variables.action === 'markAllRead') {
    await markAllRead(fetchImpl, status);

    return {};
  }

  const ids = variables.conversationIds;

  switch (variables.action) {
    case 'archive':
      await (ids.length === 1
        ? archiveConversation(fetchImpl, ids[0])
        : bulkArchive(fetchImpl, ids));
      return {};
    case 'unarchive':
      await (ids.length === 1
        ? unarchiveConversation(fetchImpl, ids[0])
        : bulkUnarchive(fetchImpl, ids));
      return {};
    case 'markRead':
      // There is no single-conversation mark-read route.
      await bulkMarkRead(fetchImpl, ids);
      return {};
    case 'markUnread':
      return bulkMarkUnread(fetchImpl, ids);
  }
}

function patchRows(
  data: InboxData | undefined,
  patch: (rows: ConversationSummary[]) => ConversationSummary[],
): InboxData | undefined {
  return (
    data && {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        conversations: patch(page.conversations),
      })),
    }
  );
}

/**
 * The inbox's archive and read-state actions. Rows in the current folder are
 * patched in place; `markUnread` refetches it instead, since the new unread
 * counts are not known. Other folders and sorts refetch when next shown.
 */
export function useInboxActionMutation(folder: InboxFolder) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();
  const folderKey = messageKeys.inbox(folder);

  return useMutation<InboxActionResult, Error, InboxActionVariables>({
    mutationFn: (variables) =>
      runAction(authenticatedApiFetch, folder.status, variables),
    onSuccess: (_result, variables) => {
      const ids = new Set(
        variables.action === 'markAllRead' ? [] : variables.conversationIds,
      );

      switch (variables.action) {
        case 'archive':
        case 'unarchive':
          queryClient.setQueryData<InboxData>(folderKey, (data) =>
            patchRows(data, (rows) =>
              rows.filter((row) => !ids.has(row.conversation_id)),
            ),
          );
          break;
        case 'markRead':
        case 'markAllRead':
          queryClient.setQueryData<InboxData>(folderKey, (data) =>
            patchRows(data, (rows) =>
              rows.map((row) =>
                variables.action === 'markAllRead' ||
                ids.has(row.conversation_id)
                  ? { ...row, unread_count: 0 }
                  : row,
              ),
            ),
          );
          break;
        case 'markUnread':
          void queryClient.invalidateQueries({ queryKey: folderKey });
          break;
      }

      // Each loaded page is a request against a 60-a-minute limit, so the
      // other folders and sorts wait until they are shown.
      const folderHash = hashKey(folderKey);

      void queryClient.invalidateQueries({
        queryKey: [...messageKeys.all, 'inbox'],
        predicate: (query) => query.queryHash !== folderHash,
        refetchType: 'none',
      });
    },
  });
}
