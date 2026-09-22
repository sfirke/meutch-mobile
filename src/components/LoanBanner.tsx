import { StyleSheet, Text, View } from 'react-native';

import { formatCalendarDate } from '../lib/dates';
import type { LoanSummary } from '../lib/parse';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';

export type LoanBannerProps = {
  loan: LoanSummary;
};

const NOTE = 'Approve, deny, or extend this loan on meutch.com.';

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : value.charAt(0).toUpperCase() + value.slice(1);
}

function describeLabel(loan: LoanSummary): string {
  if (loan.status === 'pending') {
    return 'Loan request pending';
  }

  if (loan.status === 'approved') {
    return 'Loan approved';
  }

  return loan.status ? capitalize(loan.status) : 'Loan';
}

function describeTone(loan: LoanSummary): string {
  if (loan.status === 'pending') {
    return colors.warning;
  }

  if (loan.status === 'approved') {
    return colors.success;
  }

  return colors.border;
}

// Thread footer banner for a pending/approved loan tied to the conversation.
// No borrower identity here: the thread already shows the other participant.
export function LoanBanner({ loan }: LoanBannerProps) {
  const startDate = formatCalendarDate(loan.start_date);
  const endDate = formatCalendarDate(loan.end_date);
  const datesLine = startDate && endDate ? `${startDate} to ${endDate}` : null;
  const tone = describeTone(loan);

  return (
    <View style={[styles.banner, { borderColor: tone }]} testID="loan-banner">
      <Icon color={tone} name="loan" size={18} />
      <View style={styles.copy}>
        <Text style={styles.label}>{describeLabel(loan)}</Text>
        {datesLine ? <Text style={styles.dates}>{datesLine}</Text> : null}
        <Text style={styles.note}>{NOTE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[12],
  },
  copy: {
    flex: 1,
    gap: spacing[4],
  },
  dates: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  label: {
    color: colors.text,
    ...typography.label,
  },
  note: {
    color: colors.secondary,
    ...typography.itemMeta,
    fontSize: 12,
  },
});
