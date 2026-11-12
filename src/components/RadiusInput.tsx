import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { inputPlaceholderColor, inputStyles, useFocus } from './ui/inputStyles';

const MIN_RADIUS = 1;
const MAX_RADIUS = 50;

// Parses digits out of user input and clamps to the 1-50 digest radius.
export function clampRadius(input: string | number): number {
  const parsed =
    typeof input === 'number' ? Math.trunc(input) : parseInt(input, 10);

  if (Number.isNaN(parsed) || parsed < MIN_RADIUS) {
    return MIN_RADIUS;
  }

  if (parsed > MAX_RADIUS) {
    return MAX_RADIUS;
  }

  return parsed;
}

export type RadiusInputProps = {
  value: number;
  onChange: (miles: number) => void;
  disabled?: boolean;
  label?: string;
};

export function RadiusInput({
  value,
  onChange,
  disabled = false,
  label = 'Digest radius',
}: RadiusInputProps) {
  const focus = useFocus();
  const [text, setText] = useState(String(value));
  // Tracks the value this render's text was derived from, so an external
  // value change can be reflected without an effect (React's documented
  // pattern for adjusting state in response to a prop change).
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(String(value));
  }

  const handleChangeText = (nextText: string) => {
    setText(nextText);

    // Only clamp mid-typing when the digits already form a valid radius,
    // so an in-progress out-of-range number (e.g. "99") isn't rewritten
    // under the member's fingers; that waits for blur.
    const parsed = parseInt(nextText, 10);
    if (
      !Number.isNaN(parsed) &&
      String(parsed) === nextText.trim() &&
      parsed >= MIN_RADIUS &&
      parsed <= MAX_RADIUS &&
      parsed !== value
    ) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    focus.onBlur(undefined);
    const clamped = clampRadius(text);
    setText(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={inputStyles.frame}>
          <TextInput
            accessibilityLabel="Digest radius in miles"
            editable={!disabled}
            keyboardType="number-pad"
            maxLength={2}
            onBlur={handleBlur}
            onChangeText={handleChangeText}
            onEndEditing={handleBlur}
            onFocus={focus.onFocus}
            placeholderTextColor={inputPlaceholderColor}
            style={[
              inputStyles.input,
              styles.input,
              focus.focused && inputStyles.focused,
              disabled && inputStyles.disabled,
            ]}
            value={text}
          />
          {focus.focused ? (
            <View pointerEvents="none" style={inputStyles.ring} />
          ) : null}
        </View>
        <Text style={[styles.unit, disabled && styles.dimmed]}>miles</Text>
      </View>
      <Text style={styles.hint}>1 to 50 miles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dimmed: {
    opacity: 0.5,
  },
  hint: {
    ...inputStyles.help,
    marginTop: spacing[4],
  },
  input: {
    minWidth: 64,
  },
  label: {
    ...inputStyles.label,
    marginBottom: spacing[8],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  unit: {
    color: colors.ink,
    ...typography.body,
  },
});
