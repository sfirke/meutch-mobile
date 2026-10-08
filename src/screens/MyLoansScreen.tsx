import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  View,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';

import { LoanRow } from '../components/LoanRow';
import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { SegmentedControl } from '../components/SegmentedControl';
import type { LoanActivity, LoanListPage, LoanRole } from '../lib/loans';
import { loanKeys } from '../lib/queryKeys';
import { useMyLoansQuery } from '../query/useMyLoansQuery';
import { useRefreshOnFocus } from '../query/useRefreshOnFocus';
import { colors, spacing, typography } from '../theme';

type LoanSection = { title: string; data: LoanActivity[] };

const SEGMENTS: { value: LoanRole; label: string }[] = [
  { value: 'borrowing', label: 'Borrowing' },
  { value: 'lending', label: 'Lending' },
];

const EMPTY_COPY: Record<LoanRole, { title: string; message: string }> = {
  borrowing: {
    title: 'Nothing borrowed right now',
    message:
      "Items you've asked to borrow, and loans you have out, show up here.",
  },
  lending: {
    title: 'Nothing lent out right now',
    message: "Requests for your items, and items you've lent, show up here.",
  },
};

function keyExtractor(loan: LoanActivity): string {
  return loan.id;
}

// The server sends pending loans first, so grouping keeps its order.
function buildSections(loans: LoanActivity[]): LoanSection[] {
  const requests = loans.filter((loan) => loan.status === 'pending');
  const onLoan = loans.filter((loan) => loan.status !== 'pending');

  return [
    { title: 'Requests', data: requests },
    { title: 'On loan', data: onLoan },
  ].filter((section) => section.data.length > 0);
}

export function MyLoansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<LoanRole>('borrowing');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
    loans,
    refetch,
  } = useMyLoansQuery(role);
  const listKey = useMemo(() => loanKeys.list({ role }), [role]);

  useRefreshOnFocus(listKey);

  const sections = useMemo(() => buildSections(loans), [loans]);

  const handlePressLoan = useCallback(
    (loan: LoanActivity) => {
      router.push(`/loan/${loan.id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<LoanActivity, LoanSection>) => (
      <LoanRow loan={item} onPress={handlePressLoan} role={role} />
    ),
    [handlePressLoan, role],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<LoanActivity, LoanSection> }) => (
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {section.title}
        </Text>
      </View>
    ),
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

    // Trim to the first page so pull-to-refresh costs one request, not N.
    queryClient.setQueryData<InfiniteData<LoanListPage, number>>(
      loanKeys.list({ role }),
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
  }, [queryClient, refetch, role]);

  const onRefresh = () => void handleRefresh();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My loans' }} />
      <View style={styles.segments}>
        <SegmentedControl
          accessibilityLabel="Loan role"
          onChange={setRole}
          options={SEGMENTS}
          value={role}
        />
      </View>

      <View style={styles.body}>
        <QueryStateView
          empty={EMPTY_COPY[role]}
          error={error}
          isEmpty={loans.length === 0}
          isPending={isPending}
          isRefreshing={isRefreshing}
          isRetrying={isFetching}
          loadingLabel="Loading loans"
          onRefresh={onRefresh}
          onRetry={() => void refetch()}
        >
          <SectionList
            keyExtractor={keyExtractor}
            ListFooterComponent={
              <PagingFooter
                hasError={isFetchNextPageError}
                isFetchingNextPage={isFetchingNextPage}
                loadingLabel="Loading more loans"
                onRetry={handleRetryNextPage}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            onRefresh={onRefresh}
            refreshing={isRefreshing}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            sections={sections}
            stickySectionHeadersEnabled={false}
            testID="my-loans-list"
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
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  sectionTitle: {
    color: colors.secondary,
    ...typography.label,
  },
  segments: {
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
});
