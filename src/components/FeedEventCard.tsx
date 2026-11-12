import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  type AccessibilityActionEvent,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import type { FeedEvent } from '../lib/feed';
import { formatRelativeTime } from '../lib/relativeTime';
import {
  colors,
  fonts,
  outline,
  radii,
  spacing,
  tilt,
  typography,
} from '../theme';
import { Avatar } from './Avatar';
import { ImagePlaceholder } from './ImagePlaceholder';
import { MemberPressable } from './MemberPressable';
import { Card } from './ui/Card';
import { ItemTag } from './ui/ItemTag';
import { PhotoFrame } from './ui/PhotoFrame';
import { PressableCard } from './ui/PressableCard';
import { feedEventTag } from './ui/tags';

export type FeedEventCardProps = {
  event: FeedEvent;
  onPressItem?: (itemId: string) => void;
  onPressCircle?: (circleId: string) => void;
  onPressRequest?: (requestId: string) => void;
  style?: StyleProp<ViewStyle>;
  now?: Date;
};

const THUMB_SIZE = 68;
const COMPACT_THUMB_SIZE = 32;

function actorUser(event: FeedEvent) {
  return {
    first_name: event.actor_name,
    last_name: '',
    full_name: event.actor_name,
    profile_image_url: event.actor_avatar_url,
  };
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

/** A giveaway that has been handed off. The item is no longer viewable. */
function isClaimedGiveaway(event: FeedEvent): boolean {
  return event.event_type === 'giveaway' && event.claim_status === 'claimed';
}

function ClaimedGiveawayRow({
  event,
  now,
  style,
}: Pick<FeedEventCardProps, 'event' | 'now' | 'style'>) {
  const relativeTime = formatRelativeTime(event.created_at, now ?? new Date());
  const label = `${event.actor_name} ${event.action} ${event.title}, claimed`;

  return (
    <View
      accessibilityLabel={relativeTime ? `${label}, ${relativeTime}` : label}
      accessible
      style={[styles.claimedRow, style]}
      testID="feed-claimed-giveaway"
    >
      <Avatar size={28} user={actorUser(event)} />
      <Text numberOfLines={3} style={styles.claimedText}>
        <Text style={styles.claimedStrong}>{event.actor_name}</Text>
        {` ${event.action} `}
        <Text style={styles.claimedTitle}>{event.title}</Text>
      </Text>
      {event.image_url ? (
        <Image
          contentFit="cover"
          source={{ uri: event.image_url }}
          style={styles.claimedThumbnail}
        />
      ) : null}
      {relativeTime ? (
        <Text style={styles.claimedWhen}>{relativeTime}</Text>
      ) : null}
    </View>
  );
}

export function FeedEventCard({
  event,
  onPressItem,
  onPressCircle,
  onPressRequest,
  style,
  now,
}: FeedEventCardProps) {
  const router = useRouter();

  if (isClaimedGiveaway(event)) {
    return <ClaimedGiveawayRow event={event} now={now} style={style} />;
  }

  const tag = feedEventTag(event);
  const relativeTime = formatRelativeTime(event.created_at, now ?? new Date());
  const headlineText = `${event.actor_name} ${event.action} · ${event.title}`;
  const itemId = event.item_id;
  const onPress = resolveOnPress(event, {
    onPressItem,
    onPressCircle,
    onPressRequest,
  });

  const actorId = event.actor_id;
  // Gate on actor_profile_viewable, never actor_id alone: the feed includes
  // public activity from people the viewer can't view.
  const actorLinkable = actorId !== null && event.actor_profile_viewable;
  const goToActorProfile = () => {
    if (actorId !== null) {
      router.push(`/user/${actorId}`);
    }
  };

  const avatar = (
    <Avatar size={34} testID="feed-event-avatar" user={actorUser(event)} />
  );

  const body = (
    <View style={styles.row}>
      <View style={styles.main}>
        <View style={styles.actorLine}>
          {actorId !== null ? (
            <MemberPressable
              user={{
                id: actorId,
                full_name: event.actor_name,
                profile_viewable: event.actor_profile_viewable,
              }}
            >
              {avatar}
            </MemberPressable>
          ) : (
            avatar
          )}
          <Text style={styles.actorText}>
            {actorLinkable ? (
              <Text
                accessibilityRole="link"
                onPress={goToActorProfile}
                style={styles.actorName}
              >
                {event.actor_name}
              </Text>
            ) : (
              <Text style={styles.actorName}>{event.actor_name}</Text>
            )}
            {` ${event.action}${relativeTime ? ` · ${relativeTime}` : ''}`}
          </Text>
        </View>

        <Text style={styles.title}>{event.title}</Text>

        {event.description ? (
          <Text numberOfLines={2} style={styles.description}>
            {event.description}
          </Text>
        ) : null}

        {tag || event.distance ? (
          <View style={styles.tagRow}>
            {tag ? <ItemTag kind={tag} /> : null}
            {/* distance is a deliberately coarse bucket; render verbatim,
                never parse, reformat, compare, or sort by it. */}
            {event.distance ? (
              <Text style={styles.distance}>{`${event.distance} away`}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {event.image_url || itemId !== null ? (
        <PhotoFrame
          radius={radii.control}
          style={styles.thumbnail}
          tilt={tilt.thumb}
        >
          {event.image_url ? (
            <Image
              contentFit="cover"
              source={{ uri: event.image_url }}
              style={styles.thumbnailImage}
              testID="feed-event-thumbnail"
            />
          ) : (
            <ImagePlaceholder />
          )}
        </PhotoFrame>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <PressableCard
        accessibilityActions={
          actorLinkable
            ? [
                {
                  name: 'viewProfile',
                  label: `View ${event.actor_name}'s profile`,
                },
              ]
            : undefined
        }
        accessibilityLabel={headlineText}
        onAccessibilityAction={
          actorLinkable
            ? (accessibilityEvent: AccessibilityActionEvent) => {
                if (
                  accessibilityEvent.nativeEvent.actionName === 'viewProfile'
                ) {
                  goToActorProfile();
                }
              }
            : undefined
        }
        onPress={onPress}
        style={style}
      >
        {body}
      </PressableCard>
    );
  }

  return <Card style={style}>{body}</Card>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[16],
  },
  main: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  actorLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  actorText: {
    color: colors.muted,
    flex: 1,
    ...typography.label,
    fontFamily: fonts.body[400],
  },
  actorName: {
    color: colors.ink,
    fontFamily: fonts.body[700],
  },
  title: {
    color: colors.ink,
    marginTop: spacing[4],
    ...typography.h3,
  },
  description: {
    color: colors.muted,
    ...typography.label,
    fontFamily: fonts.body[400],
    lineHeight: 22,
  },
  tagRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[10],
    marginTop: spacing[4],
  },
  distance: {
    color: colors.muted,
    ...typography.meta,
  },
  thumbnail: {
    flexShrink: 0,
    height: THUMB_SIZE,
    marginTop: spacing[4],
    width: THUMB_SIZE,
  },
  thumbnailImage: {
    height: '100%',
    width: '100%',
  },
  claimedRow: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderStyle: 'dashed',
    borderWidth: outline,
    flexDirection: 'row',
    gap: spacing[8],
    opacity: 0.6,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  claimedText: {
    color: colors.muted,
    flex: 1,
    ...typography.meta,
  },
  claimedStrong: {
    color: colors.ink,
    fontFamily: fonts.body[700],
  },
  claimedTitle: {
    color: colors.ink,
    fontFamily: fonts.body[600],
  },
  claimedThumbnail: {
    borderColor: colors.line,
    borderRadius: radii.tag,
    borderWidth: outline,
    height: COMPACT_THUMB_SIZE,
    width: COMPACT_THUMB_SIZE,
  },
  claimedWhen: {
    color: colors.muted,
    ...typography.micro,
  },
});
