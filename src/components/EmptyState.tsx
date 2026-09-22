import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

export type EmptyStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Presentational placeholder for a query that resolved with no rows.
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    marginTop: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  actionLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  actionPressed: {
    opacity: 0.7,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[12],
    justifyContent: 'center',
    padding: spacing[24],
  },
  message: {
    color: colors.secondary,
    textAlign: 'center',
    ...typography.body,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    ...typography.value,
  },
});
