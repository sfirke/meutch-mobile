import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { OptionSheet } from './OptionSheet';

export type FilterToolbarSortOption<S extends string> = {
  value: S;
  label: string;
  disabled?: boolean;
  /** Small secondary text under the label, e.g. why the option is disabled. */
  hint?: string;
};

export type FilterToolbarSort<S extends string> = {
  value: S;
  options: FilterToolbarSortOption<S>[];
  onChange: (value: S) => void;
};

export type FilterToolbarProps<S extends string = string> = {
  /** How many filters differ from their defaults; 0 shows a plain "Filters". */
  activeFilterCount: number;
  onOpenFilters: () => void;
  /** Omit to show no sort button (the feed has no sort). */
  sort?: FilterToolbarSort<S>;
};

// Filters button with an active count, plus an optional sort picker.
export function FilterToolbar<S extends string = string>({
  activeFilterCount,
  onOpenFilters,
  sort,
}: FilterToolbarProps<S>) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeFilterCount > 0;
  const filtersColor = active ? colors.primaryDark : colors.secondary;
  const sortLabel = sort?.options.find(
    (option) => option.value === sort.value,
  )?.label;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={
          active ? `Filters, ${activeFilterCount} active` : 'Filters'
        }
        accessibilityRole="button"
        hitSlop={spacing[8]}
        onPress={onOpenFilters}
        style={styles.action}
        testID="filter-toolbar-filters"
      >
        <Icon color={filtersColor} name="filter" size={14} />
        <Text style={[styles.text, active && styles.textActive]}>
          {active ? `Filters (${activeFilterCount})` : 'Filters'}
        </Text>
      </Pressable>
      {sort ? (
        <Pressable
          accessibilityLabel={`Sort: ${sortLabel}`}
          accessibilityRole="button"
          hitSlop={spacing[8]}
          onPress={() => setSheetOpen(true)}
          style={styles.action}
          testID="filter-toolbar-sort"
        >
          <Icon color={colors.secondary} name="sort" size={14} />
          <Text style={styles.text}>{`Sort: ${sortLabel}`}</Text>
          <View style={styles.caret}>
            <Icon color={colors.secondary} name="chevron" size={10} />
          </View>
        </Pressable>
      ) : null}
      {sort ? (
        <OptionSheet
          onClose={() => setSheetOpen(false)}
          onSelect={sort.onChange}
          options={sort.options}
          title="Sort by"
          value={sort.value}
          visible={sheetOpen}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  text: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  textActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  caret: {
    transform: [{ rotate: '90deg' }],
  },
});
