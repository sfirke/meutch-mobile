import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import type { ColorValue } from 'react-native';

// The only place the icon family/style is chosen. Swapping families means
// changing this file and its glyph names, nothing else.
export type IconName =
  | 'feed'
  | 'browse'
  | 'image'
  | 'giveaway'
  | 'request'
  | 'loan'
  | 'circle'
  | 'category'
  | 'location'
  | 'rehomed'
  | 'pending'
  | 'search'
  | 'clear';

/**
 * FontAwesome 6 Free solid glyph names. Covered by Icon-test.tsx, which
 * checks every value here against the installed glyph map/metadata, since a
 * typo renders a "?" on device with nothing else to catch it.
 */
export const ICON_GLYPHS: Record<IconName, string> = {
  feed: 'house',
  browse: 'compass',
  image: 'image',
  giveaway: 'gift',
  request: 'hand',
  loan: 'right-left',
  circle: 'people-group',
  category: 'folder',
  location: 'location-dot',
  rehomed: 'heart',
  pending: 'clock',
  search: 'magnifying-glass',
  clear: 'xmark',
};

export type IconProps = {
  name: IconName;
  color: ColorValue;
  size?: number;
};

// Decorative by default: the adjacent label already carries the meaning, so
// the glyph is hidden from screen readers rather than announced twice.
export function Icon({ name, color, size = 16 }: IconProps) {
  return (
    <FontAwesome6
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no"
      name={ICON_GLYPHS[name]}
      size={size}
      solid
    />
  );
}
