import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RECOVERY_ERROR_OVERRIDES } from '../lib/accountRecovery';
import { describeError } from '../lib/errorCopy';
import { useResendConfirmationMutation } from '../query/useResendConfirmationMutation';
import { useSession } from '../session/SessionProvider';
import { colors, radii, shadows, spacing, typography } from '../theme';

export function SignInScreen() {
  const router = useRouter();
  const { errorCode, errorMessage, notice, signIn, status } = useSession();
  const resend = useResendConfirmationMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The email of the attempt that failed, not the live input.
  const [submittedEmail, setSubmittedEmail] = useState('');
  const isUnconfirmed = errorCode === 'FORBIDDEN';

  const isBusy = status === 'restoring' || status === 'signing-in';
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isBusy;

  async function handleSignIn() {
    if (!canSubmit) {
      return;
    }

    setSubmittedEmail(email);
    resend.reset();

    const nextUser = await signIn(email, password);

    if (nextUser) {
      setPassword('');
    }
  }

  function handleForgotPassword() {
    const trimmed = email.trim();

    router.push({
      pathname: '/forgot-password',
      params: trimmed ? { email: trimmed } : {},
    });
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
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Meutch</Text>
            <Text style={styles.title}>Borrow more, buy less.</Text>
            <Text style={styles.copy}>
              Sign in to see what the people around you are sharing.
            </Text>
          </View>

          {notice ? (
            <View style={styles.noticeCard} testID="sign-in-notice">
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {isUnconfirmed ? (
            <View style={styles.errorCard} testID="sign-in-unconfirmed">
              <Text style={styles.errorLabel}>Confirm your email</Text>
              {errorMessage ? (
                <Text style={styles.errorMessage}>{errorMessage}</Text>
              ) : null}
              <Text style={styles.errorMessage}>
                Can&apos;t find the email? We can send another one.
              </Text>
              {resend.isSuccess ? (
                <Text style={styles.errorMessage}>{resend.data.message}</Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={resend.isPending}
                  onPress={() => resend.mutate(submittedEmail)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    (resend.isPending || pressed) &&
                      styles.primaryButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {resend.isPending
                      ? 'Sending...'
                      : 'Resend confirmation email'}
                  </Text>
                </Pressable>
              )}
              {resend.isError ? (
                <Text style={styles.errorMessage}>
                  {
                    describeError(resend.error, RECOVERY_ERROR_OVERRIDES)
                      .message
                  }
                </Text>
              ) : null}
            </View>
          ) : errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorLabel}>Something went wrong</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sign in</Text>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.inputPlaceholder}
              returnKeyType="next"
              style={styles.input}
              textContentType="username"
              value={email}
            />
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              onChangeText={setPassword}
              onSubmitEditing={() => {
                void handleSignIn();
              }}
              placeholder="Password"
              placeholderTextColor={colors.inputPlaceholder}
              returnKeyType="go"
              secureTextEntry
              style={styles.input}
              textContentType="password"
              value={password}
            />
            <Pressable
              accessibilityLabel="Sign in"
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={() => {
                void handleSignIn();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                (!canSubmit || pressed) && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {status === 'signing-in' ? 'Signing in...' : 'Sign in'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleForgotPassword}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
          </View>
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
  cardLabel: {
    color: colors.primaryDark,
    ...typography.label,
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
  eyebrow: {
    color: colors.primaryDark,
    ...typography.eyebrow,
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
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  linkText: {
    color: colors.primaryDark,
    ...typography.label,
  },
  noticeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing[18],
  },
  noticeText: {
    color: colors.text,
    ...typography.meta,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  secondaryButtonText: {
    color: colors.errorLabel,
    ...typography.label,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
  },
  primaryButtonPressed: {
    opacity: 0.7,
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
