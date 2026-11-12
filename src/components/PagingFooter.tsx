import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Button } from './ui/Button';

const ERROR_LABEL = "Couldn't load more";

export type PagingFooterProps = {
  isFetchingNextPage: boolean;
  hasError: boolean;
  onRetry: () => void;
  loadingLabel?: string;
};

// List footer for infinite lists: a spinner while the next page loads, and an
// inline retry when it fails so the rows already on screen stay put.
export function PagingFooter({
  isFetchingNextPage,
  hasError,
  onRetry,
  loadingLabel = 'Loading more',
}: PagingFooterProps) {
  if (isFetchingNextPage) {
    return (
      <View accessibilityLabel={loadingLabel} style={styles.footer}>
        <ActivityIndicator color={colors.tealDeep} size="small" />
      </View>
    );
  }

  if (!hasError) {
    return null;
  }

  return (
    <View style={styles.footer}>
      <Text style={styles.text}>{ERROR_LABEL}</Text>
      <Button label="Try again" onPress={onRetry} size="sm" variant="outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[16],
  },
  text: {
    color: colors.muted,
    ...typography.meta,
  },
});
