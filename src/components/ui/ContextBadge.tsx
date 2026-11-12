import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ConversationContext } from '../../lib/messages';
import { colors, outline, radii, typography } from '../../theme';
import { TAG_TONE_COLORS, type TagTone } from './tags';

export type ContextBadgeKind = Exclude<ConversationContext['kind'], 'none'>;

const KIND_TONES: Record<ContextBadgeKind, TagTone> = {
  item: 'white',
  request: 'tangerine',
  circle: 'teal',
};

const KIND_NAMES: Record<ContextBadgeKind, string> = {
  item: 'Item',
  request: 'Request',
  circle: 'Circle',
};

/** Kind and label for a conversation's subject, or null when it has none. */
export function contextBadgeFor(
  context: ConversationContext,
): { kind: ContextBadgeKind; label: string } | null {
  switch (context.kind) {
    case 'item':
      return { kind: 'item', label: context.item.name };
    case 'request':
      return { kind: 'request', label: context.request.title };
    case 'circle':
      return { kind: 'circle', label: context.circle.name };
    case 'none':
      return null;
  }
}

export type ContextBadgeProps = {
  kind: ContextBadgeKind;
  /** The item name, request title or circle name; cut to one line. */
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ContextBadge({
  kind,
  label,
  style,
  testID,
}: ContextBadgeProps) {
  const { fill, text } = TAG_TONE_COLORS[KIND_TONES[kind]];

  return (
    <View
      accessibilityLabel={`${KIND_NAMES[kind]}: ${label}`}
      accessible
      style={[styles.badge, { backgroundColor: fill }, style]}
      testID={testID}
    >
      <Text numberOfLines={1} style={[styles.label, { color: text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderWidth: outline,
    borderColor: colors.ink,
    borderRadius: radii.tag,
  },
  label: { ...typography.micro, fontSize: 12.5 },
});
