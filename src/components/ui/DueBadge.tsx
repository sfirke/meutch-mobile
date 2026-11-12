import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { describeLoanDue, type LoanActivity } from '../../lib/loans';
import { colors, radii, typography } from '../../theme';

export type DueBadgeProps = {
  loan: LoanActivity;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Renders nothing when `describeLoanDue` has nothing to say.
export function DueBadge({ loan, style, testID }: DueBadgeProps) {
  const label = describeLoanDue(loan);
  if (!label) {
    return null;
  }
  const overdue = loan.due_state === 'overdue';

  return (
    <View
      style={[styles.badge, overdue ? styles.overdue : styles.due, style]}
      testID={testID}
    >
      <Text
        style={[styles.label, overdue ? styles.overdueText : styles.dueText]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.tag,
  },
  overdue: { backgroundColor: colors.danger },
  due: { backgroundColor: colors.tangerine },
  label: { ...typography.micro },
  overdueText: { color: colors.white },
  dueText: { color: colors.ink },
});
