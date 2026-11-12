import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { parseCalendarDate } from '../lib/dates';
import { colors, radii, spacing, typography } from '../theme';
import type { DateFieldProps } from './DateField';
import { FieldError } from './FieldError';

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

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        editable={!disabled}
        onChangeText={(next) => {
          setText(next);
          if (parseCalendarDate(next)) {
            onChange(next);
          }
        }}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.inputPlaceholder}
        style={[styles.input, disabled && styles.dim]}
        testID={`date-field-${field}`}
        value={text}
      />
      <FieldError field={field} message={error ?? undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    opacity: 0.6,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    ...typography.body,
  },
  label: {
    color: colors.secondary,
    ...typography.label,
  },
  root: {
    gap: spacing[8],
  },
});
