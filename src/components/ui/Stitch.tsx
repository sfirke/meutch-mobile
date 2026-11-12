import { useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { stitch } from '../../theme';

type Props = {
  marginVertical?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const period = stitch.dash + stitch.gap;

// The running stitch: 14 on, 9 off, 3 tall, across the full width. Like the
// web's repeating gradient it starts with a dash on the left and the last one
// is cut off at the right edge. Decorative: never under running text, at most
// one or two per screen.
export function Stitch({ marginVertical = 0, style, testID }: Props) {
  const [width, setWidth] = useState(0);
  const count = Math.ceil(width / period);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      onLayout={onLayout}
      pointerEvents="none"
      style={[styles.row, { marginVertical }, style]}
      testID={testID}
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.dash} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: stitch.height,
    gap: stitch.gap,
    overflow: 'hidden',
  },
  dash: {
    width: stitch.dash,
    height: stitch.height,
    flexShrink: 0,
    backgroundColor: stitch.color,
  },
});
