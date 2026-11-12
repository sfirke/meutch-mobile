import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { spacing } from '../theme';
import { FieldError } from './FieldError';
import { inputPlaceholderColor, inputStyles, useFocus } from './ui/inputStyles';

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
  onFocus,
  onBlur,
  ...inputProps
}: FormTextFieldProps) {
  const focus = useFocus(onFocus, onBlur);
  const disabled = inputProps.editable === false;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={inputStyles.frame}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={inputPlaceholderColor}
          testID={`field-${field}`}
          {...inputProps}
          onBlur={focus.onBlur}
          onChangeText={onChangeText}
          onFocus={focus.onFocus}
          style={[
            inputStyles.input,
            focus.focused && inputStyles.focused,
            disabled && inputStyles.disabled,
            error ? inputStyles.error : null,
            style,
          ]}
          value={value}
        />
        {focus.focused ? (
          <View pointerEvents="none" style={inputStyles.ring} />
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <FieldError field={field} message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...inputStyles.label, marginBottom: spacing[8] },
  hint: { ...inputStyles.help, marginTop: spacing[4] },
});
