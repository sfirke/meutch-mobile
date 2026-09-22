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

import { useSession } from '../../src/session/SessionProvider';
import { colors, radii, shadows, spacing, typography } from '../../src/theme';

export default function SignInScreen() {
  const { errorMessage, signIn, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isBusy = status === 'restoring' || status === 'signing-in';
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isBusy;

  async function handleSignIn() {
    if (!canSubmit) {
      return;
    }

    const nextUser = await signIn(email, password);

    if (nextUser) {
      setPassword('');
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
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Meutch</Text>
            <Text style={styles.title}>Borrow more, buy less.</Text>
            <Text style={styles.copy}>
              Sign in to see what the people around you are sharing.
            </Text>
          </View>

          {errorMessage ? (
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
