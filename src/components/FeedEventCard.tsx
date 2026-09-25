import { Image } from 'expo-image';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import type { FeedEvent, FeedEventType } from '../lib/feed';
import { formatRelativeTime } from '../lib/relativeTime';
import { colors, radii, shadows, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';
import { ImagePlaceholder } from './ImagePlaceholder';

export type FeedEventCardProps = {
  event: FeedEvent;
  onPressItem?: (itemId: string) => void;
  onPressCircle?: (circleId: string) => void;
  onPressRequest?: (requestId: string) => void;
  style?: StyleProp<ViewStyle>;
  now?: Date;
};

type EventTypeMeta = {
  label: string;
  icon: IconName;
  backgroundColor: string;
  textColor: string;
};

function getEventTypeMeta(eventType: FeedEventType): EventTypeMeta {
  switch (eventType) {
    case 'request':
      return {
        label: 'Request',
        icon: 'request',
        backgroundColor: colors.warning,
        textColor: colors.text,
      };
    case 'giveaway':
      return {
        label: 'Giveaway',
        icon: 'giveaway',
        backgroundColor: colors.success,
        textColor: colors.onPrimaryText,
      };
    case 'lent':
      return {
        label: 'Loan',
        icon: 'loan',
        backgroundColor: colors.primaryDark,
        textColor: colors.onPrimaryText,
      };
    case 'circle_join':
      return {
        label: 'Circle',
        icon: 'circle',
        backgroundColor: colors.secondary,
        textColor: colors.onPrimaryText,
      };
    default: {
      const exhaustiveCheck: never = eventType;
      throw new Error(`Unhandled feed event type: ${String(exhaustiveCheck)}`);
    }
  }
}

function getInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]);

  if (letters.length === 0) {
    return '';
  }

  const first = letters[0] ?? '';
  const last = letters.length > 1 ? (letters[letters.length - 1] ?? '') : '';

  return (first + last).toUpperCase();
}

type PressHandlers = Pick<
  FeedEventCardProps,
  'onPressItem' | 'onPressCircle' | 'onPressRequest'
>;

/** An item link wins; otherwise a circle join opens its circle and a request opens itself. */
function resolveOnPress(
  event: FeedEvent,
  { onPressItem, onPressCircle, onPressRequest }: PressHandlers,
): (() => void) | null {
  const { circle_id: circleId, item_id: itemId, request_id: requestId } = event;

  if (itemId !== null && onPressItem) {
    return () => onPressItem(itemId);
  }

  if (
    event.event_type === 'circle_join' &&
    circleId !== null &&
    onPressCircle
  ) {
    return () => onPressCircle(circleId);
  }

  if (event.event_type === 'request' && requestId !== null && onPressRequest) {
    return () => onPressRequest(requestId);
  }

  return null;
}

export function FeedEventCard({
  event,
  onPressItem,
  onPressCircle,
  onPressRequest,
  style,
  now,
}: FeedEventCardProps) {
  const meta = getEventTypeMeta(event.event_type);
  const relativeTime = formatRelativeTime(event.created_at, now ?? new Date());
  const headline = `${event.actor_name} ${event.action} · ${event.title}`;
  const itemId = event.item_id;
  const onPress = resolveOnPress(event, {
    onPressItem,
    onPressCircle,
    onPressRequest,
  });

  const body = (
    <>
      <View style={styles.header}>
        {event.actor_avatar_url ? (
          <Image
            source={{ uri: event.actor_avatar_url }}
            style={styles.avatar}
            testID="feed-event-avatar"
          />
        ) : (
          <View
            style={styles.avatarFallback}
            testID="feed-event-avatar-initials"
          >
            <Text style={styles.avatarInitials}>
              {getInitials(event.actor_name)}
            </Text>
          </View>
        )}
        <View style={styles.headerText}>
          {/*
            The actor is not tappable in this PR. When it becomes tappable
            (profile screens land in PR 5), gate it on
            actor_profile_viewable, never on actor_id != null — the feed
            includes public activity from people whose profiles the viewer
            may not be allowed to open.
          */}
          <Text style={styles.headline}>{headline}</Text>
          <View style={styles.metaRow}>
            <View
              style={[styles.chip, { backgroundColor: meta.backgroundColor }]}
            >
              <Icon color={meta.textColor} name={meta.icon} size={11} />
              <Text style={[styles.chipLabel, { color: meta.textColor }]}>
                {meta.label}
              </Text>
            </View>
            {relativeTime ? (
              <Text style={styles.metaText}>{relativeTime}</Text>
            ) : null}
            {/* distance is a deliberately coarse bucket; render verbatim,
                never parse, reformat, compare, or sort by it. */}
            {event.distance ? (
              <View style={styles.distanceRow}>
                <Icon color={colors.secondary} name="location" size={11} />
                <Text style={styles.metaText}>{event.distance}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {event.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}

      {event.image_url ? (
        <Image
          source={{ uri: event.image_url }}
          style={styles.thumbnail}
          contentFit="cover"
          testID="feed-event-thumbnail"
        />
      ) : itemId !== null ? (
        <ImagePlaceholder style={styles.thumbnail} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={headline}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          style,
        ]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    gap: spacing[12],
    padding: spacing[16],
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  avatar: {
    borderRadius: radii.lg,
    height: 40,
    width: 40,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.secondaryBackground,
    borderRadius: radii.lg,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarInitials: {
    color: colors.primaryDark,
    ...typography.itemMeta,
  },
  headerText: {
    flex: 1,
    gap: spacing[8],
  },
  headline: {
    color: colors.text,
    ...typography.body,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  chip: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  chipLabel: {
    ...typography.label,
  },
  distanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[4],
  },
  metaText: {
    color: colors.secondary,
    ...typography.meta,
  },
  description: {
    color: colors.text,
    ...typography.meta,
  },
  thumbnail: {
    borderRadius: radii.sm,
    height: 160,
    width: '100%',
  },
});
