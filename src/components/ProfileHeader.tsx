import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { spacing, typography, colors } from '../theme';

export type ProfileHeaderUser = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image_url: string | null;
};

export type ProfileHeaderProps = {
  user: ProfileHeaderUser;
  /** Extra copy under the name, e.g. email or member-since text. */
  children?: ReactNode;
};

// Shared avatar + name header. Screens append their own copy (email,
// member-since, etc.) as children so this stays reusable across profile
// types that don't all carry the same fields.
export function ProfileHeader({ user, children }: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <Avatar size={72} testID="profile-avatar" user={user} />
      <View style={styles.headerCopy}>
        <Text style={styles.name}>{user.full_name}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[4],
  },
  name: {
    color: colors.text,
    ...typography.value,
  },
});
