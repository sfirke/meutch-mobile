import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, outline, radii, tilt, typography } from '../../theme';
import { Lifted } from './Lifted';
import {
  ITEM_TAG_LABELS,
  ITEM_TAG_TONES,
  TAG_TONE_COLORS,
  type ItemTagKind,
  type TagTone,
} from './tags';

type Common = {
  /** Pins the tag to a photo's top-left corner, tilted, with a 2px offset. */
  onPhoto?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type ItemTagProps = Common &
  (
    | { kind: ItemTagKind; label?: never; tone?: never }
    | { kind?: never; label: string; tone?: TagTone }
  );

export function ItemTag({
  kind,
  label,
  tone,
  onPhoto = false,
  accessibilityLabel,
  style,
  testID,
}: ItemTagProps) {
  const text = kind ? ITEM_TAG_LABELS[kind] : label;
  const { fill, text: textColor } =
    TAG_TONE_COLORS[kind ? ITEM_TAG_TONES[kind] : (tone ?? 'white')];

  const tag = (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel ? true : undefined}
      style={[styles.tag, { backgroundColor: fill }, !onPhoto && style]}
      testID={testID}
    >
      <Text numberOfLines={1} style={[styles.label, { color: textColor }]}>
        {text}
      </Text>
    </View>
  );

  if (!onPhoto) {
    return tag;
  }

  return (
    <Lifted offset="sm" radius={radii.tag} style={[styles.onPhoto, style]}>
      {tag}
    </Lifted>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: outline,
    borderColor: colors.ink,
    borderRadius: radii.tag,
  },
  label: { ...typography.tag },
  onPhoto: {
    position: 'absolute',
    top: 12,
    left: 12,
    transform: [{ rotate: `${tilt.tag}deg` }],
  },
});
