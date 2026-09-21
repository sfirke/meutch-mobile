import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { describeError, type ErrorCopyOverrides } from '../lib/errorCopy';
import { colors } from '../theme';
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { ErrorState } from './ErrorState';

export type QueryStateViewProps = {
  isPending: boolean;
  error: unknown;
  isEmpty: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  empty?: EmptyStateProps;
  renderEmpty?: () => ReactNode;
  errorOverrides?: ErrorCopyOverrides;
  loadingLabel?: string;
  children: ReactNode;
};

/**
 * Dispatches between loading / error / empty / content for a `useQuery` or
 * `useInfiniteQuery` result, so screens pass plain flags instead of the query
 * object. A failed background refetch or next-page fetch with data already
 * on screen falls through to `children` rather than blanking the list.
 */
export function QueryStateView({
  isPending,
  error,
  isEmpty,
  onRetry,
  isRetrying = false,
  empty,
  renderEmpty,
  errorOverrides,
  loadingLabel = 'Loading',
  children,
}: QueryStateViewProps) {
  if (isPending) {
    return (
      <View accessibilityLabel={loadingLabel} style={styles.center}>
        <ActivityIndicator color={colors.primaryDark} size="large" />
      </View>
    );
  }

  if (error && isEmpty) {
    const { title, message, canRetry } = describeError(error, errorOverrides);

    return (
      <ErrorState
        isRetrying={isRetrying}
        message={message}
        onRetry={canRetry ? onRetry : undefined}
        title={title}
      />
    );
  }

  if (isEmpty) {
    if (renderEmpty) {
      return <>{renderEmpty()}</>;
    }

    return empty ? <EmptyState {...empty} /> : null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
