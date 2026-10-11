import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useState } from 'react';

// expo-router vendors React Navigation without exporting its base types.
type Navigation = NativeStackNavigationProp<Record<string, object | undefined>>;
type NavigationAction = Parameters<Navigation['dispatch']>[0];

/**
 * Asks before a dirty form leaves the stack, whether by header back, hardware
 * back, or a gesture. Call `allowLeave` before navigating away after a save.
 */
export function useDiscardGuard() {
  const navigation = useNavigation<Navigation>();
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [blocked, setBlocked] = useState<NavigationAction | null>(null);

  // usePreventRemove rather than a bare beforeRemove listener: the native
  // stack has to know up front, or an iOS swipe pops the screen regardless.
  usePreventRemove(dirty && !leaving, ({ data }) => setBlocked(data.action));

  // The guard only lifts on the next render, so a leave that was allowed or
  // confirmed is replayed here once it has.
  useEffect(() => {
    if (leaving && blocked) {
      navigation.dispatch(blocked);
    }
  }, [leaving, blocked, navigation]);

  const allowLeave = useCallback(() => setLeaving(true), []);

  return {
    onDirtyChange: setDirty,
    allowLeave,
    dialog: {
      visible: blocked !== null && !leaving,
      onCancel: () => setBlocked(null),
      onConfirm: allowLeave,
    },
  };
}
