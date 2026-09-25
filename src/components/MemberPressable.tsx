import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type MemberPressableUser = {
  id: string;
  full_name: string;
  profile_viewable: boolean;
};

export type MemberPressableProps = {
  user: MemberPressableUser;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Overrides the default "View {full_name}'s profile" label. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

// Wraps children in a link to the member's profile when it's viewable.
// Otherwise renders the children plain, with no Pressable or a11y props, so
// nesting this inside another Pressable (feed card, list row) never creates
// a dead tap target.
export function MemberPressable({
  user,
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
}: MemberPressableProps) {
  const router = useRouter();

  if (!user.profile_viewable) {
    return <>{children}</>;
  }

  return (
    <Pressable
      accessibilityLabel={
        accessibilityLabel ?? `View ${user.full_name}'s profile`
      }
      accessibilityHint={accessibilityHint}
      accessibilityRole="link"
      onPress={() => router.push(`/user/${user.id}`)}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
});
