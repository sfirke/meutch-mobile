import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme';
import { Icon } from './Icon';

type ImagePlaceholderProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Shown wherever an item has no photo: item cards, feed cards, the
// item-detail carousel. Icon-only so it still reads correctly at small
// thumbnail sizes, where a label would wrap or get clipped.
export function ImagePlaceholder({
  style,
  testID = 'image-placeholder',
}: ImagePlaceholderProps) {
  return (
    <View
      accessible
      accessibilityLabel="No photo"
      accessibilityRole="image"
      style={[styles.container, style]}
      testID={testID}
    >
      <Icon color={colors.secondary} name="image" size={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
});
