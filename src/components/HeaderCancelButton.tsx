import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { MIN_TAP_TARGET } from './ui/Button';

type HeaderCancelButtonProps = {
  onPress: () => void;
};

/** Header "Cancel" for a form screen, where it reads clearer than a back arrow. */
export function HeaderCancelButton({ onPress }: HeaderCancelButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={{ left: spacing[8], right: spacing[8] }}
      onPress={onPress}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      <Text style={styles.label}>Cancel</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minHeight: MIN_TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  pressed: { backgroundColor: colors.tealWash, borderRadius: radii.control },
  label: {
    ...typography.button,
    color: colors.tealDeep,
  },
});
