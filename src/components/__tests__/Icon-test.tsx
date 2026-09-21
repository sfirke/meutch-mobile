import { render, screen } from '@testing-library/react-native';

import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome6Free.json';
import glyphMeta from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome6Free_meta.json';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { Icon, ICON_GLYPHS, type IconName } from '../Icon';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

describe('ICON_GLYPHS', () => {
  test.each(Object.entries(ICON_GLYPHS) as [IconName, string][])(
    '%s maps to a glyph that exists in the FontAwesome 6 Free solid set',
    (_name, glyph) => {
      expect(glyphMap).toHaveProperty(glyph);
      expect(glyphMeta.solid).toContain(glyph);
    },
  );
});

// The icon is deliberately hidden from the accessibility tree (it's
// decorative), so queries need `includeHiddenElements` to find it.
const HIDDEN = { includeHiddenElements: true };

describe('<Icon />', () => {
  test('renders the mapped glyph, hidden from screen readers', () => {
    render(<Icon color="#000000" name="search" />);

    const icon = screen.getByTestId(`icon-${ICON_GLYPHS.search}`, HIDDEN);

    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(icon.props.importantForAccessibility).toBe('no');
    expect(icon.props.solid).toBe(true);
  });

  test('passes size and color through to the underlying glyph', () => {
    render(<Icon color="#319795" name="rehomed" size={24} />);

    const icon = screen.getByTestId(`icon-${ICON_GLYPHS.rehomed}`, HIDDEN);

    expect(icon.props.size).toBe(24);
    expect(icon.props.color).toBe('#319795');
  });

  test('defaults to size 16', () => {
    render(<Icon color="#000000" name="clear" />);

    expect(
      screen.getByTestId(`icon-${ICON_GLYPHS.clear}`, HIDDEN).props.size,
    ).toBe(16);
  });
});
