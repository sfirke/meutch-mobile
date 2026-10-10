import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormTextField } from '../components/FormTextField';
import { RECOVERY_ERROR_OVERRIDES } from '../lib/accountRecovery';
import { describeError, readFieldError } from '../lib/errorCopy';
import { useRequestPasswordResetMutation } from '../query/useRequestPasswordResetMutation';
import { colors, radii, shadows, spacing, typography } from '../theme';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const request = useRequestPasswordResetMutation();

  const canSubmit = email.trim().length > 0 && !request.isPending;
  const fieldError = request.isError
    ? readFieldError(request.error, 'email')
    : null;
  const errorCopy =
    request.isError && !fieldError
      ? describeError(request.error, RECOVERY_ERROR_OVERRIDES)
      : null;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sign-in');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {request.isSuccess ? (
            <View style={styles.card} testID="forgot-password-sent">
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.copy}>{request.data.message}</Text>
              <Text style={styles.copy}>
                The link in the email opens meutch.com, where you can choose a
                new password. Come back here to sign in afterwards.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={goBack}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.hero}>
                <Text style={styles.title}>Forgot your password?</Text>
                <Text style={styles.copy}>
                  Enter your email and we&apos;ll send you a link to choose a
                  new password.
                </Text>
              </View>

              {errorCopy ? (
                <View style={styles.errorCard} testID="forgot-password-error">
                  <Text style={styles.errorLabel}>{errorCopy.title}</Text>
                  <Text style={styles.errorMessage}>{errorCopy.message}</Text>
                </View>
              ) : null}

              <View style={styles.card}>
                <FormTextField
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  error={fieldError ?? undefined}
                  field="email"
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={setEmail}
                  textContentType="username"
                  value={email}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={!canSubmit}
                  onPress={() => request.mutate(email)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (!canSubmit || pressed) && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {request.isPending ? 'Sending...' : 'Send reset link'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={goBack}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Back to sign in</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[18],
    ...shadows.card,
  },
  content: {
    gap: spacing[18],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[24],
  },
  copy: {
    color: colors.secondary,
    ...typography.body,
  },
  errorCard: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[18],
  },
  errorLabel: {
    color: colors.errorLabel,
    ...typography.label,
  },
  errorMessage: {
    color: colors.errorText,
    ...typography.meta,
  },
  fill: {
    flex: 1,
  },
  hero: {
    backgroundColor: colors.heroBackground,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[24],
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  linkText: {
    color: colors.primaryDark,
    ...typography.label,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
  },
  primaryButtonText: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
});
