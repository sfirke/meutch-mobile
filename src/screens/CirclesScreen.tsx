import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { CircleCard } from '../components/CircleCard';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { SegmentedControl } from '../components/SegmentedControl';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type {
  CircleMembership,
  CirclePage,
  CircleSummary,
} from '../lib/circles';
import { circleKeys } from '../lib/queryKeys';
import { webOnlyNote } from '../lib/webOnly';
import { useCirclesQuery } from '../query/useCirclesQuery';
import { colors, radii, spacing, typography } from '../theme';

export const SEARCH_DEBOUNCE_MS = 350;

export type CirclesScreenProps = {
  /** Overridable so tests need not wait out the real debounce. */
  searchDebounceMs?: number;
};

const MEMBERSHIP_OPTIONS: { value: CircleMembership; label: string }[] = [
  { value: 'mine', label: 'My circles' },
  { value: 'discoverable', label: 'Discover' },
];

function keyExtractor(circle: CircleSummary): string {
  return circle.id;
}

export function CirclesScreen({
  searchDebounceMs = SEARCH_DEBOUNCE_MS,
}: CirclesScreenProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [membership, setMembership] = useState<CircleMembership>('mine');
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearchText = useDebouncedValue(searchText, searchDebounceMs);
  // Only Discover searches; `mine` is short enough to scan, and the backend
  // applies `q` to both, which would hide circles the member belongs to.
  const searchQuery =
    membership === 'discoverable' ? debouncedSearchText.trim() : '';

  const {
    circles,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending: isCirclesPending,
    isPlaceholderData,
    isRefetching,
    refetch,
  } = useCirclesQuery({ membership, q: searchQuery });

  const handleClearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  const handleDiscover = useCallback(() => {
    setMembership('discoverable');
  }, []);

  const handlePressCircle = useCallback(
    (circle: CircleSummary) => {
      router.push(`/circle/${circle.id}`);
    },
    [router],
  );

  const hasNextPageError = isError && circles.length > 0 && hasNextPage;

  const handleEndReached = useCallback(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      !isPlaceholderData &&
      !hasNextPageError
    ) {
      void fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    hasNextPageError,
    isFetchingNextPage,
    isPlaceholderData,
  ]);

  const handleRetryNextPage = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // `refetch()` re-requests every loaded page, so drop the tail first.
    queryClient.setQueryData<InfiniteData<CirclePage>>(
      circleKeys.list({ membership, q: searchQuery }),
      (current) =>
        current && {
          pages: current.pages.slice(0, 1),
          pageParams: current.pageParams.slice(0, 1),
        },
    );

    void refetch().finally(() => {
      setIsRefreshing(false);
    });
  }, [membership, queryClient, refetch, searchQuery]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CircleSummary>) => (
      <CircleCard circle={item} onPress={handlePressCircle} />
    ),
    [handlePressCircle],
  );

  const renderEmpty = useCallback(() => {
    if (membership === 'mine') {
      return (
        <EmptyState
          actionLabel="Find circles"
          message="Circles are the groups you share items with."
          onAction={handleDiscover}
          title="You're not in any circles yet"
        />
      );
    }

    if (searchQuery) {
      return (
        <EmptyState
          actionLabel="Clear search"
          message="Try a different word, or clear the search to see everything again."
          onAction={handleClearSearch}
          title={`No circles match “${searchQuery}”`}
        />
      );
    }

    return (
      <EmptyState
        message={webOnlyNote('Ask a friend for an invitation, or create one')}
        title="No circles to show"
      />
    );
  }, [handleClearSearch, handleDiscover, membership, searchQuery]);

  // A placeholder page that is itself empty is the *previous* query's answer,
  // so it must never be shown as this one's result.
  const isPending =
    isCirclesPending || (isPlaceholderData && circles.length === 0);

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        <SegmentedControl
          accessibilityLabel="Circle lists"
          onChange={setMembership}
          options={MEMBERSHIP_OPTIONS}
          value={membership}
        />
      </View>

      {membership === 'discoverable' ? (
        <View style={styles.searchRow}>
          <View style={styles.inputWrapper}>
            <View style={styles.searchIcon}>
              <Icon color={colors.inputPlaceholder} name="search" size={16} />
            </View>
            <TextInput
              accessibilityLabel="Search circles"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchText}
              placeholder="Search circles"
              placeholderTextColor={colors.inputPlaceholder}
              returnKeyType="search"
              style={styles.input}
              value={searchText}
            />
          </View>
          {searchText.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear"
              accessibilityRole="button"
              onPress={handleClearSearch}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon color={colors.primaryDark} name="clear" size={16} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isPlaceholderData && circles.length > 0 ? (
        <View accessibilityLabel="Searching" style={styles.searchingRow}>
          <ActivityIndicator color={colors.primaryDark} size="small" />
          <Text style={styles.searchingLabel}>Searching...</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <QueryStateView
          error={error}
          isEmpty={circles.length === 0}
          isPending={isPending}
          isRefreshing={isRefreshing}
          isRetrying={isRefetching}
          loadingLabel="Loading circles"
          onRefresh={handleRefresh}
          onRetry={() => {
            void refetch();
          }}
          renderEmpty={renderEmpty}
        >
          <FlatList
            contentContainerStyle={styles.listContent}
            data={circles}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={keyExtractor}
            ListFooterComponent={
              <PagingFooter
                hasError={hasNextPageError}
                isFetchingNextPage={isFetchingNextPage}
                loadingLabel="Loading more circles"
                onRetry={handleRetryNextPage}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                colors={[colors.primaryDark]}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
                tintColor={colors.primaryDark}
              />
            }
            renderItem={renderItem}
            testID="circles-list"
          />
        </QueryStateView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingLeft: spacing[14] * 2 + 16,
    paddingRight: spacing[14],
    paddingVertical: spacing[12],
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    gap: spacing[12],
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[16],
  },
  pressed: {
    opacity: 0.7,
  },
  searchIcon: {
    left: spacing[14],
    position: 'absolute',
    zIndex: 1,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  searchingLabel: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  searchingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    paddingBottom: spacing[8],
    paddingHorizontal: spacing[16],
  },
  segmentRow: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
});
