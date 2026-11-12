import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, offsets, outline, radii } from '../../theme';
import { Lifted } from './Lifted';

type Props = {
  children: ReactNode;
  radius?: number;
  /** Degrees; use the `tilt` tokens (1 to 5 either way). */
  tilt?: number;
  /** Adds a hard ink offset behind the frame. */
  lifted?: keyof typeof offsets;
  style?: StyleProp<ViewStyle>;
};

// A photo with an ink outline. Give it explicit width and height through
// `style` (or a sized parent). A tilted or lifted frame spills past its
// box, so the parent must leave room: about 4 to 8 on every side when
// tilted, plus the offset on the right and bottom when lifted.
export function PhotoFrame({
  children,
  radius = radii.control,
  tilt,
  lifted,
  style,
}: Props) {
  const frame = (
    <View style={[styles.frame, { borderRadius: radius }]}>{children}</View>
  );
  const transform = tilt ? [{ rotate: `${tilt}deg` }] : undefined;

  return (
    <View style={[style, transform && { transform }]}>
      {lifted ? (
        <Lifted offset={lifted} radius={radius} style={styles.fill}>
          {frame}
        </Lifted>
      ) : (
        frame
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { height: '100%', width: '100%' },
  frame: {
    borderColor: colors.ink,
    borderWidth: outline,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
});
