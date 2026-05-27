import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { environmentOptions, runtimeConfig } from '../config/env';

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
});
