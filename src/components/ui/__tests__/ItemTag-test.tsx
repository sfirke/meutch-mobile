import { render, screen } from '@testing-library/react-native';

import { ItemTag } from '../ItemTag';
import { ITEM_TAG_KINDS, ITEM_TAG_LABELS } from '../tags';

describe('<ItemTag />', () => {
  test.each(ITEM_TAG_KINDS)('renders the web label for %s', (kind) => {
    render(<ItemTag kind={kind} />);
    expect(screen.getByText(ITEM_TAG_LABELS[kind])).toBeTruthy();
  });

  test('renders a free-form label', () => {
    render(<ItemTag label="Lender" tone="tealWash" />);
    expect(screen.getByText('Lender')).toBeTruthy();
  });

  test('renders the on-photo variant with its label', () => {
    render(<ItemTag kind="giveaway" onPhoto testID="tag" />);
    expect(screen.getByText('Up for grabs')).toBeTruthy();
    expect(screen.getByTestId('tag')).toBeTruthy();
  });

  test('passes an accessibility label through', () => {
    render(<ItemTag accessibilityLabel="Status: out on loan" kind="on_loan" />);
    expect(screen.getByLabelText('Status: out on loan')).toBeTruthy();
  });
});
