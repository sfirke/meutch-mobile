import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { parseCalendarDate } from '../lib/dates';
import { spacing } from '../theme';
import type { DateFieldProps } from './DateField';
import { FieldError } from './FieldError';
import { inputPlaceholderColor, inputStyles, useFocus } from './ui/inputStyles';

export type { DateFieldProps } from './DateField';

// Web is only the screenshot target: a plain `YYYY-MM-DD` text input that
// commits once the text parses, so partial typing never clears the value.
export function DateField({
  label,
  value,
  onChange,
  error,
  disabled = false,
  field,
}: DateFieldProps) {
  const [text, setText] = useState(value ?? '');
  const focus = useFocus();

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={inputStyles.frame}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          editable={!disabled}
          onBlur={focus.onBlur}
          onFocus={focus.onFocus}
          onChangeText={(next) => {
            setText(next);
            if (parseCalendarDate(next)) {
              onChange(next);
            }
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={inputPlaceholderColor}
          style={[
            inputStyles.input,
            focus.focused && inputStyles.focused,
            disabled && inputStyles.disabled,
            error ? inputStyles.error : null,
          ]}
          testID={`date-field-${field}`}
          value={text}
        />
        {focus.focused ? (
          <View pointerEvents="none" style={inputStyles.ring} />
        ) : null}
      </View>
      <FieldError field={field} message={error ?? undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...inputStyles.label,
    marginBottom: spacing[8],
  },
});
