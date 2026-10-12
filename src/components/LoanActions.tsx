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

import { formatCalendarDate, localDateFromCalendarDate } from '../lib/dates';
import { describeError, forbiddenMessageOverride } from '../lib/errorCopy';
import type {
  LoanAction,
  LoanDetail,
  LoanExtensionDecision,
  LoanExtensionRequest,
} from '../lib/loans';
import { useExtensionDecisionMutation } from '../query/useExtensionDecisionMutation';
import { useLoanActionMutation } from '../query/useLoanActionMutation';
import { colors, radii, spacing, typography } from '../theme';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon, type IconName } from './Icon';

export type LoanActionsProps = { loan: LoanDetail; isBorrower: boolean };

/** A mutation, or a route with its own screen. */
export type LoanActionKind = LoanAction | 'extend' | 'request-extension';

export type LoanActionTone = 'primary' | 'secondary' | 'destructive';

export type LoanActionDescriptor = {
  kind: LoanActionKind;
  label: string;
  tone: LoanActionTone;
  icon?: IconName;
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
  icon: 'pen',
};
const ASK_FOR_MORE_TIME: LoanActionDescriptor = {
  kind: 'request-extension',
  label: 'Ask for more time',
  tone: 'secondary',
  icon: 'pending',
};

/** The request the owner must answer before the due date can move again. */
export function pendingExtensionOf(
  loan: Pick<LoanDetail, 'status' | 'pending_extension_request'>,
): LoanExtensionRequest | null {
  return loan.status === 'approved' ? loan.pending_extension_request : null;
}

/**
 * The buttons this viewer gets, by role and status. Only a choice of what to
 * show: the server still decides, and its refusal is shown as returned.
 */
export function describeLoanActions(
  loan: Pick<LoanDetail, 'status' | 'pending_extension_request'>,
  isBorrower: boolean,
): LoanActionDescriptor[] {
  if (loan.status === 'pending') {
    return isBorrower ? [CANCEL_REQUEST] : [APPROVE, DENY, CHANGE_DUE_DATE];
  }

  if (loan.status === 'approved') {
    // While an extension request waits, the owner answers it instead of
    // moving the date, and the borrower cannot ask again.
    if (pendingExtensionOf(loan)) {
      return isBorrower ? [] : [MARK_RETURNED, CANCEL_LOAN];
    }

    return isBorrower
      ? [ASK_FOR_MORE_TIME]
      : [MARK_RETURNED, CHANGE_DUE_DATE, CANCEL_LOAN];
  }

  return [];
}

/** Whole days from `from` to `to`, or `null` if either is unparseable. */
function daysBetween(from: string, to: string): number | null {
  const start = localDateFromCalendarDate(from);
  const end = localDateFromCalendarDate(to);

  if (!start || !end) {
    return null;
  }

  // Rounded so a DST shift between local midnights does not skew the count.
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
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

function describeDecisionDialog(
  decision: LoanExtensionDecision,
  loan: LoanDetail,
  extension: LoanExtensionRequest,
): DialogCopy {
  if (decision === 'approve') {
    const date = formatCalendarDate(extension.proposed_end_date);

    return {
      title: 'Approve the extension?',
      message: date ? `The due date moves to ${date}.` : undefined,
      confirmLabel: 'Approve',
      pendingLabel: 'Approving...',
      destructive: false,
    };
  }

  const date = formatCalendarDate(loan.end_date);

  return {
    title: 'Deny the extension?',
    message: date ? `The due date stays ${date}.` : undefined,
    confirmLabel: 'Deny',
    pendingLabel: 'Denying...',
    destructive: true,
  };
}

type Confirming =
  | { type: 'action'; action: LoanAction }
  | { type: 'decision'; decision: LoanExtensionDecision };

type ActionButtonProps = {
  label: string;
  tone: LoanActionTone;
  testID: string;
  icon?: IconName;
  onPress: () => void;
};

function ActionButton({
  label,
  tone,
  testID,
  icon,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        toneStyles[tone].button,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      {icon ? <Icon color={colors.text} name={icon} size={14} /> : null}
      <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
    </Pressable>
  );
}

type ExtensionPanelProps = {
  loan: LoanDetail;
  extension: LoanExtensionRequest;
  onDecide: (decision: LoanExtensionDecision) => void;
};

/** The owner's view of a waiting request, answered in place. */
function ExtensionPanel({ loan, extension, onDecide }: ExtensionPanelProps) {
  const who = loan.borrower?.first_name ?? 'The borrower';
  const date =
    formatCalendarDate(extension.proposed_end_date) ??
    extension.proposed_end_date;
  const days = daysBetween(loan.end_date, extension.proposed_end_date);
  const extra =
    days !== null && days > 0
      ? ` (${days} more ${days === 1 ? 'day' : 'days'})`
      : '';

  return (
    <View style={styles.panel} testID="loan-extension-panel">
      <Text style={styles.panelHeading}>Extension requested</Text>
      <Text style={styles.panelBody}>
        {who} asked to extend to {date}
        {extra}
      </Text>
      {extension.message ? (
        <Text style={styles.quote}>&ldquo;{extension.message}&rdquo;</Text>
      ) : null}
      <ActionButton
        label="Approve extension"
        onPress={() => onDecide('approve')}
        testID="loan-extension-approve"
        tone="primary"
      />
      <ActionButton
        label="Deny extension"
        onPress={() => onDecide('deny')}
        testID="loan-extension-deny"
        tone="destructive"
      />
    </View>
  );
}

export function LoanActions({ loan, isBorrower }: LoanActionsProps) {
  const router = useRouter();
  const actions = describeLoanActions(loan, isBorrower);
  const pendingExtension = pendingExtensionOf(loan);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const mutation = useLoanActionMutation(loan.id);
  const decisionMutation = useExtensionDecisionMutation();

  if (actions.length === 0 && !pendingExtension) {
    return null;
  }

  const close = () => {
    setConfirming(null);
    mutation.reset();
    decisionMutation.reset();
  };

  const confirm = () => {
    // The detail query refetches itself on success; just close.
    const onSuccess = () => setConfirming(null);

    if (confirming?.type === 'action') {
      mutation.mutate(confirming.action, { onSuccess });
    } else if (confirming?.type === 'decision' && pendingExtension) {
      decisionMutation.mutate(
        { extensionId: pendingExtension.id, decision: confirming.decision },
        { onSuccess },
      );
    }
  };

  const press = (kind: LoanActionKind) => {
    if (kind === 'extend') {
      router.push(`/loan/${loan.id}/extend`);
    } else if (kind === 'request-extension') {
      router.push(`/loan/${loan.id}/request-extension`);
    } else {
      setConfirming({ type: 'action', action: kind });
    }
  };

  const active = confirming?.type === 'decision' ? decisionMutation : mutation;
  const dialog =
    confirming?.type === 'action'
      ? describeDialog(confirming.action, loan)
      : confirming?.type === 'decision' && pendingExtension
        ? describeDecisionDialog(confirming.decision, loan, pendingExtension)
        : null;

  return (
    <View style={styles.card}>
      {pendingExtension && !isBorrower ? (
        <ExtensionPanel
          extension={pendingExtension}
          loan={loan}
          onDecide={(decision) => setConfirming({ type: 'decision', decision })}
        />
      ) : null}
      {pendingExtension && isBorrower ? (
        <Text style={styles.note} testID="loan-extension-pending-note">
          You asked to extend to{' '}
          {formatCalendarDate(pendingExtension.proposed_end_date) ??
            pendingExtension.proposed_end_date}
          . Waiting for {loan.owner?.first_name ?? 'the owner'}.
        </Text>
      ) : null}
      {actions.map(({ kind, label, tone, icon }) => (
        <ActionButton
          icon={icon}
          key={kind}
          label={label}
          onPress={() => press(kind)}
          testID={`loan-action-${kind}`}
          tone={tone}
        />
      ))}
      {dialog ? (
        <ConfirmDialog
          cancelLabel={dialog.cancelLabel}
          confirmLabel={dialog.confirmLabel}
          destructive={dialog.destructive}
          error={
            active.isError
              ? describeError(
                  active.error,
                  forbiddenMessageOverride(active.error),
                ).message
              : null
          }
          message={dialog.message}
          onCancel={close}
          onConfirm={confirm}
          pending={active.isPending}
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
  note: {
    color: colors.secondary,
    ...typography.meta,
  },
  panel: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: radii.sm,
    gap: spacing[10],
    padding: spacing[12],
  },
  panelBody: {
    color: colors.text,
    ...typography.body,
  },
  panelHeading: {
    color: colors.text,
    ...typography.itemName,
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
  quote: {
    color: colors.secondary,
    fontStyle: 'italic',
    ...typography.meta,
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
