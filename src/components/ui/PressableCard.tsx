import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, outline, radii, spacing } from '../../theme';
import { Lifted } from './Lifted';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  // Overrides the 16 padding, e.g. 0 for a full-bleed photo.
  padding?: number;
  // See Lifted's reserveSpace. Off by default so it lines up with a Card.
  reserveOffset?: boolean;
  // Shows the pressed look without a press, for the dev gallery.
  previewPressed?: boolean;
  style?: StyleProp<ViewStyle>;
};

// A Card you can tap. Pressed, it gets an ink border and a 4px ink offset.
// The border width never changes, so nothing moves. Unless reserveOffset is
// set, the parent must leave 4px right and below (a screen gutter or list gap
// does) and must not clip it.
export function PressableCard({
  children,
  padding,
  reserveOffset = false,
  previewPressed = false,
  disabled,
  accessibilityRole = 'button',
  style,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      style={style}
    >
      {({ pressed }) => {
        const lifted = previewPressed || (pressed && !disabled);
        return (
          <Lifted offset="lg" reserveSpace={reserveOffset} showOffset={lifted}>
            <View
              style={[
                styles.card,
                lifted && styles.pressed,
                padding !== undefined && { padding },
              ]}
            >
              {children}
            </View>
          </Lifted>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardPaper,
    borderColor: colors.line,
    borderWidth: outline,
    borderRadius: radii.card,
    padding: spacing[16],
    overflow: 'hidden',
  },
  pressed: { borderColor: colors.ink },
});
