import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, typography } from '../../theme';

const TONES: Record<string, { fill: string; text: string }> = {
  pending: { fill: colors.tangerine, text: colors.ink },
  approved: { fill: colors.emerald, text: colors.white },
};

const OTHER = { fill: colors.muted, text: colors.white };

export type StatusBadgeProps = {
  /** A loan or extension status: "pending", "approved", "denied"… */
  status: string;
  /** Defaults to the status with a capital first letter. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function statusBadgeLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function StatusBadge({
  status,
  label,
  style,
  testID,
}: StatusBadgeProps) {
  const { fill, text } = TONES[status] ?? OTHER;

  return (
    <View
      style={[styles.badge, { backgroundColor: fill }, style]}
      testID={testID}
    >
      <Text style={[styles.label, { color: text }]}>
        {label ?? statusBadgeLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.tag,
  },
  label: { ...typography.micro },
});
