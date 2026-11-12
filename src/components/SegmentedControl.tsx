import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, outline, radii, typography } from '../theme';

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
      {options.map((option, index) => {
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
            style={[
              styles.segment,
              index > 0 && styles.divider,
              selected && styles.segmentSelected,
            ]}
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
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderRadius: radii.control,
    borderWidth: outline,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segment: {
    alignItems: 'center',
    backgroundColor: colors.white,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  divider: {
    borderLeftColor: colors.ink,
    borderLeftWidth: outline,
  },
  segmentSelected: {
    backgroundColor: colors.ink,
  },
  label: {
    color: colors.ink,
    textAlign: 'center',
    ...typography.label,
  },
  labelSelected: {
    color: colors.paper,
  },
});
