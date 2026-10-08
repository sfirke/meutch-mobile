import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { INBOX_SORTS, type InboxSort } from '../lib/messages';
import { colors, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { OptionSheet } from './OptionSheet';

export const INBOX_SORT_LABELS: Record<InboxSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  unread: 'Unread first',
  name_asc: 'Name',
};

const SORT_OPTIONS = INBOX_SORTS.map((value) => ({
  value,
  label: INBOX_SORT_LABELS[value],
}));

type InboxToolbarProps = {
  sort: InboxSort;
  onSortChange: (sort: InboxSort) => void;
  onMarkAllRead: () => void;
  markAllReadDisabled: boolean;
};

// Sort picker and mark-all-read action, shown under the inbox/archived tabs.
export function InboxToolbar({
  sort,
  onSortChange,
  onMarkAllRead,
  markAllReadDisabled,
}: InboxToolbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const label = INBOX_SORT_LABELS[sort];

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={`Sort: ${label}`}
        accessibilityRole="button"
        hitSlop={spacing[8]}
        onPress={() => setSheetOpen(true)}
        style={styles.action}
        testID="inbox-sort-button"
      >
        <Icon color={colors.secondary} name="sort" size={14} />
        <Text style={styles.text}>{`Sort: ${label}`}</Text>
        <View style={styles.caret}>
          <Icon color={colors.secondary} name="chevron" size={10} />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: markAllReadDisabled }}
        disabled={markAllReadDisabled}
        hitSlop={spacing[8]}
        onPress={onMarkAllRead}
        testID="inbox-mark-all-read"
      >
        <Text style={[styles.markAll, markAllReadDisabled && styles.disabled]}>
          Mark all read
        </Text>
      </Pressable>
      <OptionSheet
        onClose={() => setSheetOpen(false)}
        onSelect={onSortChange}
        options={SORT_OPTIONS}
        title="Sort by"
        value={sort}
        visible={sheetOpen}
      />
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
  caret: {
    transform: [{ rotate: '90deg' }],
  },
  markAll: {
    color: colors.primaryDark,
    ...typography.buttonSmall,
  },
  disabled: {
    opacity: 0.4,
  },
});
