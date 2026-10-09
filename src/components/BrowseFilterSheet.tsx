import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type ItemTypeFilter } from '../lib/items';
import { colors, spacing, typography } from '../theme';
import { FilterSheet } from './FilterSheet';
import { SegmentedControl } from './SegmentedControl';

export type BrowseFilters = {
  itemType: ItemTypeFilter;
  /** Category ids; empty means every category. */
  categories: string[];
  /** Circle ids; empty means every circle the member is in. */
  circles: string[];
};

export const DEFAULT_BROWSE_FILTERS: BrowseFilters = {
  itemType: 'both',
  categories: [],
  circles: [],
};

/** How many of the three filters differ from their defaults, for the toolbar. */
export function countActiveBrowseFilters(filters: BrowseFilters): number {
  return (
    (filters.itemType !== 'both' ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.circles.length > 0 ? 1 : 0)
  );
}

const ITEM_TYPE_OPTIONS: { value: ItemTypeFilter; label: string }[] = [
  { value: 'both', label: 'All items' },
  { value: 'loans', label: 'Loans' },
  { value: 'giveaways', label: 'Giveaways' },
];

export type BrowseFilterSheetProps = {
  visible: boolean;
  /** The applied filters; the draft starts from these each time the sheet opens. */
  filters: BrowseFilters;
  /** Called with the draft when Apply is tapped. The parent closes the sheet. */
  onApply: (filters: BrowseFilters) => void;
  onClose: () => void;
};

// Draft of the browse filters; nothing is sent until Apply.
export function BrowseFilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: BrowseFilterSheetProps) {
  const [draft, setDraft] = useState(filters);
  const [wasVisible, setWasVisible] = useState(visible);

  // Restart the draft from the applied filters each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);

    if (visible) {
      setDraft(filters);
    }
  }

  return (
    <FilterSheet
      onApply={() => onApply(draft)}
      onClose={onClose}
      onReset={() => setDraft(DEFAULT_BROWSE_FILTERS)}
      title="Filter items"
      visible={visible}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Item type</Text>
        <SegmentedControl
          accessibilityLabel="Item type"
          onChange={(itemType) => setDraft({ ...draft, itemType })}
          options={ITEM_TYPE_OPTIONS}
          value={draft.itemType}
        />
      </View>
    </FilterSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[8],
    paddingBottom: spacing[16],
  },
  sectionTitle: {
    color: colors.text,
    ...typography.label,
  },
});
