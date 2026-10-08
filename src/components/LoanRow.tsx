import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCalendarDate } from '../lib/dates';
import {
  describeLoanDue,
  describeLoanStatus,
  type LoanActivity,
  type LoanRole,
} from '../lib/loans';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { ImagePlaceholder } from './ImagePlaceholder';

export type LoanRowProps = {
  loan: LoanActivity;
  role: LoanRole;
  onPress?: (loan: LoanActivity) => void;
};

/** Matches item detail's fallback for a deleted account. */
const DELETED_USER_NAME = 'Deleted User';

// My loans row: item thumbnail, name, who the loan is with, the date range,
// and a status or due chip.
export function LoanRow({ loan, role, onPress }: LoanRowProps) {
  const counterpart =
    role === 'borrowing'
      ? `From ${loan.owner?.full_name ?? DELETED_USER_NAME}`
      : `To ${loan.borrower?.full_name ?? DELETED_USER_NAME}`;
  const start = formatCalendarDate(loan.start_date);
  const end = formatCalendarDate(loan.end_date);
  const dueText = describeLoanDue(loan);
  const status = describeLoanStatus(loan);
  const chip = dueText
    ? {
        label: dueText,
        color:
          loan.due_state === 'overdue' ? colors.errorText : colors.secondary,
      }
    : { label: status.label, color: status.tone };

  const content = (
    <>
      <View style={styles.thumbBox}>
        {loan.item.image_url ? (
          <Image
            accessibilityLabel={loan.item.name}
            contentFit="cover"
            source={{ uri: loan.item.image_url }}
            style={styles.thumb}
            testID="loan-row-thumbnail"
          />
        ) : (
          <ImagePlaceholder style={styles.thumb} />
        )}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {loan.item.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {counterpart}
        </Text>
        {start && end ? (
          <Text numberOfLines={1} style={styles.meta}>
            {`${start} to ${end}`}
          </Text>
        ) : null}
        <View style={styles.chip}>
          <Text
            numberOfLines={1}
            style={[styles.chipText, { color: chip.color }]}
            testID="loan-row-chip"
          >
            {chip.label}
          </Text>
        </View>
      </View>
      <Icon color={colors.secondary} name="chevron" size={14} />
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={`${loan.item.name}, ${counterpart}`}
        accessibilityRole="button"
        onPress={() => onPress(loan)}
        style={styles.row}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing[4],
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  chipText: {
    ...typography.itemMeta,
    fontSize: 12,
  },
  meta: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  name: {
    color: colors.text,
    ...typography.body,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  thumb: {
    height: '100%',
    width: '100%',
  },
  thumbBox: {
    borderRadius: radii.sm,
    height: 56,
    overflow: 'hidden',
    width: 56,
  },
});
