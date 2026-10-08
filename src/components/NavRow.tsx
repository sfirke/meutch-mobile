import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';

export type NavRowProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

// Tappable row with a leading icon, a label, and a trailing chevron.
export function NavRow({
  icon,
  label,
  onPress,
  accessibilityLabel,
  testID,
}: NavRowProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      <Icon color={colors.secondary} name={icon} />
      <Text style={styles.label}>{label}</Text>
      <Icon color={colors.secondary} name="chevron" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    flex: 1,
    ...typography.body,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
});
