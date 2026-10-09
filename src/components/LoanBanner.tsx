import { StyleSheet, Text, View } from 'react-native';

import { formatCalendarDate } from '../lib/dates';
import { describeLoanStatus } from '../lib/loans';
import type { LoanSummary } from '../lib/parse';
import { webOnlyNote } from '../lib/webOnly';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { loanToneColors } from './loanTone';

export type LoanBannerProps = {
  loan: LoanSummary;
};

const NOTE = webOnlyNote('Approve, deny, or extend this loan');

// Thread footer banner for a pending/approved loan tied to the conversation.
// No borrower identity here: the thread already shows the other participant.
export function LoanBanner({ loan }: LoanBannerProps) {
  const startDate = formatCalendarDate(loan.start_date);
  const endDate = formatCalendarDate(loan.end_date);
  const datesLine = startDate && endDate ? `${startDate} to ${endDate}` : null;
  const { label, tone } = describeLoanStatus(loan);
  const toneColor = loanToneColors[tone];

  return (
    <View
      style={[styles.banner, { borderColor: toneColor }]}
      testID="loan-banner"
    >
      <Icon color={toneColor} name="loan" size={18} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
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
