import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme';

// Replaced in Stage 3 with the real circle detail view; this just proves
// the route and the session gate work.
export function CircleDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Circle' }} />
      <Text testID="route-id">{id}</Text>
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
