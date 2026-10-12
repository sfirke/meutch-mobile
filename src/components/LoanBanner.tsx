import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCalendarDate } from '../lib/dates';
import { describeLoanStatus, type LoanExtensionRequest } from '../lib/loans';
import type { LoanSummary } from '../lib/parse';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { loanToneColors } from './loanTone';

export type LoanBannerProps = {
  loan: LoanSummary & {
    pending_extension_request?: LoanExtensionRequest | null;
  };
};

// Thread footer banner for a pending/approved loan tied to the conversation.
// No borrower identity here: the thread already shows the other participant.
export function LoanBanner({ loan }: LoanBannerProps) {
  const router = useRouter();
  const startDate = formatCalendarDate(loan.start_date);
  const endDate = formatCalendarDate(loan.end_date);
  const datesLine = startDate && endDate ? `${startDate} to ${endDate}` : null;
  const { label, tone } = describeLoanStatus(loan);
  const toneColor = loanToneColors[tone];
  const extension =
    loan.status === 'approved' ? loan.pending_extension_request : null;
  const extensionDate = extension
    ? formatCalendarDate(extension.proposed_end_date)
    : null;

  return (
    <Pressable
      accessibilityLabel="View loan"
      accessibilityRole="button"
      onPress={() => router.push(`/loan/${loan.id}`)}
      style={({ pressed }) => [
        styles.banner,
        { borderColor: toneColor },
        pressed && styles.pressed,
      ]}
      testID="loan-banner"
    >
      <Icon color={toneColor} name="loan" size={18} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {datesLine ? <Text style={styles.dates}>{datesLine}</Text> : null}
        {extensionDate ? (
          <Text style={styles.extension} testID="loan-banner-extension">
            More time requested until {extensionDate}
          </Text>
        ) : null}
      </View>
      <Icon color={colors.secondary} name="chevron" size={12} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
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
  extension: {
    color: loanToneColors.warning,
    ...typography.itemMeta,
  },
  label: {
    color: colors.text,
    ...typography.label,
  },
  pressed: {
    opacity: 0.75,
  },
});
