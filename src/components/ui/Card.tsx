import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { colors, outline, radii, spacing } from '../../theme';
import { Lifted } from './Lifted';

export type CardVariant = 'content' | 'callout' | 'attention';

type Props = Omit<ViewProps, 'style' | 'children'> & {
  children: ReactNode;
  // content: the everyday white card. callout and attention are set-apart
  // panels (web `.callout`, `.attention-panel`).
  variant?: CardVariant;
  // Overrides the variant's padding, e.g. 0 for a full-bleed photo.
  padding?: number;
  // callout only: see Lifted's reserveSpace.
  reserveOffset?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  variant = 'content',
  padding,
  reserveOffset = false,
  style,
  ...rest
}: Props) {
  const box = [
    styles.base,
    variantStyles[variant],
    padding !== undefined && {
      paddingVertical: padding,
      paddingHorizontal: padding,
    },
  ];

  if (variant === 'callout') {
    // The callout's 4px offset needs 4px of room right and below.
    return (
      <Lifted offset="lg" reserveSpace={reserveOffset} style={style}>
        <View {...rest} style={box}>
          {children}
        </View>
      </Lifted>
    );
  }

  return (
    <View {...rest} style={[box, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: outline,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
});

const variantStyles = StyleSheet.create({
  content: {
    backgroundColor: colors.cardPaper,
    borderColor: colors.line,
    padding: spacing[16],
  },
  callout: {
    backgroundColor: colors.tealWash,
    borderColor: colors.ink,
    padding: spacing[24],
  },
  attention: {
    backgroundColor: colors.tangerineWash,
    borderColor: colors.ink,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[18],
  },
});
