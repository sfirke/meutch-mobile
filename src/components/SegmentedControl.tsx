import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type Segment<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

// Generic tab-style switch, e.g. inbox/archived or my circles/discover.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={styles.row}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => {
              if (!selected) {
                onChange(option.value);
              }
            }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing[4],
    padding: spacing[4],
  },
  segment: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    flex: 1,
    paddingVertical: spacing[8],
  },
  segmentSelected: {
    backgroundColor: colors.primaryDark,
  },
  label: {
    color: colors.text,
    ...typography.label,
  },
  labelSelected: {
    color: colors.onPrimaryText,
  },
});
