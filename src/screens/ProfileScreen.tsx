import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

// Placeholder: replaced with the real profile view in Stage 4. Sign out
// lives here now instead of the tab header (see the Stage 1 plan notes).
export function ProfileScreen() {
  const { signOut, status, user } = useSession();
  const isSigningOut = status === 'signing-out';

  return (
    <View style={styles.container}>
      {user ? <Text style={styles.name}>{user.full_name}</Text> : null}
      <Pressable
        accessibilityLabel="Sign out"
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={() => {
          void signOut();
        }}
        style={({ pressed }) => [
          styles.signOutButton,
          (isSigningOut || pressed) && styles.signOutButtonPressed,
        ]}
      >
        <Text style={styles.signOutLabel}>
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing[16],
  },
  name: {
    color: colors.text,
    ...typography.value,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing[12],
  },
  signOutButtonPressed: {
    opacity: 0.75,
  },
  signOutLabel: {
    color: colors.text,
    ...typography.buttonLarge,
  },
});
