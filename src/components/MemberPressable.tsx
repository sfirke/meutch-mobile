import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

export type MemberPressableUser = {
  id: string;
  full_name: string;
  profile_viewable: boolean;
};

export type MemberPressableProps = {
  user: MemberPressableUser;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Wraps children in a link to the member's profile when it's viewable.
// Otherwise renders the children plain, with no Pressable or a11y props, so
// nesting this inside another Pressable (feed card, list row) never creates
// a dead tap target.
export function MemberPressable({
  user,
  children,
  style,
}: MemberPressableProps) {
  const router = useRouter();

  if (!user.profile_viewable) {
    return <>{children}</>;
  }

  return (
    <Pressable
      accessibilityLabel={`View ${user.full_name}'s profile`}
      accessibilityRole="link"
      onPress={() => router.push(`/user/${user.id}`)}
      style={style}
    >
      {children}
    </Pressable>
  );
}
