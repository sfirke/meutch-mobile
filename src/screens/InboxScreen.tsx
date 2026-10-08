import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { ConversationRow } from '../components/ConversationRow';
import { InboxToolbar } from '../components/InboxToolbar';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { SegmentedControl } from '../components/SegmentedControl';
import { SelectionBar, type SelectionAction } from '../components/SelectionBar';
import { describeError } from '../lib/errorCopy';
import type {
  ConversationPage,
  ConversationSummary,
  InboxSort,
  InboxStatus,
} from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import {
  useInboxActionMutation,
  type InboxActionVariables,
} from '../query/useInboxActionMutation';
import { useInboxQuery } from '../query/useInboxQuery';
import { useRefreshOnFocus } from '../query/useRefreshOnFocus';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

const SEGMENTS: { value: InboxStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'archived', label: 'Archived' },
];

const EMPTY_COPY: Record<InboxStatus, { title: string; message: string }> = {
  inbox: {
    title: 'No messages yet',
    message: 'Conversations about items and circles will show up here.',
  },
  archived: {
    title: 'Nothing archived',
    message: 'Archived conversations will show up here.',
  },
};

const PARTIAL_UNREAD_NOTICE =
  "Conversations with no received messages can't be marked unread.";

function keyExtractor(conversation: ConversationSummary): string {
  return conversation.conversation_id;
}

export function InboxScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [status, setStatus] = useState<InboxStatus>('inbox');
  const [sort, setSort] = useState<InboxSort>('newest');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isSelecting = selected.size > 0;

  const {
    conversations,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
    isRefetchError,
    refetch,
  } = useInboxQuery(status, sort);
  const inboxKey = useMemo(
    () => messageKeys.inbox({ status, sort }),
    [status, sort],
  );
  const mutation = useInboxActionMutation({ status, sort });
  const { mutate, reset: resetMutation, isPending: isActing } = mutation;

  useRefreshOnFocus(inboxKey);

  // Captured once, not per row, so every visible row renders relative times
  // against the same instant.
  const now = useMemo(() => new Date(), []);
  const currentUserId = user?.id ?? '';

  const handlePressConversation = useCallback(
    (conversation: ConversationSummary) => {
      // The thread route is keyed by a message id, not a conversation id.
      router.push(`/message/${conversation.latest_message.id}`);
    },
    [router],
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleStatusChange = useCallback(
    (next: InboxStatus) => {
      setStatus(next);
      clearSelection();
      setNotice(null);
      resetMutation();
    },
    [clearSelection, resetMutation],
  );

  const handleLongPress = useCallback((conversation: ConversationSummary) => {
    setSelected(new Set([conversation.conversation_id]));
    setNotice(null);
  }, []);

  const handleToggleSelect = useCallback(
    (conversation: ConversationSummary) => {
      setSelected((current) => {
        const next = new Set(current);

        if (!next.delete(conversation.conversation_id)) {
          next.add(conversation.conversation_id);
        }

        return next;
      });
      setNotice(null);
    },
    [],
  );

  // Hardware back leaves selection mode rather than the screen.
  useEffect(() => {
    if (!isSelecting) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        clearSelection();
        return true;
      },
    );

    return () => subscription.remove();
  }, [clearSelection, isSelecting]);

  // Selection clears on success and stays on failure so the user can retry.
  const runAction = useCallback(
    (variables: InboxActionVariables) => {
      setNotice(null);
      mutate(variables, {
        onSuccess: (result) => {
          clearSelection();

          if (
            variables.action === 'markUnread' &&
            result.marked !== undefined &&
            result.marked < variables.conversationIds.length
          ) {
            setNotice(PARTIAL_UNREAD_NOTICE);
          }
        },
      });
    },
    [clearSelection, mutate],
  );

  const selectedRows = useMemo(
    () =>
      conversations.filter((conversation) =>
        selected.has(conversation.conversation_id),
      ),
    [conversations, selected],
  );

  const selectionActions = useMemo((): SelectionAction[] => {
    const conversationIds = [...selected];
    const hasUnread = selectedRows.some((row) => row.unread_count > 0);
    const hasRead = selectedRows.some((row) => row.unread_count === 0);

    const folderAction: SelectionAction =
      status === 'inbox'
        ? {
            key: 'archive',
            label: 'Archive',
            icon: 'archive',
            onPress: () => runAction({ action: 'archive', conversationIds }),
          }
        : {
            key: 'unarchive',
            label: 'Unarchive',
            icon: 'inbox',
            onPress: () => runAction({ action: 'unarchive', conversationIds }),
          };

    // Both read actions always render, so the bar does not shift as the
    // selection changes; the one that does not apply is disabled.
    return [
      { ...folderAction, disabled: isActing },
      {
        key: 'mark-read',
        label: 'Mark read',
        icon: 'read',
        onPress: () => runAction({ action: 'markRead', conversationIds }),
        disabled: isActing || !hasUnread,
      },
      {
        key: 'mark-unread',
        label: 'Mark unread',
        icon: 'unread',
        onPress: () => runAction({ action: 'markUnread', conversationIds }),
        disabled: isActing || !hasRead,
      },
    ];
  }, [isActing, runAction, selected, selectedRows, status]);

  const hasUnreadLoaded = conversations.some(
    (conversation) => conversation.unread_count > 0,
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ConversationSummary>) => (
      <ConversationRow
        conversation={item}
        currentUserId={currentUserId}
        now={now}
        onLongPress={handleLongPress}
        onPress={handlePressConversation}
        onToggleSelect={handleToggleSelect}
        selected={selected.has(item.conversation_id)}
        selectionMode={isSelecting}
      />
    ),
    [
      currentUserId,
      handleLongPress,
      handlePressConversation,
      handleToggleSelect,
      isSelecting,
      now,
      selected,
    ],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);

  const handleRetryNextPage = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // A plain refetch() re-requests every loaded page; trim to the first page
    // so pull-to-refresh costs one request, not N.
    queryClient.setQueryData<InfiniteData<ConversationPage, number>>(
      messageKeys.inbox({ status, sort }),
      (data) =>
        data
          ? {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
          : data,
    );

    await refetch();
    setIsRefreshing(false);
  }, [queryClient, refetch, sort, status]);

  // Pull-to-refresh is off while selecting.
  const onRefresh = isSelecting ? undefined : () => void handleRefresh();
  const bannerError = mutation.error ?? (isRefetchError ? error : null);

  return (
    <View style={styles.container}>
      <View style={styles.segments}>
        <SegmentedControl
          accessibilityLabel="Message folders"
          onChange={handleStatusChange}
          options={SEGMENTS}
          value={status}
        />
      </View>
      <InboxToolbar
        markAllReadDisabled={!hasUnreadLoaded || isActing}
        onMarkAllRead={() => runAction({ action: 'markAllRead' })}
        onSortChange={setSort}
        sort={sort}
      />

      <View style={styles.body}>
        <QueryStateView
          empty={EMPTY_COPY[status]}
          error={error}
          isEmpty={conversations.length === 0}
          isPending={isPending}
          isRefreshing={isRefreshing && !isSelecting}
          isRetrying={isFetching}
          loadingLabel="Loading messages"
          onRefresh={onRefresh}
          onRetry={() => void refetch()}
        >
          {bannerError ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                {describeError(bannerError).title}
              </Text>
            </View>
          ) : notice ? (
            <View style={[styles.banner, styles.notice]} testID="inbox-notice">
              <Text style={[styles.bannerText, styles.noticeText]}>
                {notice}
              </Text>
            </View>
          ) : null}
          <FlatList
            data={conversations}
            keyExtractor={keyExtractor}
            ListFooterComponent={
              <PagingFooter
                hasError={isFetchNextPageError}
                isFetchingNextPage={isFetchingNextPage}
                loadingLabel="Loading more messages"
                onRetry={handleRetryNextPage}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            onRefresh={onRefresh}
            refreshing={isRefreshing && !isSelecting}
            renderItem={renderItem}
            testID="inbox-list"
          />
        </QueryStateView>
      </View>
      {isSelecting ? (
        <SelectionBar
          actions={selectionActions}
          count={selected.size}
          onClose={clearSelection}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing[8],
    marginHorizontal: spacing[16],
    marginTop: spacing[12],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  bannerText: {
    color: colors.errorLabel,
    ...typography.meta,
  },
  body: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  notice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  noticeText: {
    color: colors.text,
  },
  segments: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
});
