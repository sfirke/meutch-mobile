import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { typography } from '../../../theme';
import { PaperStrip } from '../PaperStrip';

describe('<PaperStrip />', () => {
  test('reads as part of the headline it sits in', () => {
    render(
      <Text accessibilityRole="header">
        What if <PaperStrip>borrowing</PaperStrip> was easy?
      </Text>,
    );

    expect(screen.getByRole('header', { name: /borrowing/ })).toBeTruthy();
  });

  test('renders on its own as a block', () => {
    render(
      <PaperStrip block textStyle={typography.h1}>
        tools
      </PaperStrip>,
    );

    expect(screen.getByText('tools')).toBeTruthy();
  });
});
