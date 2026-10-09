import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { type ItemTypeFilter } from '../lib/items';
import { useCategoriesQuery } from '../query/useCategoriesQuery';
import { useMyCirclesQuery } from '../query/useMyCirclesQuery';
import { colors, spacing, typography } from '../theme';
import { FilterSheet } from './FilterSheet';
import { SegmentedControl } from './SegmentedControl';
import { SelectList, type SelectListOption } from './SelectList';

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

type ListSectionProps = {
  title: string;
  /** Spinner label, e.g. "Loading categories". */
  loadingLabel: string;
  errorMessage: string;
  emptyMessage?: string;
  isPending: boolean;
  isError: boolean;
  options: SelectListOption<string>[];
  value: string[];
  onChange: (value: string[]) => void;
};

function ListSection({
  title,
  loadingLabel,
  errorMessage,
  emptyMessage,
  isPending,
  isError,
  options,
  value,
  onChange,
}: ListSectionProps) {
  let body;

  if (isError) {
    body = <Text style={styles.status}>{errorMessage}</Text>;
  } else if (isPending) {
    body = (
      <ActivityIndicator
        accessibilityLabel={loadingLabel}
        color={colors.primaryDark}
        style={styles.spinner}
      />
    );
  } else if (options.length === 0 && emptyMessage) {
    body = <Text style={styles.status}>{emptyMessage}</Text>;
  } else {
    body = (
      <SelectList
        accessibilityLabel={title}
        multiple
        onChange={onChange}
        options={options}
        value={value}
      />
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.helper}>Nothing ticked means all.</Text>
      {body}
    </View>
  );
}

function toOptions(
  rows: { id: string; name: string }[] | undefined,
): SelectListOption<string>[] {
  return (rows ?? []).map((row) => ({ value: row.id, label: row.name }));
}

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
  // Fetched only while open so the screen does not request them at mount.
  const categoriesQuery = useCategoriesQuery({ enabled: visible });
  const circlesQuery = useMyCirclesQuery({ enabled: visible });

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
      <ListSection
        errorMessage="Couldn't load categories."
        isError={categoriesQuery.isError}
        isPending={categoriesQuery.isPending}
        loadingLabel="Loading categories"
        onChange={(categories) => setDraft({ ...draft, categories })}
        options={toOptions(categoriesQuery.data)}
        title="Categories"
        value={draft.categories}
      />
      <ListSection
        emptyMessage="You're not in any circles yet."
        errorMessage="Couldn't load circles."
        isError={circlesQuery.isError}
        isPending={circlesQuery.isPending}
        loadingLabel="Loading circles"
        onChange={(circles) => setDraft({ ...draft, circles })}
        options={toOptions(circlesQuery.data)}
        title="Your circles"
        value={draft.circles}
      />
    </FilterSheet>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: colors.secondary,
    ...typography.meta,
  },
  section: {
    gap: spacing[8],
    paddingBottom: spacing[16],
  },
  sectionTitle: {
    color: colors.text,
    ...typography.label,
  },
  spinner: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[8],
  },
  status: {
    color: colors.secondary,
    ...typography.body,
  },
});
