import { StyleSheet, Text, View } from 'react-native';

import { hasLinks } from '../lib/linkify';
import type { MessageSummary } from '../lib/messages';
import { formatRelativeTime } from '../lib/relativeTime';
import { LinkedText } from './LinkedText';
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
  const prefix = isOwn ? 'You:' : `${message.sender.first_name}:`;
  // A grouped accessible label would hide nested links from screen readers.
  const linked = hasLinks(message.body);

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        accessible={linked ? undefined : true}
        accessibilityLabel={linked ? undefined : `${prefix} ${message.body}`}
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
        testID={isOwn ? 'message-bubble-own' : 'message-bubble-other'}
      >
        {linked ? <Text style={styles.srOnly}>{prefix}</Text> : null}
        <LinkedText
          linkColor={isOwn ? colors.onPrimaryText : undefined}
          style={isOwn ? styles.textOwn : styles.textOther}
          text={message.body}
        />
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
  srOnly: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
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
