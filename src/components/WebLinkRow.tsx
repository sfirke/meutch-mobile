import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from './Icon';
import type { WebLink } from '../lib/profile';
import { colors, spacing, typography } from '../theme';

export type WebLinkRowProps = {
  link: WebLink;
  onPress: (url: string) => void;
};

// Tappable row for one of a member's web links. Does not call Linking
// itself; the screen decides how to open the url.
export function WebLinkRow({ link, onPress }: WebLinkRowProps) {
  return (
    <Pressable
      accessibilityLabel={link.display_name}
      accessibilityRole="link"
      onPress={() => onPress(link.url)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon color={colors.primaryDark} name="link" size={16} />
      <View style={styles.body}>
        <Text style={styles.displayName}>{link.display_name}</Text>
        {link.platform_name ? (
          <Text style={styles.platformName}>{link.platform_name}</Text>
        ) : null}
      </View>
      <Icon color={colors.secondary} name="chevron" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing[4],
    paddingHorizontal: spacing[12],
  },
  displayName: {
    color: colors.text,
    ...typography.body,
  },
  platformName: {
    color: colors.secondary,
    ...typography.meta,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing[12],
  },
});
