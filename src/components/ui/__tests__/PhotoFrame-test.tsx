import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PhotoFrame } from '../PhotoFrame';

describe('<PhotoFrame />', () => {
  test('renders its children', () => {
    render(
      <PhotoFrame>
        <Text>photo</Text>
      </PhotoFrame>,
    );

    expect(screen.getByText('photo')).toBeTruthy();
  });

  test('renders its children when tilted and lifted', () => {
    render(
      <PhotoFrame lifted="md" tilt={2}>
        <Text>photo</Text>
      </PhotoFrame>,
    );

    expect(screen.getByText('photo')).toBeTruthy();
  });
});
