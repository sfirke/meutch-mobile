import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { FieldError } from '../components/FieldError';
import { HeaderCancelButton } from '../components/HeaderCancelButton';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useScrollBottomPadding } from '../hooks/useScrollBottomPadding';
import { compareCalendarDates, todayCalendarDate } from '../lib/dates';
import { forbiddenMessageOverride } from '../lib/errorCopy';
import { buildGeneralMessage, readValidationErrors } from '../lib/validation';
import { useRequestLoanMutation } from '../query/useRequestLoanMutation';
import { colors, radii, spacing, typography } from '../theme';

export const LOAN_MESSAGE_LIMIT = 1000;

const LOAN_REQUEST_FIELDS = ['start_date', 'end_date', 'message'] as const;

// The server says why a 403 refused the request; show that, not generic copy.
export function RequestLoanScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const itemId = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';
  const router = useRouter();
  const requestLoan = useRequestLoanMutation(itemId);
  const guard = useDiscardGuard();
  const paddingBottom = useScrollBottomPadding();
  const [today] = useState(() => todayCalendarDate());
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const pending = requestLoan.isPending;
  const dirty = startDate !== null || endDate !== null || message !== '';
  const { onDirtyChange } = guard;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const clearError = () => {
    if (requestLoan.error) {
      requestLoan.reset();
    }
  };

  const changeStart = (value: string) => {
    clearError();
    setStartDate(value);
    // Don't leave an end date before the new start.
    if (endDate && compareCalendarDates(endDate, value) < 0) {
      setEndDate(null);
    }
  };

  const changeEnd = (value: string) => {
    clearError();
    setEndDate(value);
  };

  const changeMessage = (value: string) => {
    clearError();
    setMessage(value);
  };

  const submit = () => {
    if (!startDate || !endDate) {
      return;
    }

    requestLoan.mutate(
      { start_date: startDate, end_date: endDate, message },
      {
        onSuccess: (response) => {
          guard.allowLeave();
          router.replace(`/loan/${response.loan.id}`);
        },
      },
    );
  };

  const validation = readValidationErrors(
    requestLoan.error,
    LOAN_REQUEST_FIELDS,
  );
  const generalMessage = buildGeneralMessage(
    requestLoan.error,
    validation,
    forbiddenMessageOverride(requestLoan.error),
  );
  const submitDisabled =
    pending || !startDate || !endDate || message.trim() === '';

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Request to borrow',
          // iOS draws no back button for the first screen of a nested stack.
          headerLeft:
            Platform.OS === 'ios'
              ? () => <HeaderCancelButton onPress={() => router.back()} />
              : undefined,
        }}
      />

      <KeyboardAwareScrollView
        bottomOffset={spacing[16]}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        keyboardShouldPersistTaps="handled"
        testID="request-loan-form"
      >
        <View style={styles.section}>
          <DateField
            disabled={pending}
            error={validation.fields.start_date}
            field="start_date"
            label="Start date"
            minimumDate={today}
            onChange={changeStart}
            value={startDate}
          />
        </View>

        <View style={styles.section}>
          <DateField
            disabled={pending}
            error={validation.fields.end_date}
            field="end_date"
            label="End date"
            minimumDate={startDate ?? today}
            onChange={changeEnd}
            value={endDate}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Message</Text>
          <TextInput
            accessibilityLabel="Message"
            editable={!pending}
            maxLength={LOAN_MESSAGE_LIMIT}
            multiline
            onChangeText={changeMessage}
            placeholder="Say when you'd like to pick it up and how you'll use it."
            placeholderTextColor={colors.inputPlaceholder}
            style={[styles.input, styles.multiline, pending && styles.dim]}
            testID="request-loan-message"
            value={message}
          />
          <Text style={styles.counter} testID="request-loan-message-counter">
            {message.length}/{LOAN_MESSAGE_LIMIT}
          </Text>
          <FieldError field="message" message={validation.fields.message} />
        </View>

        <View style={styles.section}>
          {generalMessage ? (
            <Text style={styles.errorText} testID="request-loan-error">
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
            testID="request-loan-submit"
          >
            <Text style={styles.submitLabel}>
              {pending ? 'Sending...' : 'Send request'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

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
