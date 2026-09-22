import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

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
        <ActivityIndicator color={colors.primaryDark} size="small" />
      </View>
    );
  }

  if (!hasError) {
    return null;
  }

  return (
    <View style={styles.footer}>
      <Text style={styles.text}>{ERROR_LABEL}</Text>
      <Pressable
        accessibilityLabel="Try again"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[10],
  },
  buttonLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonSmall,
  },
  footer: {
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[16],
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    color: colors.secondary,
    ...typography.meta,
  },
});
