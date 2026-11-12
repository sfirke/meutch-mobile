import { StyleSheet, Text, View } from 'react-native';

import { colors, outline, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';
import { Button } from './ui/Button';

export type EmptyStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: IconName;
};

// Presentational placeholder for a query that resolved with no rows.
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon = 'inbox',
}: EmptyStateProps) {
  const hasAction = actionLabel && onAction;
  const hasSecondary = secondaryActionLabel && onSecondaryAction;

  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Icon color={colors.ink} name={icon} size={24} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {hasAction || hasSecondary ? (
        <View style={styles.actions}>
          {hasAction ? (
            <Button label={actionLabel} onPress={onAction} variant="primary" />
          ) : null}
          {hasSecondary ? (
            <Button
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="outline"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    columnGap: spacing[12],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing[8],
    rowGap: spacing[8],
  },
  circle: {
    alignItems: 'center',
    backgroundColor: colors.tangerineWash,
    borderColor: colors.ink,
    borderRadius: 32,
    borderWidth: outline,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
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
  title: {
    color: colors.ink,
    textAlign: 'center',
    ...typography.h3,
  },
});
