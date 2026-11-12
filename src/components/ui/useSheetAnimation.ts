import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Modal animation for dialogs and sheets: none when reduce motion is on.
export function useSheetAnimation(): 'fade' | 'none' {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion ? 'none' : 'fade';
}
