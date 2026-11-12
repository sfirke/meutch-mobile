import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Button } from './ui/Button';

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
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          label="Try again"
          loading={isRetrying}
          onPress={onRetry}
          style={styles.retry}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[12],
    justifyContent: 'center',
    padding: spacing[24],
  },
  message: {
    color: colors.muted,
    textAlign: 'center',
    ...typography.body,
  },
  retry: {
    marginTop: spacing[8],
  },
  title: {
    color: colors.ink,
    textAlign: 'center',
    ...typography.h3,
  },
});
