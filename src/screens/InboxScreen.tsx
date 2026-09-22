import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme';

// Placeholder: replaced with the real inbox list in Stage 2.
export function InboxScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        message="Conversations about items and circles will show up here."
        title="No messages yet"
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
