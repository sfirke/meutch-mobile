import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../theme';

/**
 * Bottom padding for scroll content that runs to the screen edge, so the last
 * row clears the home indicator.
 */
export function useScrollBottomPadding() {
  return spacing[24] + useSafeAreaInsets().bottom;
}
