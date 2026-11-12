import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { UserSummary } from '../lib/parse';
import { colors, fonts, outline } from '../theme';

/** The fields an avatar reads; any user shape with them will do. */
export type AvatarUser = Pick<
  UserSummary,
  'first_name' | 'last_name' | 'full_name' | 'profile_image_url'
>;

type AvatarProps = {
  user: AvatarUser | null;
  /** Design sizes are 28, 34, 40 and 120; other numbers still render. */
  size?: number;
  testID?: string;
};

type Tone = { background: string; text: string };

const TONES: readonly Tone[] = [
  { background: colors.teal, text: colors.ink },
  { background: colors.tangerine, text: colors.ink },
  { background: colors.purple, text: colors.white },
];

/** First letter of the first and last word, upper-cased; `'?'` when empty. */
export function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';

  return `${first}${last}`.toUpperCase();
}

/** Fill and text colors picked by the name's length, spaces included. */
export function toneForName(name: string): Tone {
  return TONES[name.length % 3];
}

/** `'?'` covers a deleted account (`user` is `null`) or blank names. */
export function getInitials(user: AvatarUser | null): string {
  if (!user) {
    return '?';
  }

  return initialsFromName(`${user.first_name} ${user.last_name}`);
}

// Shared avatar: a photo when the user has one, otherwise initials on a
// circle. Used anywhere a `UserSummary` needs a face, from item detail on.
export function Avatar({ user, size = 34, testID = 'avatar' }: AvatarProps) {
  const dimensionStyle = { height: size, width: size, borderRadius: size / 2 };

  if (user?.profile_image_url) {
    return (
      <Image
        accessibilityLabel={user.full_name}
        contentFit="cover"
        source={{ uri: user.profile_image_url }}
        style={[styles.outlined, dimensionStyle]}
        testID={testID}
      />
    );
  }

  const tone = toneForName(user?.full_name ?? '');

  return (
    <View
      style={[
        styles.outlined,
        styles.fallback,
        dimensionStyle,
        { backgroundColor: tone.background },
      ]}
      testID={`${testID}-initials`}
    >
      <Text
        style={[styles.initials, { color: tone.text, fontSize: size * 0.36 }]}
      >
        {getInitials(user)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outlined: {
    borderColor: colors.ink,
    borderWidth: outline,
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.body[700],
  },
});
