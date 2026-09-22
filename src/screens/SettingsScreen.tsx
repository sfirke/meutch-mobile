import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme';

// Replaced in Stage 4 with the real settings form; this just proves the
// route and the session gate work.
export function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <EmptyState title="Coming soon" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
