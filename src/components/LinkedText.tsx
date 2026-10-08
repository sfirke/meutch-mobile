import { Text, type TextProps } from 'react-native';

import { splitLinks } from '../lib/linkify';
import { openExternalUrl } from '../lib/openExternalUrl';
import { colors } from '../theme';

export type LinkedTextProps = TextProps & {
  text: string;
  linkColor?: string;
};

// Text whose http(s) and www. urls are tappable and open outside the app.
export function LinkedText({
  text,
  linkColor = colors.primaryDark,
  ...textProps
}: LinkedTextProps) {
  const segments = splitLinks(text);

  if (!segments.some((segment) => segment.kind === 'link')) {
    return <Text {...textProps}>{text}</Text>;
  }

  return (
    <Text {...textProps}>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          segment.text
        ) : (
          <Text
            accessibilityRole="link"
            key={index}
            onPress={() => openExternalUrl(segment.href)}
            style={{ color: linkColor, textDecorationLine: 'underline' }}
          >
            {segment.text}
          </Text>
        ),
      )}
    </Text>
  );
}
