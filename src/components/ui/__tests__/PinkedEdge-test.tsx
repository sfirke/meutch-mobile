import { render, screen } from '@testing-library/react-native';

import { colors } from '../../../theme';
import { PinkedEdge } from '../PinkedEdge';

describe('<PinkedEdge />', () => {
  test.each(['up', 'down'] as const)(
    'pointing %s, is hidden from accessibility',
    (direction) => {
      render(
        <PinkedEdge
          color={colors.tangerine}
          direction={direction}
          testID="edge"
        />,
      );

      expect(
        screen.getByTestId('edge', { includeHiddenElements: true }),
      ).not.toBeVisible();
    },
  );
});
