import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { colors, radii } from '../../theme';

type Props = {
  // One emphasised word (or a short phrase, which won't wrap).
  children: string;
  // Off: nest it inside the headline's <Text>; it inherits the font.
  // On: a box of its own to sit beside a headline; give it `textStyle`.
  block?: boolean;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

const NBSP = ' ';
// Narrow no-break spaces stand in for the web's 0 0.16em padding on native.
const NNBSP = ' ';

// The teal paper strip from the web's `.paper-strip`, tilted -1°.
//   <Text style={h1}>What if <PaperStrip>borrowing</PaperStrip> was easy?</Text>
// Inline, the web gets the full look. Native text can't rotate or round a
// nested span, so there it is a flat teal highlight. Use `block` (beside the
// headline, e.g. in a row with alignItems 'baseline') for the tilt on native.
export function PaperStrip({
  children,
  block = false,
  textStyle,
  testID,
}: Props) {
  const word = children.replace(/ /g, NBSP);

  if (block) {
    const fontSize = StyleSheet.flatten(textStyle)?.fontSize ?? 16;
    return (
      <View
        style={[styles.block, { paddingHorizontal: fontSize * 0.16 }]}
        testID={testID}
      >
        <Text style={[textStyle, styles.ink]}>{word}</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Text style={[styles.inline, webInline]} testID={testID}>
        {word}
      </Text>
    );
  }

  return (
    <Text style={styles.inline} testID={testID}>
      {NNBSP + word + NNBSP}
    </Text>
  );
}

// CSS-only values that React Native's types don't know.
const webInline = {
  display: 'inline-block',
  whiteSpace: 'nowrap',
  paddingLeft: '0.16em',
  paddingRight: '0.16em',
  borderRadius: radii.tag,
  transform: [{ rotate: '-1deg' }],
} as unknown as TextStyle;

const styles = StyleSheet.create({
  ink: { color: colors.ink },
  inline: { color: colors.ink, backgroundColor: colors.teal },
  block: {
    alignSelf: 'flex-start',
    backgroundColor: colors.teal,
    borderRadius: radii.tag,
    transform: [{ rotate: '-1deg' }],
  },
});
