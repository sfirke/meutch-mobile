import { render, screen } from '@testing-library/react-native';

import { Stitch } from '../Stitch';

describe('<Stitch />', () => {
  test('is hidden from accessibility', () => {
    render(<Stitch testID="stitch" />);

    expect(
      screen.getByTestId('stitch', { includeHiddenElements: true }),
    ).not.toBeVisible();
  });
});
