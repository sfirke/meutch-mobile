import { Image } from 'expo-image';
import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { ItemImage } from '../lib/items';
import { colors, radii, spacing, typography } from '../theme';
import { ImagePlaceholder } from './ImagePlaceholder';

export type ImageCarouselProps = {
  /** Already sorted by `position` by the data layer. */
  images: ItemImage[];
  itemName: string;
};

type VisibleImage = {
  id: string;
  url: string;
};

const ASPECT_RATIO = 4 / 3;

function buildImageLabel(
  itemName: string,
  index: number,
  total: number,
): string {
  return total > 1
    ? `Photo ${index + 1} of ${total} of ${itemName}`
    : `Photo of ${itemName}`;
}

/** Paged photo strip for the item detail screen. Read-only; no zoom. */
export function ImageCarousel({ images, itemName }: ImageCarouselProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // A null url means the image failed to normalize; it has nothing to show.
  const visibleImages: VisibleImage[] = images.flatMap((image) =>
    image.url === null ? [] : [{ id: image.id, url: image.url }],
  );

  const frameStyle = { height: width / ASPECT_RATIO, width };

  if (visibleImages.length === 0) {
    return (
      <View style={[styles.frame, frameStyle]} testID="item-carousel-empty">
        <ImagePlaceholder />
      </View>
    );
  }

  const total = visibleImages.length;
  const currentIndex = Math.min(activeIndex, total - 1);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;

    setActiveIndex(width > 0 ? Math.round(offsetX / width) : 0);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleImages}
        getItemLayout={(_data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        horizontal
        keyExtractor={(image) => image.id}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        pagingEnabled
        renderItem={({ index, item }) => (
          <Image
            accessibilityLabel={buildImageLabel(itemName, index, total)}
            contentFit="cover"
            recyclingKey={item.id}
            source={{ uri: item.url }}
            style={[styles.frame, frameStyle]}
            testID="item-carousel-image"
            transition={150}
          />
        )}
        showsHorizontalScrollIndicator={false}
        testID="item-carousel"
      />

      {total > 1 ? (
        <View style={styles.indicator} testID="item-carousel-indicator">
          <Text style={styles.counter} testID="item-carousel-counter">
            {`${currentIndex + 1} / ${total}`}
          </Text>
          <View style={styles.dots}>
            {visibleImages.map((image, index) => (
              <View
                key={image.id}
                style={[styles.dot, index === currentIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    position: 'relative',
  },
  counter: {
    color: colors.onPrimaryText,
    ...typography.itemMeta,
    fontWeight: '700',
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: spacing[4],
    height: spacing[8],
    opacity: 0.6,
    width: spacing[8],
  },
  dotActive: {
    backgroundColor: colors.onPrimaryText,
    opacity: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  frame: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  indicator: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radii.lg,
    bottom: spacing[12],
    flexDirection: 'row',
    gap: spacing[8],
    opacity: 0.85,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    position: 'absolute',
    right: spacing[12],
  },
});
