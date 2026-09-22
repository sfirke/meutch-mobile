import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ItemCard } from '../components/ItemCard';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { ItemListPage, ItemSummary } from '../lib/items';
import { itemKeys } from '../lib/queryKeys';
import { useHasCirclesQuery } from '../query/useHasCirclesQuery';
import { useItemsQuery } from '../query/useItemsQuery';
import { colors, radii, spacing, typography } from '../theme';

export const SEARCH_DEBOUNCE_MS = 350;

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearchText = useDebouncedValue(searchText, searchDebounceMs);
  const searchQuery = debouncedSearchText.trim();

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
  } = useItemsQuery({ q: searchQuery });

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
      itemKeys.list({ q: searchQuery }),
      (current) =>
        current && {
          pages: current.pages.slice(0, 1),
          pageParams: current.pageParams.slice(0, 1),
        },
    );

    void refetch().finally(() => {
      setIsRefreshing(false);
    });
  }, [queryClient, refetch, searchQuery]);

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
  }, [handleClearSearch, hasCircles, router, searchQuery]);

  // A placeholder page that is itself empty is the *previous* search's answer,
  // so it must never be shown as this one's result.
  const isPending =
    isItemsPending ||
    (isPlaceholderData && items.length === 0) ||
    isCirclesCheckPending;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <View style={styles.searchIcon}>
            <Icon color={colors.inputPlaceholder} name="search" size={16} />
          </View>
          <TextInput
            accessibilityLabel="Search items"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchText}
            placeholder="Search items"
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

      {isPlaceholderData && items.length > 0 ? (
        <View accessibilityLabel="Searching" style={styles.searchingRow}>
          <ActivityIndicator color={colors.primaryDark} size="small" />
          <Text style={styles.searchingLabel}>Searching...</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <QueryStateView
          error={error}
          isEmpty={items.length === 0}
          isPending={isPending}
          isRetrying={isRefetching}
          loadingLabel="Loading items"
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
  columnWrapper: {
    gap: spacing[12],
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
  spacer: {
    flex: 1,
  },
});
