import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, typography } from '../../theme';

/** "99+" past `max`. */
export function formatCount(count: number, max = 99): string {
  return count > max ? `${max}+` : String(count);
}

export type CountBadgeProps = {
  count: number;
  max?: number;
  /** Defaults to "N unread". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Renders nothing for zero or less.
export function CountBadge({
  count,
  max = 99,
  accessibilityLabel,
  style,
  testID,
}: CountBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? `${count} unread`}
      accessible
      style={[styles.badge, style]}
      testID={testID}
    >
      <Text style={styles.text}>{formatCount(count, max)}</Text>
    </View>
  );
}

export type UnreadDotProps = {
  /** Leave out when the row already says it is unread. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function UnreadDot({
  accessibilityLabel,
  style,
  testID,
}: UnreadDotProps) {
  return (
    <View
      accessibilityElementsHidden={!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no'}
      style={[styles.dot, style]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.purple,
  },
  text: { ...typography.micro, color: colors.white },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.purple,
  },
});
