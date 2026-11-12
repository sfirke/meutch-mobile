import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateField } from '../components/DateField';
import { ErrorState } from '../components/ErrorState';
import { FieldError } from '../components/FieldError';
import { HeaderCancelButton } from '../components/HeaderCancelButton';
import { QueryStateView } from '../components/QueryStateView';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useScrollBottomPadding } from '../hooks/useScrollBottomPadding';
import { formatCalendarDate, todayCalendarDate } from '../lib/dates';
import {
  forbiddenMessageOverride,
  type ErrorCopyOverrides,
} from '../lib/errorCopy';
import { buildGeneralMessage, readValidationErrors } from '../lib/validation';
import { useExtendLoanMutation } from '../query/useExtendLoanMutation';
import { isLoanId, useLoanDetailQuery } from '../query/useLoanDetailQuery';
import { colors, radii, spacing, typography } from '../theme';

export const EXTEND_MESSAGE_LIMIT = 1000;

const TITLE = 'Change due date';

const EXTEND_FIELDS = ['new_end_date', 'message'] as const;

const INVALID_LOAN_COPY = {
  title: "This loan isn't available.",
  message: 'It may have been removed, or the link is wrong.',
};

const UNAVAILABLE_LOAN_COPY = {
  title: "This loan isn't available.",
  message: "It may have been removed, or you're not part of it.",
  canRetry: false,
};

/** Loading the loan: the backend 404s a missing loan and 403s an outsider. */
const LOAD_ERROR_OVERRIDES: ErrorCopyOverrides = {
  FORBIDDEN: UNAVAILABLE_LOAN_COPY,
  NOT_FOUND: UNAVAILABLE_LOAN_COPY,
};

// The server says why a 403 refused the change; show that, not generic copy.
export function ExtendLoanScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const loanId = rawId ?? '';
  const router = useRouter();
  const guard = useDiscardGuard();
  const paddingBottom = useScrollBottomPadding();
  const { data, error, isPending, isFetching, refetch } =
    useLoanDetailQuery(rawId);
  const extend = useExtendLoanMutation(loanId);
  const [newEndDate, setNewEndDate] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const today = useMemo(() => todayCalendarDate(), []);

  const dirty = newEndDate !== null || message.trim() !== '';
  const { onDirtyChange } = guard;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const header = (
    <Stack.Screen
      options={{
        title: TITLE,
        // iOS draws no back button for the first screen of a nested stack.
        headerLeft:
          Platform.OS === 'ios'
            ? () => <HeaderCancelButton onPress={() => router.back()} />
            : undefined,
      }}
    />
  );

  if (!isLoanId(rawId)) {
    return (
      <View style={styles.screen}>
        {header}
        <ErrorState {...INVALID_LOAN_COPY} />
      </View>
    );
  }

  const clearError = () => {
    if (extend.error) {
      extend.reset();
    }
  };

  const pending = extend.isPending;
  const currentEndDate = data?.loan.end_date ?? null;
  const validation = readValidationErrors(extend.error, EXTEND_FIELDS);
  const generalMessage = buildGeneralMessage(
    extend.error,
    validation,
    forbiddenMessageOverride(extend.error),
  );
  const submitDisabled =
    pending || newEndDate === null || newEndDate === currentEndDate;

  const submit = () => {
    if (newEndDate === null) {
      return;
    }

    extend.mutate(
      { new_end_date: newEndDate, message },
      {
        onSuccess: () => {
          guard.allowLeave();

          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(`/loan/${loanId}`);
          }
        },
      },
    );
  };

  return (
    <View style={styles.screen}>
      {header}

      <QueryStateView
        error={error}
        errorOverrides={LOAD_ERROR_OVERRIDES}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading loan"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <KeyboardAwareScrollView
            bottomOffset={spacing[16]}
            contentContainerStyle={[styles.content, { paddingBottom }]}
            keyboardShouldPersistTaps="handled"
            testID="extend-loan-form"
          >
            <View style={styles.section}>
              <Text style={styles.current} testID="extend-current-due">
                Current due date:{' '}
                {formatCalendarDate(data.loan.end_date) ?? data.loan.end_date}
              </Text>
            </View>

            <View style={styles.section}>
              <DateField
                disabled={pending}
                error={validation.fields.new_end_date}
                field="new_end_date"
                label="New due date"
                minimumDate={today}
                onChange={(value) => {
                  clearError();
                  setNewEndDate(value);
                }}
                value={newEndDate}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Message</Text>
              <TextInput
                accessibilityLabel="Message"
                editable={!pending}
                maxLength={EXTEND_MESSAGE_LIMIT}
                multiline
                onChangeText={(value) => {
                  clearError();
                  setMessage(value);
                }}
                placeholder="Optional note for the borrower"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.input, styles.multiline, pending && styles.dim]}
                testID="extend-message"
                value={message}
              />
              <Text style={styles.counter} testID="extend-message-counter">
                {message.length}/{EXTEND_MESSAGE_LIMIT}
              </Text>
              <FieldError field="message" message={validation.fields.message} />
            </View>

            <View style={styles.section}>
              {generalMessage ? (
                <Text style={styles.errorText} testID="extend-loan-error">
                  {generalMessage}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: submitDisabled }}
                disabled={submitDisabled}
                onPress={submit}
                style={({ pressed }) => [
                  styles.submitButton,
                  (submitDisabled || pressed) && styles.disabled,
                ]}
                testID="extend-submit"
              >
                <Text style={styles.submitLabel}>
                  {pending ? 'Saving...' : 'Save due date'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAwareScrollView>
        ) : null}
      </QueryStateView>

      <ConfirmDialog
        {...guard.dialog}
        confirmLabel="Discard"
        destructive
        message="The due date won't change."
        title="Discard these changes?"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  counter: {
    color: colors.secondary,
    textAlign: 'right',
    ...typography.itemMeta,
  },
  current: {
    color: colors.text,
    ...typography.body,
  },
  dim: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    ...typography.body,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: spacing[8],
    paddingTop: spacing[12],
  },
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  submitLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
});
