import { useState } from 'react';
import {
  StyleSheet,
  View,
  type ColorValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { pinked } from '../../theme';

type Props = {
  // The band's own color: the teeth are the band, cut with pinking shears.
  color: ColorValue;
  // Which way the teeth point: down under a band, up over one.
  direction: 'up' | 'down';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const half = pinked.toothWidth / 2;

// A pinked edge: a row of 24×12 triangles, drawn with the border trick. Put it
// directly under (down) or over (up) a band of `color`. Only for big moments
// such as a hero band, never on cards or everyday screens.
export function PinkedEdge({ color, direction, style, testID }: Props) {
  const [width, setWidth] = useState(0);
  const count = Math.ceil(width / pinked.toothWidth);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const tooth =
    direction === 'down'
      ? { borderTopWidth: pinked.toothHeight, borderTopColor: color }
      : { borderBottomWidth: pinked.toothHeight, borderBottomColor: color };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      onLayout={onLayout}
      pointerEvents="none"
      style={[styles.row, style]}
      testID={testID}
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.tooth, tooth]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: pinked.toothHeight,
    overflow: 'hidden',
  },
  tooth: {
    width: 0,
    height: 0,
    flexShrink: 0,
    borderLeftWidth: half,
    borderRightWidth: half,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
