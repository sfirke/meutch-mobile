import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

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
    const clamped = clampRadius(text);
    setText(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Digest radius in miles"
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={2}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          onEndEditing={handleBlur}
          style={styles.input}
          value={text}
        />
        <Text style={styles.unit}>miles</Text>
      </View>
      <Text style={styles.hint}>1 to 50 miles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  hint: {
    color: colors.secondary,
    ...typography.meta,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    minWidth: 56,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    ...typography.body,
  },
  label: {
    color: colors.text,
    ...typography.label,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  unit: {
    color: colors.text,
    ...typography.body,
  },
});
