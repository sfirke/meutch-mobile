import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { PagingFooter } from '../components/PagingFooter';
import { QueryStateView } from '../components/QueryStateView';
import { RequestRow } from '../components/RequestRow';
import { SegmentedControl } from '../components/SegmentedControl';
import { requestKeys } from '../lib/queryKeys';
import type {
  MyRequestStatus,
  RequestListPage,
  RequestSummary,
} from '../lib/requests';
import { webOnlyNote } from '../lib/webOnly';
import { useMyRequestsQuery } from '../query/useMyRequestsQuery';
import { useRefreshOnFocus } from '../query/useRefreshOnFocus';
import { colors, spacing } from '../theme';

const SEGMENTS: { value: MyRequestStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'fulfilled', label: 'Fulfilled' },
];

const EMPTY_COPY: Record<MyRequestStatus, { title: string; message: string }> =
  {
    active: {
      title: 'No active requests',
      message: `Things you're looking for show up here while they're open. ${webOnlyNote('Post a request')}`,
    },
    fulfilled: {
      title: 'Nothing fulfilled recently',
      message:
        'Requests you marked fulfilled in the last 90 days show up here.',
    },
  };

function keyExtractor(request: RequestSummary): string {
  return request.id;
}

export function MyRequestsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MyRequestStatus>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
    refetch,
    requests,
  } = useMyRequestsQuery(status);
  const requestsKey = useMemo(() => requestKeys.mine({ status }), [status]);

  useRefreshOnFocus(requestsKey);

  // Captured once so every row renders against the same instant.
  const now = useMemo(() => new Date(), []);

  const handlePressRequest = useCallback(
    (request: RequestSummary) => {
      router.push(`/request/${request.id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RequestSummary>) => (
      <RequestRow now={now} onPress={handlePressRequest} request={item} />
    ),
    [handlePressRequest, now],
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

    // refetch() re-requests every loaded page; trim to the first.
    queryClient.setQueryData<InfiniteData<RequestListPage, number>>(
      requestsKey,
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
  }, [queryClient, refetch, requestsKey]);

  const onRefresh = () => void handleRefresh();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My requests' }} />
      <View style={styles.segments}>
        <SegmentedControl
          accessibilityLabel="Request status"
          onChange={setStatus}
          options={SEGMENTS}
          value={status}
        />
      </View>

      <View style={styles.body}>
        <QueryStateView
          empty={EMPTY_COPY[status]}
          error={error}
          isEmpty={requests.length === 0}
          isPending={isPending}
          isRefreshing={isRefreshing}
          isRetrying={isFetching}
          loadingLabel="Loading requests"
          onRefresh={onRefresh}
          onRetry={() => void refetch()}
        >
          <FlatList
            data={requests}
            keyExtractor={keyExtractor}
            ListFooterComponent={
              <PagingFooter
                hasError={isFetchNextPageError}
                isFetchingNextPage={isFetchingNextPage}
                loadingLabel="Loading more requests"
                onRetry={handleRetryNextPage}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            onRefresh={onRefresh}
            refreshing={isRefreshing}
            renderItem={renderItem}
            testID="my-requests-list"
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
  segments: {
    paddingBottom: spacing[8],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
});
