import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../theme';

type HeaderCancelButtonProps = {
  onPress: () => void;
};

/** Header "Cancel" for a form screen, where it reads clearer than a back arrow. */
export function HeaderCancelButton({ onPress }: HeaderCancelButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing[8]}
      onPress={onPress}
    >
      <Text style={styles.label}>Cancel</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.body,
    color: colors.primaryDark,
  },
});
