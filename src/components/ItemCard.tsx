import { Image } from 'expo-image';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { ItemSummary } from '../lib/items';
import { colors, spacing, typography } from '../theme';
import { ImagePlaceholder } from './ImagePlaceholder';
import { Card } from './ui/Card';
import { ItemTag } from './ui/ItemTag';
import { PressableCard } from './ui/PressableCard';
import { ITEM_TAG_LABELS, itemStatusTag } from './ui/tags';

export type ItemCardProps = {
  item: ItemSummary;
  onPress?: (item: ItemSummary) => void;
  style?: StyleProp<ViewStyle>;
};

export function ItemCard({ item, onPress, style }: ItemCardProps) {
  const statusTag = itemStatusTag(item);
  const description = item.description?.trim() || null;
  const accessibilityLabel = statusTag
    ? `${item.name}, ${ITEM_TAG_LABELS[statusTag]}`
    : item.name;

  const content = (
    <>
      <View style={styles.photo}>
        {item.image_url ? (
          <Image
            accessibilityLabel={item.name}
            contentFit="cover"
            recyclingKey={item.id}
            source={{ uri: item.image_url }}
            style={styles.image}
            testID="item-card-image"
            transition={150}
          />
        ) : (
          <ImagePlaceholder />
        )}
        {statusTag ? <ItemTag kind={statusTag} onPhoto /> : null}
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>

        {description ? (
          <Text numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        ) : null}

        <Text numberOfLines={1} style={styles.meta}>
          {item.category.name}
        </Text>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <Card
        accessibilityLabel={accessibilityLabel}
        padding={0}
        style={[styles.card, style]}
      >
        {content}
      </Card>
    );
  }

  return (
    <PressableCard
      accessibilityLabel={accessibilityLabel}
      onPress={() => onPress(item)}
      padding={0}
      style={[styles.card, style]}
    >
      {content}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  photo: {
    aspectRatio: 5 / 4,
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  body: {
    gap: spacing[4],
    padding: spacing[12],
  },
  name: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  description: {
    color: colors.muted,
    ...typography.caption,
  },
  meta: {
    color: colors.muted,
    marginTop: spacing[4],
    ...typography.meta,
  },
});
