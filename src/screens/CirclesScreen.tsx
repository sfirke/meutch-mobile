import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme';

// Placeholder: replaced with the real circles list in Stage 3.
export function CirclesScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        message="Circles are the groups you share items with."
        title="You're not in any circles yet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
