import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { environmentOptions, runtimeConfig } from '../config/env';
import { useSession } from '../session/SessionProvider';

const brandColors = {
  primary: '#4fd1c7',
  primaryDark: '#319795',
  secondary: '#718096',
  warning: '#f6ad55',
  background: '#fffffe',
  surface: '#f7fafc',
  border: '#e2e8f0',
  text: '#2d3748',
};

export function AppShell() {
  const { errorMessage, refreshUser, signIn, signOut, status, user } =
    useSession();
  const [email, setEmail] = useState('');
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [password, setPassword] = useState('');

  const isBusy =
    status === 'restoring' ||
    status === 'signing-in' ||
    status === 'signing-out' ||
    isRefreshingProfile;
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

  async function handleRefreshProfile() {
    setIsRefreshingProfile(true);

    try {
      await refreshUser();
    } finally {
      setIsRefreshingProfile(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Meutch Mobile</Text>
          <Text style={styles.title}>JWT session handling is live.</Text>
          <Text style={styles.copy}>
            PR 3 proves login, refresh rotation, logout, and secure session
            restore against the existing Meutch API contract.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Current target</Text>
          <Text style={styles.cardValue}>{runtimeConfig.environmentName}</Text>
          <Text style={styles.cardMeta}>{runtimeConfig.apiBaseUrl}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Available targets</Text>
          {environmentOptions.map((option) => (
            <View key={option.name} style={styles.optionRow}>
              <Text style={styles.optionName}>{option.name}</Text>
              <Text style={styles.optionUrl}>{option.apiBaseUrl}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Auth status</Text>
          <Text style={styles.cardValue}>
            {status === 'signed-in' ? 'Signed in' : 'Session required'}
          </Text>
          <Text style={styles.cardMeta}>
            Access tokens stay short-lived, refresh tokens rotate on success,
            and logout clears the local session state.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorLabel}>Latest API response</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
        ) : null}

        {status === 'restoring' ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Restoring session</Text>
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={brandColors.primaryDark} />
              <Text style={styles.cardMeta}>
                Checking secure storage and validating the saved token bundle.
              </Text>
            </View>
          </View>
        ) : null}

        {status !== 'restoring' && !user ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sign in</Text>
            <Text style={styles.formHint}>
              Use an existing Meutch account. Invalid credentials return the
              backend JWT error response directly.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={email}
            />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <Pressable
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
        ) : null}

        {user ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Current user</Text>
            <Text style={styles.cardValue}>{user.full_name}</Text>
            <Text style={styles.cardMeta}>{user.email}</Text>
            <Text style={styles.listItem}>
              Email confirmed: {user.email_confirmed ? 'yes' : 'no'}
            </Text>
            <Text style={styles.listItem}>
              Profile sync uses the authenticated API wrapper instead of reading
              tokens in the component tree.
            </Text>
            <View style={styles.buttonRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => {
                  void handleRefreshProfile();
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (isBusy || pressed) && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {isRefreshingProfile ? 'Refreshing...' : 'Refresh profile'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={status === 'signing-out'}
                onPress={() => {
                  void signOut();
                }}
                style={({ pressed }) => [
                  styles.ghostButton,
                  (status === 'signing-out' || pressed) &&
                    styles.ghostButtonPressed,
                ]}
              >
                <Text style={styles.ghostButtonText}>
                  {status === 'signing-out' ? 'Signing out...' : 'Sign out'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>This PR covers</Text>
          <Text style={styles.listItem}>
            JWT login against /api/v1/auth/login.
          </Text>
          <Text style={styles.listItem}>
            Secure token persistence through Expo Secure Store.
          </Text>
          <Text style={styles.listItem}>
            Refresh-token rotation and forced sign-out on revoked families.
          </Text>
          <Text style={styles.listItem}>
            Session restore on launch plus explicit logout.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 18,
  },
  hero: {
    gap: 12,
    backgroundColor: '#edfdfb',
    borderColor: brandColors.primary,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  eyebrow: {
    color: brandColors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: brandColors.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  copy: {
    color: brandColors.secondary,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: brandColors.background,
    borderColor: brandColors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    shadowColor: brandColors.text,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  errorCard: {
    backgroundColor: '#fff7ed',
    borderColor: brandColors.warning,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  cardLabel: {
    color: brandColors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: brandColors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  cardMeta: {
    color: brandColors.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  errorLabel: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  errorMessage: {
    color: '#92400e',
    fontSize: 15,
    lineHeight: 22,
  },
  formHint: {
    color: brandColors.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    borderColor: brandColors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: brandColors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: brandColors.primaryDark,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonPressed: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    borderColor: brandColors.primary,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonPressed: {
    opacity: 0.75,
  },
  secondaryButtonText: {
    color: brandColors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
  ghostButton: {
    alignItems: 'center',
    borderColor: brandColors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ghostButtonPressed: {
    opacity: 0.75,
  },
  ghostButtonText: {
    color: brandColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  inlineStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  optionRow: {
    backgroundColor: brandColors.surface,
    borderColor: brandColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionName: {
    color: brandColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  optionUrl: {
    color: brandColors.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  listItem: {
    color: brandColors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
