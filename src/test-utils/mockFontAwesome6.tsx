import { Text } from 'react-native';

export type MockFontAwesome6Props = {
  name: string;
  color?: string;
  size?: number;
  solid?: boolean;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'no' | 'yes' | 'no-hide-descendants';
};

/**
 * Stands in for `@expo/vector-icons/FontAwesome6` under jest: the real
 * component loads its font asynchronously and sets state after mount, which
 * trips act() warnings in tests that never await that load. This renders
 * synchronously and exposes the icon name as a testID (`icon-<name>`) so
 * tests can assert which glyph a component asked for.
 */
export default function MockFontAwesome6({
  name,
  ...rest
}: MockFontAwesome6Props) {
  return (
    <Text testID={`icon-${name}`} {...rest}>
      {name}
    </Text>
  );
}
