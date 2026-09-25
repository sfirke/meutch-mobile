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

import { FeedEventCard } from '../components/FeedEventCard';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { describeError } from '../lib/errorCopy';
import type { FeedEvent, FeedPage } from '../lib/feed';
import { feedKeys } from '../lib/queryKeys';
import { getFeedEventKey, useFeedQuery } from '../query/useFeedQuery';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

export function FeedScreen() {
  const { authenticatedApiFetch } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    error,
    events,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
    isRefetchError,
    refetch,
  } = useFeedQuery(authenticatedApiFetch);

  // Captured once, not per row, so every visible card renders relative
  // times against the same instant instead of each computing its own.
  const now = useMemo(() => new Date(), []);

  const handlePressItem = useCallback(
    (itemId: string) => {
      router.push(`/item/${itemId}`);
    },
    [router],
  );

  const handlePressCircle = useCallback(
    (circleId: string) => {
      router.push(`/circle/${circleId}`);
    },
    [router],
  );

  const handlePressRequest = useCallback(
    (requestId: string) => {
      router.push(`/request/${requestId}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FeedEvent>) => (
      <FeedEventCard
        event={item}
        now={now}
        onPressItem={handlePressItem}
        onPressCircle={handlePressCircle}
        onPressRequest={handlePressRequest}
        style={styles.card}
      />
    ),
    [handlePressCircle, handlePressItem, handlePressRequest, now],
  );

  const keyExtractor = useCallback(
    (item: FeedEvent) => getFeedEventKey(item),
    [],
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

    // A plain refetch() re-requests every loaded page sequentially; trim to
    // the first page first so pull-to-refresh costs one request, not N.
    queryClient.setQueryData<InfiniteData<FeedPage, number>>(
      feedKeys.list(),
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
  }, [queryClient, refetch]);

  return (
    <View style={styles.container}>
      <QueryStateView
        empty={{
          message: 'Activity from your circles will show up here.',
          title: 'Nothing here yet',
        }}
        error={error}
        isEmpty={events.length === 0}
        isPending={isPending}
        isRefreshing={isRefreshing}
        isRetrying={isFetching}
        onRefresh={() => void handleRefresh()}
        onRetry={() => void refetch()}
      >
        {isRefetchError ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{describeError(error).title}</Text>
          </View>
        ) : null}
        <FlatList
          contentContainerStyle={styles.listContent}
          data={events}
          keyExtractor={keyExtractor}
          ListFooterComponent={
            <PagingFooter
              hasError={isFetchNextPageError}
              isFetchingNextPage={isFetchingNextPage}
              onRetry={handleRetryNextPage}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          onRefresh={() => void handleRefresh()}
          refreshing={isRefreshing}
          renderItem={renderItem}
          testID="feed-list"
        />
      </QueryStateView>
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
  card: {
    marginBottom: spacing[12],
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  listContent: {
    padding: spacing[16],
  },
});
