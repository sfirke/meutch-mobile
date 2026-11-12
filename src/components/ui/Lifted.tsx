import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, offsets, radii } from '../../theme';

type Props = {
  children: ReactNode;
  offset?: keyof typeof offsets;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

// A hard ink offset behind the child, the same on iOS, Android and web.
// The parent must leave `offsets[offset]` of room on the right and bottom.
export function Lifted({
  children,
  offset = 'lg',
  radius = radii.card,
  style,
}: Props) {
  const distance = offsets[offset];

  return (
    <View style={style}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            top: distance,
            left: distance,
            right: -distance,
            bottom: -distance,
            borderRadius: radius,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    backgroundColor: colors.ink,
  },
});
