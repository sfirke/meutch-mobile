import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import {
  BrowseFilterSheet,
  countActiveBrowseFilters,
  DEFAULT_BROWSE_FILTERS,
  type BrowseFilters,
} from '../components/BrowseFilterSheet';
import { EmptyState } from '../components/EmptyState';
import { FilterToolbar } from '../components/FilterToolbar';
import { ItemCard } from '../components/ItemCard';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { SearchField } from '../components/SearchField';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { ItemListPage, ItemSort, ItemSummary } from '../lib/items';
import { circleKeys, itemKeys, type ItemListFilters } from '../lib/queryKeys';
import { useHasCirclesQuery } from '../query/useHasCirclesQuery';
import { useItemsQuery } from '../query/useItemsQuery';
import { useProfileQuery } from '../query/useProfileQuery';
import { colors, spacing, typography } from '../theme';

export const SEARCH_DEBOUNCE_MS = 350;

const SORT_LABELS: Record<ItemSort, string> = {
  date: 'Newest first',
  distance: 'Closest first',
};

export type BrowseScreenProps = {
  /** Overridable so tests need not wait out the real debounce. */
  searchDebounceMs?: number;
};

function dedupeItems(
  data: InfiniteData<ItemListPage> | undefined,
): ItemSummary[] {
  const seen = new Set<string>();
  const unique: ItemSummary[] = [];

  // Offset pagination over live data can repeat a row across pages.
  for (const page of data?.pages ?? []) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
  }

  return unique;
}

function keyExtractor(item: ItemSummary): string {
  return item.id;
}

export function BrowseScreen({
  searchDebounceMs = SEARCH_DEBOUNCE_MS,
}: BrowseScreenProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_BROWSE_FILTERS);
  const [sort, setSort] = useState<ItemSort>('date');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearchText = useDebouncedValue(searchText, searchDebounceMs);
  const searchQuery = debouncedSearchText.trim();
  const activeFilterCount = countActiveBrowseFilters(filters);

  // One object for both the query and the refresh's cache key, so they match.
  const listFilters = useMemo<ItemListFilters>(
    () => ({
      q: searchQuery,
      categories: filters.categories,
      circles: filters.circles,
      itemType: filters.itemType,
      sort,
    }),
    [filters, searchQuery, sort],
  );

  // Unknown or failed counts as no location, so distance stays disabled.
  const profile = useProfileQuery();
  const hasLocation = profile.data?.has_location === true;
  // The hint waits for the profile, so a member with a location never sees it.
  const noLocationHint =
    profile.data?.has_location === false
      ? 'Add a location on your profile to sort by distance.'
      : undefined;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending: isItemsPending,
    isPlaceholderData,
    isRefetching,
    isSuccess,
    refetch,
  } = useItemsQuery(listFilters);

  const items = useMemo(() => dedupeItems(data), [data]);

  // `/items` returns an empty page both for "you are in no circles" and for
  // "nothing matched", and never says which, so the circle probe runs only
  // when the list comes back empty — never inferred from the empty list.
  const needsCirclesCheck =
    isSuccess && !isPlaceholderData && items.length === 0;
  const circlesQuery = useHasCirclesQuery({ enabled: needsCirclesCheck });
  const isCirclesCheckPending = needsCirclesCheck && circlesQuery.isPending;
  // A failed probe falls back to the plain no-results copy rather than an
  // error screen: guessing "no circles" wrongly is the worse mistake.
  const hasCircles = circlesQuery.isError ? true : circlesQuery.data;

  const handleClearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_BROWSE_FILTERS);
  }, []);

  const handleOpenFilters = useCallback(() => {
    setIsSheetOpen(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const handleApplyFilters = useCallback((next: BrowseFilters) => {
    setFilters(next);
    setIsSheetOpen(false);
  }, []);

  const sortOptions = useMemo(
    () => [
      { value: 'date' as const, label: SORT_LABELS.date },
      {
        value: 'distance' as const,
        label: SORT_LABELS.distance,
        disabled: !hasLocation,
        hint: noLocationHint,
      },
    ],
    [hasLocation, noLocationHint],
  );

  const handlePressItem = useCallback(
    (item: ItemSummary) => {
      router.push(`/item/${item.id}`);
    },
    [router],
  );

  const hasNextPageError = isError && items.length > 0 && hasNextPage;

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
    queryClient.setQueryData<InfiniteData<ItemListPage>>(
      itemKeys.list(listFilters),
      (current) =>
        current && {
          pages: current.pages.slice(0, 1),
          pageParams: current.pageParams.slice(0, 1),
        },
    );
    // The circle probe stays fresh for minutes; a pull should re-ask it too,
    // in case the member joined a circle elsewhere.
    void queryClient.invalidateQueries({ queryKey: circleKeys.hasAny() });

    void refetch().finally(() => {
      setIsRefreshing(false);
    });
  }, [listFilters, queryClient, refetch]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ItemSummary>) => {
      // ItemCard is flex: 1, so a lone final card would span the whole row.
      const needsSpacer = items.length % 2 === 1 && index === items.length - 1;

      return (
        <>
          <ItemCard item={item} onPress={handlePressItem} />
          {needsSpacer ? (
            <View style={styles.spacer} testID="browse-grid-spacer" />
          ) : null}
        </>
      );
    },
    [handlePressItem, items.length],
  );

  const renderEmpty = useCallback(() => {
    if (hasCircles === false) {
      return (
        <EmptyState
          actionLabel="Find circles"
          message="Items on Meutch are shared inside circles. Once you belong to one, everything its members are sharing shows up here."
          onAction={() => router.navigate('/circles')}
          title="Join a circle to see items"
        />
      );
    }

    if (activeFilterCount > 0) {
      return (
        <EmptyState
          actionLabel="Clear filters"
          message="Try different filters, or clear them."
          onAction={handleClearFilters}
          title="No items match these filters"
        />
      );
    }

    if (searchQuery) {
      return (
        <EmptyState
          actionLabel="Clear search"
          message="Try a different word, or clear the search to see everything again."
          onAction={handleClearSearch}
          title={`No items match “${searchQuery}”`}
        />
      );
    }

    return (
      <EmptyState
        message="Nobody in your circles is sharing an item right now. Check back soon."
        title="Nothing to borrow yet"
      />
    );
  }, [
    activeFilterCount,
    handleClearFilters,
    handleClearSearch,
    hasCircles,
    router,
    searchQuery,
  ]);

  // A placeholder page that is itself empty is the *previous* search's answer,
  // so it must never be shown as this one's result.
  const isPending =
    isItemsPending ||
    (isPlaceholderData && items.length === 0) ||
    isCirclesCheckPending;

  return (
    <View style={styles.container}>
      <SearchField
        onChangeText={setSearchText}
        onClear={handleClearSearch}
        placeholder="Search items"
        value={searchText}
      />

      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onOpenFilters={handleOpenFilters}
        sort={{ value: sort, options: sortOptions, onChange: setSort }}
      />

      {isPlaceholderData && items.length > 0 ? (
        <View accessibilityLabel="Updating" style={styles.updatingRow}>
          <ActivityIndicator color={colors.primaryDark} size="small" />
          <Text style={styles.updatingLabel}>Updating...</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <QueryStateView
          error={error}
          isEmpty={items.length === 0}
          isPending={isPending}
          isRefreshing={isRefreshing}
          isRetrying={isRefetching}
          loadingLabel="Loading items"
          onRefresh={handleRefresh}
          onRetry={() => {
            void refetch();
          }}
          renderEmpty={renderEmpty}
        >
          <FlatList
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            data={items}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={keyExtractor}
            ListFooterComponent={
              <PagingFooter
                hasError={hasNextPageError}
                isFetchingNextPage={isFetchingNextPage}
                loadingLabel="Loading more items"
                onRetry={handleRetryNextPage}
              />
            }
            numColumns={2}
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
            testID="browse-list"
          />
        </QueryStateView>
      </View>

      <BrowseFilterSheet
        filters={filters}
        onApply={handleApplyFilters}
        onClose={handleCloseFilters}
        visible={isSheetOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  columnWrapper: {
    gap: spacing[12],
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  listContent: {
    gap: spacing[12],
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[16],
  },
  spacer: {
    flex: 1,
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
