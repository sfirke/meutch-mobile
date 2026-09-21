import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '../../src/components/Icon';
import { RequireSession } from '../../src/components/RequireSession';
import { useSession } from '../../src/session/SessionProvider';
import { colors } from '../../src/theme';

function SignOutButton() {
  const { signOut, status } = useSession();
  const isSigningOut = status === 'signing-out';

  return (
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
  );
}

function renderSignOutButton() {
  return <SignOutButton />;
}

export default function TabsLayout() {
  return (
    <RequireSession>
      <Tabs
        screenOptions={{
          headerRight: renderSignOutButton,
          headerStyle: styles.header,
          headerTintColor: colors.text,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.secondary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, size }) => (
              <Icon color={color} name="feed" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: 'Browse',
            tabBarIcon: ({ color, size }) => (
              <Icon color={color} name="browse" size={size} />
            ),
          }}
        />
      </Tabs>
    </RequireSession>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
  },
  signOutButton: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signOutButtonPressed: {
    opacity: 0.75,
  },
  signOutLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
