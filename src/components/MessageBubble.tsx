import { StyleSheet, Text, View } from 'react-native';

import type { MessageSummary } from '../lib/messages';
import { formatRelativeTime } from '../lib/relativeTime';
import { colors, radii, spacing, typography } from '../theme';

export type MessageBubbleProps = {
  message: MessageSummary;
  isOwn: boolean;
  now: Date;
};

// A single thread message. Own messages align right on the brand color;
// others align left on the neutral surface. Body text always wraps.
export function MessageBubble({ message, isOwn, now }: MessageBubbleProps) {
  const relativeTime = formatRelativeTime(message.timestamp, now);
  const label = isOwn
    ? `You: ${message.body}`
    : `${message.sender.first_name}: ${message.body}`;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        accessible
        accessibilityLabel={label}
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
        testID={isOwn ? 'message-bubble-own' : 'message-bubble-other'}
      >
        <Text style={isOwn ? styles.textOwn : styles.textOther}>
          {message.body}
        </Text>
        {relativeTime ? (
          <Text
            style={[styles.time, isOwn ? styles.textOwn : styles.textOther]}
          >
            {relativeTime}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radii.sm,
    gap: spacing[4],
    maxWidth: '80%',
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  bubbleOther: {
    backgroundColor: colors.surface,
  },
  bubbleOwn: {
    backgroundColor: colors.primaryDark,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing[4],
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  textOther: {
    color: colors.text,
    ...typography.body,
  },
  textOwn: {
    color: colors.onPrimaryText,
    ...typography.body,
  },
  time: {
    fontSize: 12,
    opacity: 0.75,
  },
});
