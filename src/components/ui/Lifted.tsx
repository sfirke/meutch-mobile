import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, offsets, radii } from '../../theme';

export type LiftedOffset = keyof typeof offsets;

type Props = {
  children: ReactNode;
  offset?: LiftedOffset;
  radius?: number;
  color?: ColorValue;
  // False hides the offset but keeps the layout, for pressed or resting states.
  showOffset?: boolean;
  // Pads the wrapper right and bottom by the offset so it never leaves the box.
  reserveSpace?: boolean;
  style?: StyleProp<ViewStyle>;
};

// A hard diagonal offset behind the child (CSS `4px 4px 0 ink`), on every
// platform. The child should be opaque and share `radius`. Don't pad `style`.
// Without `reserveSpace` the offset draws `offsets[offset]` past the right and
// bottom edges, so the parent must leave that much room there and must not
// clip it. It never takes touches.
export function Lifted({
  children,
  offset = 'lg',
  radius = radii.card,
  color = colors.ink,
  showOffset = true,
  reserveSpace = false,
  style,
}: Props) {
  const distance = offsets[offset];
  const outside = reserveSpace ? 0 : -distance;

  return (
    <View
      style={[
        reserveSpace && { paddingRight: distance, paddingBottom: distance },
        style,
      ]}
    >
      {showOffset ? (
        <View
          pointerEvents="none"
          style={[
            styles.offset,
            {
              top: distance,
              left: distance,
              right: outside,
              bottom: outside,
              borderRadius: radius,
              backgroundColor: color,
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  offset: { position: 'absolute' },
});
