import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  ConversationCircleContext,
  ConversationContext,
} from '../lib/messages';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { ImagePlaceholder } from './ImagePlaceholder';

export type ThreadContextCardProps = {
  context: ConversationContext;
  sharedCircles: ConversationCircleContext[];
  onPressItem?: (itemId: string) => void;
  onPressCircle?: (circleId: string) => void;
  onPressRequest?: (requestId: string) => void;
};

const CIRCLE_TYPE_LABELS: Record<string, string> = {
  open: 'Open circle',
  closed: 'Closed circle',
  secret: 'Secret circle',
};

function describeCircleType(circleType: string): string {
  return CIRCLE_TYPE_LABELS[circleType] ?? 'Circle';
}

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : value.charAt(0).toUpperCase() + value.slice(1);
}

/** "You share Oak Street" / "... and 1 other circle" / "... and 2 other circles". */
export function describeSharedCircles(
  circles: ConversationCircleContext[],
): string | null {
  if (circles.length === 0) {
    return null;
  }

  const [first, ...rest] = circles;

  if (rest.length === 0) {
    return `You share ${first.name}`;
  }

  const noun = rest.length === 1 ? 'other circle' : 'other circles';

  return `You share ${first.name} and ${rest.length} ${noun}`;
}

export function ThreadContextCard({
  context,
  sharedCircles,
  onPressItem,
  onPressCircle,
  onPressRequest,
}: ThreadContextCardProps) {
  const sharedCirclesLine = describeSharedCircles(sharedCircles);

  if (context.kind === 'none' && !sharedCirclesLine) {
    return null;
  }

  return (
    <View style={styles.container}>
      {context.kind === 'item' ? (
        <Pressable
          accessibilityLabel={context.item.name}
          accessibilityRole="button"
          accessibilityState={{ disabled: !onPressItem }}
          onPress={onPressItem ? () => onPressItem(context.item.id) : undefined}
          style={styles.card}
        >
          <View style={styles.thumbBox}>
            {context.item.image_url ? (
              <Image
                accessibilityLabel={context.item.name}
                contentFit="cover"
                source={{ uri: context.item.image_url }}
                style={styles.thumb}
                testID="thread-context-thumbnail"
              />
            ) : (
              <ImagePlaceholder style={styles.thumb} />
            )}
          </View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {context.item.name}
            </Text>
            <Text style={styles.cardCaption}>Item</Text>
          </View>
        </Pressable>
      ) : null}

      {context.kind === 'circle' ? (
        <Pressable
          accessibilityLabel={context.circle.name}
          accessibilityRole="button"
          accessibilityState={{ disabled: !onPressCircle }}
          onPress={
            onPressCircle ? () => onPressCircle(context.circle.id) : undefined
          }
          style={styles.card}
        >
          <View style={styles.iconBox}>
            <Icon color={colors.secondary} name="circle" size={20} />
          </View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {context.circle.name}
            </Text>
            <Text style={styles.cardCaption}>
              {describeCircleType(context.circle.circle_type)}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {context.kind === 'request' ? (
        <Pressable
          accessibilityLabel={context.request.title}
          accessibilityRole="button"
          accessibilityState={{ disabled: !onPressRequest }}
          onPress={
            onPressRequest
              ? () => onPressRequest(context.request.id)
              : undefined
          }
          style={styles.card}
        >
          <View style={styles.iconBox}>
            <Icon color={colors.secondary} name="request" size={20} />
          </View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {context.request.title}
            </Text>
            <Text style={styles.cardCaption}>Request</Text>
          </View>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>
              {capitalize(context.request.status)}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {sharedCirclesLine ? (
        <Text style={styles.sharedCircles}>{sharedCirclesLine}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[12],
  },
  cardBody: {
    flex: 1,
    gap: spacing[4],
  },
  cardCaption: {
    color: colors.secondary,
    ...typography.itemMeta,
    fontSize: 12,
  },
  cardTitle: {
    color: colors.text,
    ...typography.itemName,
  },
  container: {
    gap: spacing[8],
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sharedCircles: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  statusChip: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  statusChipText: {
    color: colors.secondary,
    ...typography.label,
    fontSize: 11,
  },
  thumb: {
    height: '100%',
    width: '100%',
  },
  thumbBox: {
    borderRadius: radii.sm,
    height: 44,
    overflow: 'hidden',
    width: 44,
  },
});
