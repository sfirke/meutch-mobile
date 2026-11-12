import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { colors, outline, radii, spacing, typography } from '../../theme';

const RING = 3;

// Shared look of a text input. Wrap the input in a `position: relative` view
// and render `<View pointerEvents="none" style={inputStyles.ring} />` after it
// while focused: the ring is drawn outside the box, so focus never shifts layout.
export const inputStyles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderColor: colors.muted,
    borderRadius: radii.control,
    borderWidth: outline,
    color: colors.ink,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
    ...typography.body,
  },
  focused: { borderColor: colors.ink },
  disabled: { backgroundColor: colors.paper },
  error: { borderColor: colors.danger },
  frame: { position: 'relative' },
  ring: {
    borderColor: colors.teal,
    borderRadius: radii.control + RING,
    borderWidth: RING,
    bottom: -RING,
    left: -RING,
    position: 'absolute',
    right: -RING,
    top: -RING,
  },
  label: { color: colors.ink, ...typography.label },
  help: { color: colors.muted, ...typography.meta },
});

export const inputPlaceholderColor = colors.muted;

// Focus state plus handlers that also forward the caller's own handlers.
export function useFocus<E>(onFocus?: (e: E) => void, onBlur?: (e: E) => void) {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    onFocus: (e: E) => {
      setFocused(true);
      onFocus?.(e);
    },
    onBlur: (e: E) => {
      setFocused(false);
      onBlur?.(e);
    },
  };
}
