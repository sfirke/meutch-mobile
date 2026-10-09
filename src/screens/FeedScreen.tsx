import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { FeedEventCard } from '../components/FeedEventCard';
import {
  countActiveFeedFilters,
  DEFAULT_FEED_FILTERS,
  FeedFilterSheet,
  type FeedFilters,
} from '../components/FeedFilterSheet';
import { FilterToolbar } from '../components/FilterToolbar';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { describeError } from '../lib/errorCopy';
import type { FeedEvent, FeedPage } from '../lib/feed';
import { feedKeys, type FeedListFilters } from '../lib/queryKeys';
import { getFeedEventKey, useFeedQuery } from '../query/useFeedQuery';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

export function FeedScreen() {
  const { authenticatedApiFetch } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const activeFilterCount = countActiveFeedFilters(filters);

  // One object for both the query and the refresh's cache key, so they match.
  const listFilters = useMemo<FeedListFilters>(
    () => ({
      scope: filters.scope,
      types: filters.types,
      distance: filters.distance,
      showOwnActivity: filters.showOwnActivity,
      showClaimedGiveaways: filters.showClaimedGiveaways,
    }),
    [filters],
  );

  const {
    error,
    events,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending: isFeedPending,
    isPlaceholderData,
    isRefetchError,
    refetch,
  } = useFeedQuery(authenticatedApiFetch, listFilters);

  // Captured once, not per row, so every visible card renders relative
  // times against the same instant instead of each computing its own.
  const now = useMemo(() => new Date(), []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FEED_FILTERS);
  }, []);

  const handleOpenFilters = useCallback(() => {
    setIsSheetOpen(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const handleApplyFilters = useCallback((next: FeedFilters) => {
    setFilters(next);
    setIsSheetOpen(false);
  }, []);

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
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      !isPlaceholderData &&
      !isFetchNextPageError
    ) {
      void fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isPlaceholderData,
  ]);

  const handleRetryNextPage = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // A plain refetch() re-requests every loaded page sequentially; trim to
    // the first page first so pull-to-refresh costs one request, not N.
    queryClient.setQueryData<InfiniteData<FeedPage, number>>(
      feedKeys.list(listFilters),
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
  }, [listFilters, queryClient, refetch]);

  const renderEmpty = useCallback(() => {
    if (activeFilterCount > 0) {
      return (
        <EmptyState
          actionLabel="Clear filters"
          message="Try different filters, or clear them to see everything again."
          onAction={handleClearFilters}
          title="No activity matches these filters"
        />
      );
    }

    return (
      <EmptyState
        message="Activity from your circles will show up here."
        title="Nothing here yet"
      />
    );
  }, [activeFilterCount, handleClearFilters]);

  // A placeholder page that is itself empty is the *previous* filters' answer,
  // so it must never be shown as this one's result.
  const isPending = isFeedPending || (isPlaceholderData && events.length === 0);

  return (
    <View style={styles.container}>
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onOpenFilters={handleOpenFilters}
      />

      {isPlaceholderData && events.length > 0 ? (
        <View accessibilityLabel="Updating" style={styles.updatingRow}>
          <ActivityIndicator color={colors.primaryDark} size="small" />
          <Text style={styles.updatingLabel}>Updating...</Text>
        </View>
      ) : null}

      <QueryStateView
        error={error}
        isEmpty={events.length === 0}
        isPending={isPending}
        isRefreshing={isRefreshing}
        isRetrying={isFetching}
        onRefresh={() => void handleRefresh()}
        onRetry={() => void refetch()}
        renderEmpty={renderEmpty}
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

      <FeedFilterSheet
        filters={filters}
        onApply={handleApplyFilters}
        onClose={handleCloseFilters}
        visible={isSheetOpen}
      />
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
  updatingLabel: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  updatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    paddingBottom: spacing[8],
    paddingHorizontal: spacing[16],
  },
});
