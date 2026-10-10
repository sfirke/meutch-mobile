import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

// expo-router vendors React Navigation without exporting its base types.
type Navigation = NativeStackNavigationProp<Record<string, object | undefined>>;
type NavigationAction = Parameters<Navigation['dispatch']>[0];

/**
 * Asks before a dirty form leaves the stack, whether by header back, hardware
 * back, or a gesture. Call `allowLeave` before navigating away after a save.
 */
export function useDiscardGuard() {
  const navigation = useNavigation<Navigation>();
  const dirty = useRef(false);
  const leaving = useRef(false);
  const [blocked, setBlocked] = useState<NavigationAction | null>(null);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!dirty.current || leaving.current) {
          return;
        }

        event.preventDefault();
        setBlocked(event.data.action);
      }),
    [navigation],
  );

  const onDirtyChange = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  const allowLeave = useCallback(() => {
    leaving.current = true;
  }, []);

  const confirm = () => {
    const action = blocked;

    setBlocked(null);
    leaving.current = true;
    if (action) {
      navigation.dispatch(action);
    }
  };

  return {
    onDirtyChange,
    allowLeave,
    dialog: {
      visible: blocked !== null,
      onCancel: () => setBlocked(null),
      onConfirm: confirm,
    },
  };
}
