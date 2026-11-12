import { Image } from 'expo-image';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme';

type ImagePlaceholderProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const defaultPhoto = require('../../assets/default_item_photo.png');

// Shown wherever an item has no photo: item cards, feed cards, the
// item-detail carousel. The default photo is contained on a wash, so it
// stays whole at thumbnail sizes and in wide carousel slots.
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
      <Image
        accessibilityElementsHidden
        contentFit="contain"
        source={defaultPhoto}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.tangerineWash,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
