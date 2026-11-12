import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Icon } from './Icon';
import { inputPlaceholderColor, inputStyles, useFocus } from './ui/inputStyles';

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
  const focus = useFocus();

  return (
    <View style={styles.row}>
      <View style={[inputStyles.frame, styles.inputWrapper]}>
        <View pointerEvents="none" style={styles.icon}>
          <Icon color={colors.muted} name="search" size={16} />
        </View>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          onBlur={focus.onBlur}
          onChangeText={onChangeText}
          onFocus={focus.onFocus}
          placeholder={placeholder}
          placeholderTextColor={inputPlaceholderColor}
          returnKeyType="search"
          style={[
            inputStyles.input,
            styles.input,
            focus.focused && inputStyles.focused,
          ]}
          value={value}
        />
        {focus.focused ? (
          <View pointerEvents="none" style={inputStyles.ring} />
        ) : null}
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
          <Icon color={colors.ink} name="clear" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  icon: {
    left: spacing[14],
    position: 'absolute',
    zIndex: 1,
  },
  input: {
    minHeight: 44,
    paddingLeft: spacing[14] * 2 + 16,
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
    gap: spacing[4],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
});
