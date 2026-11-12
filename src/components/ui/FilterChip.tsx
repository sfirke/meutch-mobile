import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, outline, radii, typography } from '../../theme';

export type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** `checkbox` for multi-select rows, `radio` for single-select ones. */
  role?: 'checkbox' | 'radio';
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// The pressable is 44 tall; the pill sits centered inside it.
export function FilterChip({
  label,
  selected,
  onPress,
  role = 'checkbox',
  accessibilityLabel,
  disabled = false,
  style,
  testID,
}: FilterChipProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.target, style]}
      testID={testID}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.pill,
            selected && styles.pillSelected,
            pressed && !selected && styles.pillPressed,
            disabled && styles.disabled,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.label, selected && styles.labelSelected]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: 44, justifyContent: 'center' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: outline,
    borderColor: colors.line,
    borderRadius: radii.pill,
    backgroundColor: colors.cardPaper,
  },
  pillSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  // The web's hover border.
  pillPressed: { borderColor: colors.ink },
  disabled: { opacity: 0.5 },
  label: { ...typography.label, color: colors.ink },
  labelSelected: { color: colors.paper },
});
