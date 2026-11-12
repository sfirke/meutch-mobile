import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

export type SwitchRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
};

// Labelled row for a boolean setting, used across the settings form.
export function SwitchRow({
  label,
  value,
  onValueChange,
  disabled = false,
  description,
}: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={[styles.label, disabled && styles.dimmed]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, disabled && styles.dimmed]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityState={disabled ? { disabled: true } : undefined}
        disabled={disabled}
        onValueChange={onValueChange}
        ios_backgroundColor={colors.line}
        thumbColor={colors.white}
        trackColor={{ false: colors.line, true: colors.tealDeep }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing[4],
    paddingRight: spacing[12],
  },
  description: {
    color: colors.muted,
    ...typography.meta,
  },
  dimmed: {
    opacity: 0.6,
  },
  label: {
    color: colors.ink,
    ...typography.body,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[12],
  },
});
