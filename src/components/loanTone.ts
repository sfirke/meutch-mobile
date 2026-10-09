import type { LoanTone } from '../lib/loans';
import { colors } from '../theme';

export const loanToneColors: Record<LoanTone, string> = {
  warning: colors.warning,
  success: colors.success,
  neutral: colors.border,
};
