import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConversationSummary } from '../lib/messages';
import { formatRelativeTime } from '../lib/relativeTime';
import { colors, radii, spacing, typography } from '../theme';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';

export type ConversationRowProps = {
  conversation: ConversationSummary;
  currentUserId: string;
  now: Date;
  onPress?: (conversation: ConversationSummary) => void;
};

/** Matches item detail's fallback for a deleted account. */
const DELETED_OTHER_USER_NAME = 'Deleted User';

function getContextChip(
  conversation: ConversationSummary,
): { icon: IconName; text: string } | null {
  const { context } = conversation;

  switch (context.kind) {
    case 'item':
      return { icon: 'image', text: context.item.name };
    case 'request':
      return { icon: 'request', text: context.request.title };
    case 'circle':
      return { icon: 'circle', text: context.circle.name };
    case 'none':
      return null;
    default: {
      const exhaustiveCheck: never = context;
      throw new Error(`Unhandled context kind: ${String(exhaustiveCheck)}`);
    }
  }
}

// Inbox row: avatar, name, a context chip when the conversation is tied to an
// item/request/circle, a one-line preview, and the relative time. Unread
// state is never colour-only: a dot, bold text, and an accessibility suffix.
export function ConversationRow({
  conversation,
  currentUserId,
  now,
  onPress,
}: ConversationRowProps) {
  const { latest_message: latestMessage, other_user: otherUser } = conversation;
  const unread = conversation.unread_count > 0;
  const name = otherUser ? otherUser.full_name : DELETED_OTHER_USER_NAME;
  const isOwnMessage = latestMessage.sender.id === currentUserId;
  const previewText = isOwnMessage
    ? `You: ${latestMessage.body}`
    : latestMessage.body;
  const relativeTime = formatRelativeTime(latestMessage.timestamp, now);
  const chip = getContextChip(conversation);
  const accessibilityLabel = unread ? `${name}, unread` : name;
  const isTappable = otherUser !== null && onPress !== undefined;

  const content = (
    <>
      <Avatar size={44} user={otherUser} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text
            numberOfLines={1}
            style={[styles.name, unread && styles.unreadText]}
          >
            {name}
          </Text>
          {relativeTime ? (
            <Text style={styles.time}>{relativeTime}</Text>
          ) : null}
        </View>

        {chip ? (
          <View style={styles.chip}>
            <Icon color={colors.secondary} name={chip.icon} size={11} />
            <Text numberOfLines={1} style={styles.chipText}>
              {chip.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.previewRow}>
          {unread ? (
            <View style={styles.unreadDot} testID="conversation-unread-dot" />
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.preview, unread && styles.unreadText]}
          >
            {previewText}
          </Text>
        </View>
      </View>
    </>
  );

  if (isTappable) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={() => onPress(conversation)}
        style={styles.row}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.row}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing[4],
  },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  chipText: {
    color: colors.secondary,
    ...typography.itemMeta,
    fontSize: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'space-between',
  },
  name: {
    color: colors.text,
    flexShrink: 1,
    ...typography.body,
  },
  preview: {
    color: colors.secondary,
    flex: 1,
    ...typography.itemMeta,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  time: {
    color: colors.secondary,
    ...typography.itemMeta,
    fontSize: 12,
  },
  unreadDot: {
    backgroundColor: colors.primaryDark,
    borderRadius: spacing[4],
    height: spacing[8],
    width: spacing[8],
  },
  unreadText: {
    color: colors.text,
    fontWeight: '700',
  },
});
