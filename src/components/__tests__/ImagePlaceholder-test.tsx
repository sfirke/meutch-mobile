import { render, screen } from '@testing-library/react-native';

import { ImagePlaceholder } from '../ImagePlaceholder';

describe('<ImagePlaceholder />', () => {
  test('renders with the default testID and "No photo" label', () => {
    render(<ImagePlaceholder />);

    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    expect(screen.getByLabelText('No photo')).toBeTruthy();
  });

  test('accepts an overridden testID', () => {
    render(<ImagePlaceholder testID="carousel-placeholder" />);

    expect(screen.getByTestId('carousel-placeholder')).toBeTruthy();
  });
});
