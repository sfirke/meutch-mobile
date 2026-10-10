import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { FieldError } from './FieldError';

export type FormTextFieldProps = Omit<
  TextInputProps,
  'value' | 'onChangeText'
> & {
  label: string;
  // Names the input testID (`field-${field}`) and the FieldError testID.
  field: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  // Helper text under the input, above the error.
  hint?: string;
};

export function FormTextField({
  label,
  field,
  value,
  onChangeText,
  error,
  hint,
  style,
  ...inputProps
}: FormTextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inputPlaceholder}
        testID={`field-${field}`}
        {...inputProps}
        onChangeText={onChangeText}
        style={[styles.input, error ? styles.inputError : null, style]}
        value={value}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <FieldError field={field} message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  label: {
    color: colors.secondary,
    ...typography.label,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
  },
  inputError: {
    borderColor: colors.warning,
  },
  hint: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
});
