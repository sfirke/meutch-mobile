import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { ConversationRow } from '../components/ConversationRow';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { SegmentedControl } from '../components/SegmentedControl';
import { describeError } from '../lib/errorCopy';
import type {
  ConversationPage,
  ConversationSummary,
  InboxStatus,
} from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import { webOnlyNote } from '../lib/webOnly';
import { useInboxQuery } from '../query/useInboxQuery';
import { useRefreshOnFocus } from '../query/useRefreshOnFocus';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

const SEGMENTS: { value: InboxStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'archived', label: 'Archived' },
];

// Archiving is a website action for now, so the archived empty state says so
// rather than offering a control the app cannot honour.
const EMPTY_COPY: Record<InboxStatus, { title: string; message: string }> = {
  inbox: {
    title: 'No messages yet',
    message: 'Conversations about items and circles will show up here.',
  },
  archived: {
    title: 'Nothing archived',
    message: `Archived conversations will show up here. ${webOnlyNote('Archive conversations')}`,
  },
};

function keyExtractor(conversation: ConversationSummary): string {
  return conversation.conversation_id;
}

export function InboxScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [status, setStatus] = useState<InboxStatus>('inbox');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  } = useInboxQuery(status);
  const inboxKey = useMemo(() => messageKeys.inbox({ status }), [status]);

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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ConversationSummary>) => (
      <ConversationRow
        conversation={item}
        currentUserId={currentUserId}
        now={now}
        onPress={handlePressConversation}
      />
    ),
    [currentUserId, handlePressConversation, now],
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
      messageKeys.inbox({ status }),
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
  }, [queryClient, refetch, status]);

  return (
    <View style={styles.container}>
      <View style={styles.segments}>
        <SegmentedControl
          accessibilityLabel="Message folders"
          onChange={setStatus}
          options={SEGMENTS}
          value={status}
        />
      </View>

      <View style={styles.body}>
        <QueryStateView
          empty={EMPTY_COPY[status]}
          error={error}
          isEmpty={conversations.length === 0}
          isPending={isPending}
          isRetrying={isFetching}
          loadingLabel="Loading messages"
          onRetry={() => void refetch()}
        >
          {isRefetchError ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                {describeError(error).title}
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
            onRefresh={() => void handleRefresh()}
            refreshing={isRefreshing}
            renderItem={renderItem}
            testID="inbox-list"
          />
        </QueryStateView>
      </View>
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
  segments: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
});
