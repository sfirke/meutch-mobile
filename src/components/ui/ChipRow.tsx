import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FilterChip } from './FilterChip';

export type ChipOption<T extends string> = { value: T; label: string };

/** True when nothing or every option is selected: both read as Everything. */
export function isEverythingSelected<T>(
  selected: readonly T[],
  all: readonly T[],
): boolean {
  return (
    selected.length === 0 || all.every((value) => selected.includes(value))
  );
}

/**
 * The next selection after tapping `tapped` (`null` is the Everything chip).
 * From Everything a chip selects just itself; after that chips toggle; turning
 * off the last chip or turning on every chip returns to Everything, which is
 * returned as the full list in `all` order.
 */
export function nextChipSelection<T>(
  selected: readonly T[],
  tapped: T | null,
  all: readonly T[],
): T[] {
  if (tapped === null) {
    return [...all];
  }
  if (isEverythingSelected(selected, all)) {
    return [tapped];
  }
  const next = selected.includes(tapped)
    ? selected.filter((value) => value !== tapped)
    : [...selected, tapped];
  return isEverythingSelected(next, all)
    ? [...all]
    : all.filter((value) => next.includes(value));
}

type Common<T extends string> = {
  options: readonly ChipOption<T>[];
  /** Names the row for screen readers, e.g. "Filter by type". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type ChipRowProps<T extends string> = Common<T> &
  (
    | {
        /** Multi-select with a leading Everything chip. */
        mode: 'multi';
        selected: readonly T[];
        onChange: (next: T[]) => void;
        everythingLabel?: string;
      }
    | {
        mode: 'single';
        selected: T;
        onChange: (next: T) => void;
      }
  );

export function ChipRow<T extends string>(props: ChipRowProps<T>) {
  const { options, accessibilityLabel, style, testID } = props;
  const all = options.map((option) => option.value);

  let chips;
  if (props.mode === 'multi') {
    const everything = isEverythingSelected(props.selected, all);
    const tap = (value: T | null) =>
      props.onChange(nextChipSelection(props.selected, value, all));
    chips = [
      <FilterChip
        key="__everything"
        label={props.everythingLabel ?? 'Everything'}
        onPress={() => tap(null)}
        selected={everything}
      />,
      ...options.map((option) => (
        <FilterChip
          key={option.value}
          label={option.label}
          onPress={() => tap(option.value)}
          selected={!everything && props.selected.includes(option.value)}
        />
      )),
    ];
  } else {
    const { selected, onChange } = props;
    chips = options.map((option) => (
      <FilterChip
        key={option.value}
        label={option.label}
        onPress={() => onChange(option.value)}
        role="radio"
        selected={option.value === selected}
      />
    ));
  }

  return (
    <ScrollView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={props.mode === 'single' ? 'radiogroup' : undefined}
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      testID={testID}
    >
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 7, alignItems: 'center' },
});
