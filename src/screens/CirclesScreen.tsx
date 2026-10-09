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
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { CircleCard } from '../components/CircleCard';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { OptionSheet } from '../components/OptionSheet';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { SearchField } from '../components/SearchField';
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
import { useProfileQuery } from '../query/useProfileQuery';
import { colors, spacing, typography } from '../theme';

export const SEARCH_DEBOUNCE_MS = 350;

export type CirclesScreenProps = {
  /** Overridable so tests need not wait out the real debounce. */
  searchDebounceMs?: number;
};

const MEMBERSHIP_OPTIONS: { value: CircleMembership; label: string }[] = [
  { value: 'mine', label: 'My circles' },
  { value: 'discoverable', label: 'Discover' },
];

type RadiusOption = 'any' | '5' | '10' | '25' | '50' | '100';

const RADIUS_LABELS: Record<RadiusOption, string> = {
  any: 'Any distance',
  '5': 'Within 5 miles',
  '10': 'Within 10 miles',
  '25': 'Within 25 miles',
  '50': 'Within 50 miles',
  '100': 'Within 100 miles',
};

// Listed explicitly: `Object.keys` would move the numeric keys ahead of `any`.
const RADIUS_VALUES: RadiusOption[] = ['any', '5', '10', '25', '50', '100'];

function toRadius(option: RadiusOption): number | undefined {
  return option === 'any' ? undefined : Number(option);
}

function toRadiusOption(radius: number | undefined): RadiusOption {
  return radius === undefined ? 'any' : (String(radius) as RadiusOption);
}

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
  const [radius, setRadius] = useState<number | undefined>(undefined);
  const [isRadiusSheetOpen, setIsRadiusSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearchText = useDebouncedValue(searchText, searchDebounceMs);
  // Only Discover searches; `mine` is short enough to scan, and the backend
  // applies `q` to both, which would hide circles the member belongs to.
  const searchQuery =
    membership === 'discoverable' ? debouncedSearchText.trim() : '';
  const appliedRadius = membership === 'discoverable' ? radius : undefined;

  // Unknown or failed counts as no location, so distances stay disabled.
  const profile = useProfileQuery();
  const hasLocation = profile.data?.has_location === true;

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
  } = useCirclesQuery({ membership, q: searchQuery, radius: appliedRadius });

  const radiusOption = toRadiusOption(radius);
  const radiusLabel = `Within: ${RADIUS_LABELS[radiusOption].replace(/^Within /, '')}`;

  const radiusOptions = useMemo(
    () =>
      RADIUS_VALUES.map((value) =>
        value === 'any'
          ? {
              value,
              label: RADIUS_LABELS[value],
              hint: hasLocation
                ? undefined
                : 'Set a location on the website to filter by distance.',
            }
          : { value, label: RADIUS_LABELS[value], disabled: !hasLocation },
      ),
    [hasLocation],
  );

  const handleClearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  const handleClearRadius = useCallback(() => {
    setRadius(undefined);
  }, []);

  const handleSelectRadius = useCallback((option: RadiusOption) => {
    setRadius(toRadius(option));
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
      circleKeys.list({ membership, q: searchQuery, radius: appliedRadius }),
      (current) =>
        current && {
          pages: current.pages.slice(0, 1),
          pageParams: current.pageParams.slice(0, 1),
        },
    );

    void refetch().finally(() => {
      setIsRefreshing(false);
    });
  }, [appliedRadius, membership, queryClient, refetch, searchQuery]);

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

    if (radius !== undefined) {
      return (
        <EmptyState
          actionLabel="Search any distance"
          message="Try a larger distance, or search any distance."
          onAction={handleClearRadius}
          title={`No circles within ${radius} miles`}
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
  }, [
    handleClearRadius,
    handleClearSearch,
    handleDiscover,
    membership,
    radius,
    searchQuery,
  ]);

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
        <>
          <SearchField
            onChangeText={setSearchText}
            onClear={handleClearSearch}
            placeholder="Search circles"
            value={searchText}
          />
          <View style={styles.radiusRow}>
            <Pressable
              accessibilityLabel={radiusLabel}
              accessibilityRole="button"
              hitSlop={spacing[8]}
              onPress={() => setIsRadiusSheetOpen(true)}
              style={styles.radiusButton}
              testID="circles-radius-button"
            >
              <Icon color={colors.secondary} name="location" size={14} />
              <Text style={styles.radiusText}>{radiusLabel}</Text>
              <View style={styles.caret}>
                <Icon color={colors.secondary} name="chevron" size={10} />
              </View>
            </Pressable>
            {radius !== undefined ? (
              <Text style={styles.radiusHelper}>
                A distance hides circles that have no location.
              </Text>
            ) : null}
          </View>
          <OptionSheet
            onClose={() => setIsRadiusSheetOpen(false)}
            onSelect={handleSelectRadius}
            options={radiusOptions}
            title="Distance"
            value={radiusOption}
            visible={isRadiusSheetOpen}
          />
        </>
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
  caret: {
    transform: [{ rotate: '90deg' }],
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
  radiusButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing[8],
  },
  radiusHelper: {
    color: colors.secondary,
    ...typography.meta,
  },
  radiusRow: {
    gap: spacing[4],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  radiusText: {
    color: colors.secondary,
    ...typography.itemMeta,
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
