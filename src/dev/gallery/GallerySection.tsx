import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type Props = { title: string; children: ReactNode };

export function GallerySection({ title, children }: Props) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

type ExampleProps = { label: string; children: ReactNode };

export function GalleryExample({ label, children }: ExampleProps) {
  return (
    <View style={styles.example}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[16] },
  title: { ...typography.h2, color: colors.ink },
  example: { gap: spacing[8] },
  label: { ...typography.micro, color: colors.muted },
});
