import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, outline, radii, spacing } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Lifted } from './Lifted';

export type BannerTone = 'success' | 'info' | 'warning' | 'danger';

export type BannerProps = {
  tone: BannerTone;
  children: ReactNode;
  title?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const FILLS: Record<BannerTone, ColorValue> = {
  success: colors.tealWash,
  info: colors.tealWash,
  warning: colors.tangerineWash,
  danger: colors.dangerWash,
};

// Inline notice. Its 3px offset sits inside its own box, so no extra margin
// is needed, even at the edge of a padded screen.
export function Banner({
  tone,
  children,
  title,
  icon,
  action,
  onDismiss,
  testID,
  style,
}: BannerProps) {
  const isDanger = tone === 'danger';

  return (
    <Lifted offset="md" radius={radii.control} reserveSpace style={style}>
      <View
        accessible={isDanger && !action && !onDismiss}
        accessibilityLiveRegion={isDanger ? 'assertive' : 'polite'}
        accessibilityRole={isDanger ? 'alert' : undefined}
        style={[styles.box, { backgroundColor: FILLS[tone] }]}
        testID={testID}
      >
        {icon ? (
          <View style={styles.icon}>
            <Icon color={colors.ink} name={icon} size={18} />
          </View>
        ) : null}
        <View style={styles.body}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {typeof children === 'string' ? (
            <Text style={styles.text}>{children}</Text>
          ) : (
            children
          )}
          {action ? (
            <Button
              label={action.label}
              onPress={action.onPress}
              size="sm"
              style={styles.action}
              variant="outline"
            />
          ) : null}
        </View>
        {onDismiss ? (
          <IconButton
            accessibilityLabel="Dismiss"
            icon="clear"
            onPress={onDismiss}
            variant="ghost"
          />
        ) : null}
      </View>
    </Lifted>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'flex-start',
    borderColor: colors.ink,
    borderRadius: radii.control,
    borderWidth: outline,
    flexDirection: 'row',
    gap: spacing[10],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  icon: { paddingTop: 2 },
  body: { flex: 1, flexShrink: 1, gap: spacing[4] },
  title: { color: colors.ink, fontFamily: fonts.display[600], fontSize: 17 },
  text: {
    color: colors.ink,
    fontFamily: fonts.body[500],
    fontSize: 16,
    lineHeight: 23,
  },
  action: { alignSelf: 'flex-start' },
});
