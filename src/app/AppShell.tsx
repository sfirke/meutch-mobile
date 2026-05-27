import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { environmentOptions, runtimeConfig } from '../config/env';

export function AppShell() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Meutch Mobile</Text>
          <Text style={styles.title}>
            Expo baseline is wired and ready for auth work.
          </Text>
          <Text style={styles.copy}>
            This PR keeps the app shell intentionally small while locking in the
            environment and API target foundation for the next slice.
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
          <Text style={styles.cardLabel}>Next up</Text>
          <Text style={styles.listItem}>
            Implement JWT login, refresh rotation, and logout.
          </Text>
          <Text style={styles.listItem}>
            Persist the token bundle securely on device.
          </Text>
          <Text style={styles.listItem}>
            Restore the last valid session on app launch.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f2e8',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  hero: {
    gap: 12,
  },
  eyebrow: {
    color: '#9b4d1f',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1f2d2f',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  copy: {
    color: '#4e5c5e',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#fffdf8',
    borderColor: '#e0d9c6',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  cardLabel: {
    color: '#4e5c5e',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: '#1f2d2f',
    fontSize: 24,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#4e5c5e',
    fontSize: 15,
    lineHeight: 22,
  },
  optionRow: {
    gap: 4,
  },
  optionName: {
    color: '#1f2d2f',
    fontSize: 16,
    fontWeight: '600',
  },
  optionUrl: {
    color: '#4e5c5e',
    fontSize: 14,
    lineHeight: 20,
  },
  listItem: {
    color: '#1f2d2f',
    fontSize: 15,
    lineHeight: 22,
  },
});
