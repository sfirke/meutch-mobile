import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormTextField } from '../components/FormTextField';
import { Icon } from '../components/Icon';
import { NavRow } from '../components/NavRow';
import { DELETE_CONFIRMATION } from '../lib/account';
import { describeError } from '../lib/errorCopy';
import { useDeleteAccountMutation } from '../query/useDeleteAccountMutation';
import { useOutstandingLoansQuery } from '../query/useOutstandingLoansQuery';
import { colors, radii, spacing, typography } from '../theme';

const CONSEQUENCES = [
  'Permanently delete all your items',
  'Remove you from all circles',
  'Cancel all pending loan requests',
  'Remove your profile and personal information',
  'Preserve your name in messages and loan history for other members',
];

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

type LoansNoticeProps = {
  activeBorrowing: number;
  activeLending: number;
  pendingBorrowing: number;
  pendingLending: number;
  onViewLoans: () => void;
};

function LoansNotice({
  activeBorrowing,
  activeLending,
  pendingBorrowing,
  pendingLending,
  onViewLoans,
}: LoansNoticeProps) {
  const lines: string[] = [];

  if (activeBorrowing > 0) {
    lines.push(
      `You are currently borrowing ${activeBorrowing} ${plural(activeBorrowing, 'item', 'items')} - please return them first`,
    );
  }

  if (activeLending > 0) {
    lines.push(
      `You are currently lending ${activeLending} ${plural(activeLending, 'item', 'items')} - ${plural(activeLending, 'this loan will continue until it is returned', 'these loans will continue until they are returned')}`,
    );
  }

  if (pendingBorrowing > 0) {
    lines.push(
      `You have ${pendingBorrowing} pending ${plural(pendingBorrowing, 'request', 'requests')} to borrow items - these will be automatically canceled`,
    );
  }

  if (pendingLending > 0) {
    lines.push(
      `You have ${pendingLending} pending ${plural(pendingLending, 'request', 'requests')} for your items - these will be automatically denied`,
    );
  }

  return (
    <View style={styles.warningCard} testID="outstanding-loans">
      <Text style={styles.warningHeading}>Outstanding loans notice</Text>
      <Text style={styles.bodyStrong}>
        We strongly recommend resolving your outstanding loans before deleting
        your account:
      </Text>
      {lines.map((line) => (
        <Text key={line} style={styles.bullet}>
          {`• ${line}`}
        </Text>
      ))}
      <Text style={styles.body}>
        Active loans will continue with your real name visible to the other
        party.
      </Text>
      <NavRow icon="loan" label="View my loans" onPress={onViewLoans} />
    </View>
  );
}

export function DeleteAccountScreen() {
  const router = useRouter();
  const loans = useOutstandingLoansQuery();
  const mutation = useDeleteAccountMutation();
  const [confirmation, setConfirmation] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);

  const canDelete = confirmation === DELETE_CONFIRMATION;
  const summary = loans.data;

  const closeDialog = () => {
    setDialogVisible(false);
    mutation.reset();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Delete account' }} />

      <KeyboardAwareScrollView
        bottomOffset={spacing[16]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.dangerCard} testID="delete-account-warning">
          <View style={styles.headingRow}>
            <Icon color={colors.danger} name="warning" />
            <Text style={styles.dangerHeading}>
              This action cannot be undone
            </Text>
          </View>
          <Text style={styles.bodyStrong}>Deleting your account will:</Text>
          {CONSEQUENCES.map((text) => (
            <Text key={text} style={styles.bullet}>
              {`• ${text}`}
            </Text>
          ))}
        </View>

        {loans.isPending ? (
          <Text style={styles.quiet} testID="loans-checking">
            Checking your loans...
          </Text>
        ) : null}

        {loans.isError ? (
          <View style={styles.retryRow}>
            <Text style={styles.quiet}>
              We couldn&apos;t check your outstanding loans.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void loans.refetch();
              }}
              testID="loans-retry"
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {summary?.hasOutstanding ? (
          <LoansNotice
            activeBorrowing={summary.activeBorrowing}
            activeLending={summary.activeLending}
            onViewLoans={() => router.push('/profile/loans')}
            pendingBorrowing={summary.pendingBorrowing}
            pendingLending={summary.pendingLending}
          />
        ) : null}

        {summary && !summary.hasOutstanding ? (
          <Text style={styles.quiet} testID="no-outstanding-loans">
            You have no outstanding loans or requests.
          </Text>
        ) : null}

        <FormTextField
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect={false}
          field="confirmation"
          hint={`You must type "${DELETE_CONFIRMATION}" exactly, in capitals.`}
          label={`Type ${DELETE_CONFIRMATION} to confirm`}
          onChangeText={setConfirmation}
          placeholder={DELETE_CONFIRMATION}
          value={confirmation}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canDelete }}
          disabled={!canDelete}
          onPress={() => setDialogVisible(true)}
          style={({ pressed }) => [
            styles.deleteButton,
            (!canDelete || pressed) && styles.disabled,
          ]}
        >
          <Text style={styles.deleteLabel}>Delete my account</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.disabled,
          ]}
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <ConfirmDialog
        confirmLabel="Delete account"
        destructive
        error={
          mutation.error ? describeError(mutation.error).message : undefined
        }
        message="This cannot be undone."
        onCancel={closeDialog}
        onConfirm={() => mutation.mutate()}
        pending={mutation.isPending}
        pendingLabel="Deleting..."
        title="Delete your account?"
        visible={dialogVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    ...typography.body,
  },
  bodyStrong: {
    color: colors.text,
    ...typography.label,
  },
  bullet: {
    color: colors.text,
    ...typography.body,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  cancelLabel: {
    color: colors.secondary,
    ...typography.buttonLarge,
  },
  content: {
    gap: spacing[12],
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  dangerCard: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[16],
  },
  dangerHeading: {
    color: colors.danger,
    flex: 1,
    ...typography.title,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  deleteLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  disabled: {
    opacity: 0.5,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  quiet: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  retryLabel: {
    color: colors.danger,
    ...typography.buttonSmall,
  },
  retryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  warningCard: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[16],
  },
  warningHeading: {
    color: colors.errorLabel,
    ...typography.title,
  },
});
