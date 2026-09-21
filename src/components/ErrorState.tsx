import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

export type ErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
};

// Presentational placeholder for a query that failed with no data to show.
export function ErrorState({
  title,
  message,
  onRetry,
  isRetrying = false,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry ? (
          <Pressable
            accessibilityLabel="Try again"
            accessibilityRole="button"
            accessibilityState={{ busy: isRetrying, disabled: isRetrying }}
            disabled={isRetrying}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              (isRetrying || pressed) && styles.retryButtonPressed,
            ]}
          >
            {isRetrying ? (
              <ActivityIndicator color={colors.onPrimaryText} />
            ) : (
              <Text style={styles.retryLabel}>Try again</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[18],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[24],
  },
  message: {
    color: colors.errorText,
    ...typography.meta,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  retryButtonPressed: {
    opacity: 0.7,
  },
  retryLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  title: {
    color: colors.errorLabel,
    ...typography.label,
  },
});
