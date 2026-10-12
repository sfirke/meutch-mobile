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
import {
  addCalendarDays,
  compareCalendarDates,
  formatCalendarDate,
  todayCalendarDate,
} from '../lib/dates';
import {
  forbiddenMessageOverride,
  type ErrorCopyOverrides,
} from '../lib/errorCopy';
import { buildGeneralMessage, readValidationErrors } from '../lib/validation';
import { isLoanId, useLoanDetailQuery } from '../query/useLoanDetailQuery';
import { useRequestExtensionMutation } from '../query/useRequestExtensionMutation';
import { colors, radii, spacing, typography } from '../theme';

export const EXTENSION_MESSAGE_MIN = 10;
export const EXTENSION_MESSAGE_LIMIT = 1000;

const TITLE = 'Ask for more time';

const EXTENSION_FIELDS = ['proposed_end_date', 'message'] as const;

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

/** The day after the due date, or today when the loan is already overdue. */
function earliestProposedDate(endDate: string, today: string): string {
  const dayAfter = addCalendarDays(endDate, 1);
  return compareCalendarDates(dayAfter, today) > 0 ? dayAfter : today;
}

// The server says why a 403/409 refused the request; show that as returned.
export function RequestExtensionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const loanId = rawId ?? '';
  const router = useRouter();
  const guard = useDiscardGuard();
  const paddingBottom = useScrollBottomPadding();
  const { data, error, isPending, isFetching, refetch } =
    useLoanDetailQuery(rawId);
  const request = useRequestExtensionMutation(loanId);
  const [proposedEndDate, setProposedEndDate] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const today = useMemo(() => todayCalendarDate(), []);

  const dirty = proposedEndDate !== null || message.trim() !== '';
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
    if (request.error) {
      request.reset();
    }
  };

  const pending = request.isPending;
  const trimmedMessage = message.trim();
  const messageTooShort = trimmedMessage.length < EXTENSION_MESSAGE_MIN;
  const validation = readValidationErrors(request.error, EXTENSION_FIELDS);
  const generalMessage = buildGeneralMessage(
    request.error,
    validation,
    forbiddenMessageOverride(request.error),
  );
  const submitDisabled = pending || proposedEndDate === null || messageTooShort;

  const submit = () => {
    if (proposedEndDate === null) {
      return;
    }

    request.mutate(
      { proposed_end_date: proposedEndDate, message: trimmedMessage },
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
            testID="request-extension-form"
          >
            <View style={styles.section}>
              <Text style={styles.current} testID="extension-current-due">
                Current due date:{' '}
                {formatCalendarDate(data.loan.end_date) ?? data.loan.end_date}
              </Text>
            </View>

            <View style={styles.section}>
              <DateField
                disabled={pending}
                error={validation.fields.proposed_end_date}
                field="proposed_end_date"
                label="New due date"
                minimumDate={earliestProposedDate(data.loan.end_date, today)}
                onChange={(value) => {
                  clearError();
                  setProposedEndDate(value);
                }}
                value={proposedEndDate}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Message</Text>
              <TextInput
                accessibilityLabel="Message"
                editable={!pending}
                maxLength={EXTENSION_MESSAGE_LIMIT}
                multiline
                onChangeText={(value) => {
                  clearError();
                  setMessage(value);
                }}
                placeholder="Tell the owner why you need longer."
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.input, styles.multiline, pending && styles.dim]}
                testID="extension-message"
                value={message}
              />
              <Text style={styles.counter} testID="extension-message-counter">
                {message.length}/{EXTENSION_MESSAGE_LIMIT}
              </Text>
              {message !== '' && messageTooShort ? (
                <Text style={styles.hint} testID="extension-message-hint">
                  At least {EXTENSION_MESSAGE_MIN} characters.
                </Text>
              ) : null}
              <FieldError field="message" message={validation.fields.message} />
            </View>

            <View style={styles.section}>
              {generalMessage ? (
                <Text style={styles.errorText} testID="extension-error">
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
                testID="extension-submit"
              >
                <Text style={styles.submitLabel}>
                  {pending ? 'Sending...' : 'Send request'}
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
        message="Your request won't be sent."
        title="Discard this request?"
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
  hint: {
    color: colors.secondary,
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
