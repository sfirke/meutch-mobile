import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import { formatCalendarDate } from '../lib/dates';
import { describeError, forbiddenMessageOverride } from '../lib/errorCopy';
import type { LoanAction, LoanDetail } from '../lib/loans';
import { useLoanActionMutation } from '../query/useLoanActionMutation';
import { colors, radii, spacing, typography } from '../theme';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';

export type LoanActionsProps = { loan: LoanDetail; isBorrower: boolean };

/** A mutation, or the extend route (which has its own screen). */
export type LoanActionKind = LoanAction | 'extend';

export type LoanActionTone = 'primary' | 'secondary' | 'destructive';

export type LoanActionDescriptor = {
  kind: LoanActionKind;
  label: string;
  tone: LoanActionTone;
};

const APPROVE: LoanActionDescriptor = {
  kind: 'approve',
  label: 'Approve',
  tone: 'primary',
};
const DENY: LoanActionDescriptor = {
  kind: 'deny',
  label: 'Deny',
  tone: 'destructive',
};
const CANCEL_REQUEST: LoanActionDescriptor = {
  kind: 'cancel',
  label: 'Cancel request',
  tone: 'destructive',
};
const CANCEL_LOAN: LoanActionDescriptor = {
  kind: 'owner-cancel',
  label: 'Cancel loan',
  tone: 'destructive',
};
const MARK_RETURNED: LoanActionDescriptor = {
  kind: 'complete',
  label: 'Mark returned',
  tone: 'primary',
};
const CHANGE_DUE_DATE: LoanActionDescriptor = {
  kind: 'extend',
  label: 'Change due date',
  tone: 'secondary',
};

/**
 * The buttons this viewer gets, by role and status. Only a choice of what to
 * show: the server still decides, and its refusal is shown as returned.
 */
export function describeLoanActions(
  loan: Pick<LoanDetail, 'status'>,
  isBorrower: boolean,
): LoanActionDescriptor[] {
  if (loan.status === 'pending') {
    return isBorrower ? [CANCEL_REQUEST] : [APPROVE, DENY, CHANGE_DUE_DATE];
  }

  if (loan.status === 'approved') {
    // The borrower's "Ask for more time" lands in a later PR.
    return isBorrower ? [] : [MARK_RETURNED, CHANGE_DUE_DATE, CANCEL_LOAN];
  }

  return [];
}

type DialogCopy = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  pendingLabel: string;
  destructive: boolean;
};

function describeDialog(action: LoanAction, loan: LoanDetail): DialogCopy {
  switch (action) {
    case 'approve': {
      const who = loan.borrower?.first_name ?? 'The borrower';
      const start = formatCalendarDate(loan.start_date);
      const end = formatCalendarDate(loan.end_date);
      const dates = start && end ? ` from ${start} to ${end}` : '';

      return {
        title: 'Approve this request?',
        message: `${who} will be able to borrow ${loan.item.name}${dates}.`,
        confirmLabel: 'Approve',
        pendingLabel: 'Approving...',
        destructive: false,
      };
    }
    case 'deny':
      return {
        title: 'Deny this request?',
        confirmLabel: 'Deny',
        pendingLabel: 'Denying...',
        destructive: true,
      };
    case 'cancel':
      return {
        title: 'Cancel this request?',
        confirmLabel: 'Cancel request',
        cancelLabel: 'Keep',
        pendingLabel: 'Cancelling...',
        destructive: true,
      };
    case 'owner-cancel':
      return {
        title: 'Cancel this loan?',
        message: 'This ends the loan early.',
        confirmLabel: 'Cancel loan',
        cancelLabel: 'Keep',
        pendingLabel: 'Cancelling...',
        destructive: true,
      };
    case 'complete':
      return {
        title: 'Mark this loan returned?',
        message: 'The item becomes available again.',
        confirmLabel: 'Mark returned',
        pendingLabel: 'Marking...',
        destructive: false,
      };
  }
}

export function LoanActions({ loan, isBorrower }: LoanActionsProps) {
  const router = useRouter();
  const actions = describeLoanActions(loan, isBorrower);
  const [confirming, setConfirming] = useState<LoanAction | null>(null);
  const mutation = useLoanActionMutation(loan.id);

  if (actions.length === 0) {
    return null;
  }

  const close = () => {
    setConfirming(null);
    mutation.reset();
  };

  const confirm = () => {
    if (confirming) {
      // The detail query refetches itself on success; just close.
      mutation.mutate(confirming, { onSuccess: () => setConfirming(null) });
    }
  };

  const press = (kind: LoanActionKind) => {
    if (kind === 'extend') {
      router.push(`/loan/${loan.id}/extend`);
    } else {
      setConfirming(kind);
    }
  };

  const dialog = confirming ? describeDialog(confirming, loan) : null;

  return (
    <View style={styles.card}>
      {actions.map(({ kind, label, tone }) => (
        <Pressable
          accessibilityRole="button"
          key={kind}
          onPress={() => press(kind)}
          style={({ pressed }) => [
            styles.button,
            toneStyles[tone].button,
            pressed && styles.pressed,
          ]}
          testID={`loan-action-${kind}`}
        >
          {kind === 'extend' ? (
            <Icon color={colors.text} name="pen" size={14} />
          ) : null}
          <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
        </Pressable>
      ))}
      {dialog ? (
        <ConfirmDialog
          cancelLabel={dialog.cancelLabel}
          confirmLabel={dialog.confirmLabel}
          destructive={dialog.destructive}
          error={
            mutation.isError
              ? describeError(
                  mutation.error,
                  forbiddenMessageOverride(mutation.error),
                ).message
              : null
          }
          message={dialog.message}
          onCancel={close}
          onConfirm={confirm}
          pending={mutation.isPending}
          pendingLabel={dialog.pendingLabel}
          title={dialog.title}
          visible
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[10],
    marginHorizontal: spacing[16],
    marginTop: spacing[16],
    padding: spacing[16],
  },
  button: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  destructiveButton: {
    borderColor: colors.danger,
  },
  destructiveLabel: {
    color: colors.danger,
  },
  label: {
    color: colors.text,
    ...typography.buttonLarge,
  },
  pressed: {
    opacity: 0.75,
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  primaryLabel: {
    color: colors.onPrimaryText,
  },
});

const toneStyles: Record<
  LoanActionTone,
  { button?: ViewStyle; label?: TextStyle }
> = {
  primary: { button: styles.primaryButton, label: styles.primaryLabel },
  secondary: {},
  destructive: {
    button: styles.destructiveButton,
    label: styles.destructiveLabel,
  },
};
