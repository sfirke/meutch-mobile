import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '../Card';

describe('<Card />', () => {
  test.each(['content', 'callout', 'attention'] as const)(
    'renders its children as a %s card',
    (variant) => {
      render(
        <Card testID="card" variant={variant}>
          <Text>Cordless drill</Text>
        </Card>,
      );

      expect(screen.getByText('Cordless drill')).toBeTruthy();
      expect(screen.getByTestId('card')).toBeTruthy();
    },
  );

  test('passes accessibility props through', () => {
    render(
      <Card accessibilityLabel="Loan summary" accessible>
        <Text>Due Friday</Text>
      </Card>,
    );

    expect(screen.getByLabelText('Loan summary')).toBeTruthy();
  });
});
