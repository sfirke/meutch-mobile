import { Image } from 'expo-image';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import type { ItemSummary } from '../lib/items';
import { colors, radii, shadows, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { ImagePlaceholder } from './ImagePlaceholder';
import { getAvailabilityBadge, type AvailabilityBadgeTone } from './itemBadge';

export type ItemCardProps = {
  item: ItemSummary;
  onPress?: (item: ItemSummary) => void;
  style?: StyleProp<ViewStyle>;
};

const badgeToneColors: Record<AvailabilityBadgeTone, string> = {
  success: colors.success,
  warning: colors.warning,
};

function buildAccessibilityLabel(
  item: ItemSummary,
  badgeLabel: string | undefined,
): string {
  const parts = [item.name];

  if (item.is_giveaway) {
    parts.push('Giveaway');
  }

  if (badgeLabel) {
    parts.push(badgeLabel);
  }

  return parts.join(', ');
}

export function ItemCard({ item, onPress, style }: ItemCardProps) {
  const badge = getAvailabilityBadge(item);
  const truncatedDescription = item.description?.trim() || null;

  return (
    <Pressable
      accessibilityLabel={buildAccessibilityLabel(item, badge?.label)}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress ? () => onPress(item) : undefined}
      style={[styles.card, style]}
    >
      <View style={styles.imageBox}>
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

        {item.is_giveaway ? (
          <View style={styles.ribbon}>
            <Icon color={colors.onPrimaryText} name="giveaway" size={11} />
            <Text style={styles.ribbonText}>GIVEAWAY</Text>
          </View>
        ) : null}

        {badge ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeToneColors[badge.tone] },
            ]}
          >
            <Icon color={colors.onPrimaryText} name={badge.icon} size={11} />
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>

        {truncatedDescription ? (
          <Text numberOfLines={3} style={styles.description}>
            {truncatedDescription}
          </Text>
        ) : null}

        <View style={styles.categoryChip}>
          <Icon color={colors.secondary} name="category" size={11} />
          <Text style={styles.categoryText}>{item.category.name}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    position: 'absolute',
    right: spacing[8],
    top: spacing[8],
  },
  badgeText: {
    color: colors.onPrimaryText,
    ...typography.label,
    fontSize: 11,
  },
  body: {
    gap: spacing[4],
    padding: spacing[10],
  },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
    ...shadows.card,
  },
  categoryChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[4],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  categoryText: {
    color: colors.secondary,
    ...typography.itemMeta,
    fontSize: 12,
  },
  description: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageBox: {
    aspectRatio: 4 / 3,
    position: 'relative',
    width: '100%',
  },
  name: {
    color: colors.text,
    ...typography.itemName,
  },
  ribbon: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[4],
    left: spacing[8],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    position: 'absolute',
    top: spacing[8],
  },
  ribbonText: {
    color: colors.onPrimaryText,
    ...typography.label,
    fontSize: 11,
  },
});
