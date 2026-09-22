import { render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { ICON_GLYPHS } from '../Icon';
import { ImagePlaceholder } from '../ImagePlaceholder';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

describe('<ImagePlaceholder />', () => {
  test('renders the image icon with the default testID and "No photo" label', () => {
    render(<ImagePlaceholder />);

    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    expect(screen.getByLabelText('No photo')).toBeTruthy();
    // Decorative: hidden from the accessibility tree, so this needs the opt-in.
    expect(
      screen.getByTestId(`icon-${ICON_GLYPHS.image}`, {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
  });

  test('accepts an overridden testID', () => {
    render(<ImagePlaceholder testID="carousel-placeholder" />);

    expect(screen.getByTestId('carousel-placeholder')).toBeTruthy();
  });
});
