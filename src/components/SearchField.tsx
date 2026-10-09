import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder: string;
  accessibilityLabel?: string;
};

// Search input with a leading icon and a Clear button once text is entered.
export function SearchField({
  value,
  onChangeText,
  onClear,
  placeholder,
  accessibilityLabel,
}: SearchFieldProps) {
  return (
    <View style={styles.row}>
      <View style={styles.inputWrapper}>
        <View style={styles.icon}>
          <Icon color={colors.inputPlaceholder} name="search" size={16} />
        </View>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          returnKeyType="search"
          style={styles.input}
          value={value}
        />
      </View>
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear"
          accessibilityRole="button"
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon color={colors.primaryDark} name="clear" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
  },
  icon: {
    left: spacing[14],
    position: 'absolute',
    zIndex: 1,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingLeft: spacing[14] * 2 + 16,
    paddingRight: spacing[14],
    paddingVertical: spacing[12],
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
});
