import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { UserSummary } from '../lib/parse';
import { colors, typography } from '../theme';

/** The fields an avatar reads; any user shape with them will do. */
export type AvatarUser = Pick<
  UserSummary,
  'first_name' | 'last_name' | 'full_name' | 'profile_image_url'
>;

type AvatarProps = {
  user: AvatarUser | null;
  size?: number;
  testID?: string;
};

/** `'?'` covers a deleted account (`user` is `null`) or blank names. */
export function getInitials(user: AvatarUser | null): string {
  if (!user) {
    return '?';
  }

  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`;

  return initials.trim().toUpperCase() || '?';
}

// Shared avatar: a photo when the user has one, otherwise initials on a
// circle. Used anywhere a `UserSummary` needs a face, from item detail on.
export function Avatar({ user, size = 40, testID = 'avatar' }: AvatarProps) {
  const dimensionStyle = { height: size, width: size, borderRadius: size / 2 };

  if (user?.profile_image_url) {
    return (
      <Image
        accessibilityLabel={user.full_name}
        contentFit="cover"
        source={{ uri: user.profile_image_url }}
        style={dimensionStyle}
        testID={testID}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, dimensionStyle]}
      testID={`${testID}-initials`}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {getInitials(user)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: colors.secondaryBackground,
    justifyContent: 'center',
  },
  initials: {
    color: colors.primaryDark,
    ...typography.label,
  },
});
