import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ItemCard } from '../components/ItemCard';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { SearchField } from '../components/SearchField';
import { SegmentedControl } from '../components/SegmentedControl';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { ItemListPage, ItemSummary, MyItemKind } from '../lib/items';
import { itemKeys } from '../lib/queryKeys';
import { useMyItemsQuery } from '../query/useMyItemsQuery';
import { useRefreshOnFocus } from '../query/useRefreshOnFocus';
import { colors, spacing, typography } from '../theme';

export const SEARCH_DEBOUNCE_MS = 350;

export type MyItemsScreenProps = {
  /** Overridable so tests need not wait out the real debounce. */
  searchDebounceMs?: number;
};

const KIND_OPTIONS: { value: MyItemKind; label: string }[] = [
  { value: 'lending', label: 'Lending' },
  { value: 'active_giveaways', label: 'Giving away' },
  { value: 'past_giveaways', label: 'Given away' },
];

const EMPTY_COPY: Record<MyItemKind, { title: string; message: string }> = {
  lending: {
    title: 'Nothing listed to lend',
    message: 'Items you list for lending show up here.',
  },
  active_giveaways: {
    title: 'No giveaways in progress',
    message: "Items you're giving away show up here until they're claimed.",
  },
  past_giveaways: {
    title: 'Nothing given away recently',
    message: 'Giveaways you handed off in the last 90 days show up here.',
  },
};

function keyExtractor(item: ItemSummary): string {
  return item.id;
}

export function MyItemsScreen({
  searchDebounceMs = SEARCH_DEBOUNCE_MS,
}: MyItemsScreenProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<MyItemKind>('lending');
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearchText = useDebouncedValue(searchText, searchDebounceMs);
  const searchQuery = debouncedSearchText.trim();
  const isSearching = searchQuery !== '';

  const {
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending: isItemsPending,
    isPlaceholderData,
    isRefetching,
    items,
    refetch,
  } = useMyItemsQuery({ kind, q: searchQuery });

  const itemsKey = useMemo(
    () => itemKeys.mine({ kind, q: searchQuery }),
    [kind, searchQuery],
  );

  useRefreshOnFocus(itemsKey);

  const handleListItem = useCallback(() => {
    router.push('/item/new');
  }, [router]);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
  }, []);

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
      itemsKey,
      (current) =>
        current && {
          pages: current.pages.slice(0, 1),
          pageParams: current.pageParams.slice(0, 1),
        },
    );

    void refetch().finally(() => {
      setIsRefreshing(false);
    });
  }, [itemsKey, queryClient, refetch]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ItemSummary>) => {
      // ItemCard is flex: 1, so a lone final card would span the whole row.
      const needsSpacer = items.length % 2 === 1 && index === items.length - 1;

      return (
        <>
          <ItemCard item={item} onPress={handlePressItem} />
          {needsSpacer ? (
            <View style={styles.spacer} testID="my-items-grid-spacer" />
          ) : null}
        </>
      );
    },
    [handlePressItem, items.length],
  );

  const renderEmpty = useCallback(() => {
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

    const copy = EMPTY_COPY[kind];

    return (
      <EmptyState
        actionLabel={kind === 'past_giveaways' ? undefined : 'List an item'}
        message={copy.message}
        onAction={kind === 'past_giveaways' ? undefined : handleListItem}
        title={copy.title}
      />
    );
  }, [handleClearSearch, handleListItem, kind, searchQuery]);

  // A placeholder page that is itself empty is the *previous* query's answer,
  // so it must never be shown as this one's result.
  const isPending = isItemsPending || (isPlaceholderData && items.length === 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My items',
          headerRight: () => (
            <Pressable
              accessibilityLabel="List an item"
              accessibilityRole="button"
              hitSlop={spacing[8]}
              onPress={handleListItem}
            >
              <Icon color={colors.primaryDark} name="plus" size={20} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.segmentRow}>
        <SegmentedControl
          accessibilityLabel="Item kind"
          onChange={setKind}
          options={KIND_OPTIONS}
          value={kind}
        />
      </View>

      <SearchField
        onChangeText={setSearchText}
        onClear={handleClearSearch}
        placeholder="Search my items"
        value={searchText}
      />

      {isPlaceholderData && items.length > 0 ? (
        <View
          accessibilityLabel={isSearching ? 'Searching' : 'Loading'}
          style={styles.searchingRow}
        >
          <ActivityIndicator color={colors.primaryDark} size="small" />
          <Text style={styles.searchingLabel}>
            {isSearching ? 'Searching...' : 'Loading...'}
          </Text>
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
            testID="my-items-list"
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
  spacer: {
    flex: 1,
  },
});
