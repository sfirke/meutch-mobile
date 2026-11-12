import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Banner } from '../Banner';

describe('<Banner />', () => {
  test('renders a string message and an optional title', () => {
    render(
      <Banner title="Saved" tone="success">
        Your changes are in.
      </Banner>,
    );

    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Your changes are in.')).toBeTruthy();
  });

  test('renders node children as given', () => {
    render(
      <Banner tone="info">
        <Text>Custom body</Text>
      </Banner>,
    );

    expect(screen.getByText('Custom body')).toBeTruthy();
  });

  test('danger is announced as an alert, other tones are not', () => {
    const { rerender } = render(<Banner tone="danger">Went wrong</Banner>);

    expect(screen.getByRole('alert')).toBeTruthy();

    for (const tone of ['success', 'info', 'warning'] as const) {
      rerender(<Banner tone={tone}>Heads up</Banner>);
      expect(screen.queryByRole('alert')).toBeNull();
    }
  });

  test('action and dismiss buttons call their handlers', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();

    render(
      <Banner
        action={{ label: 'Undo', onPress }}
        onDismiss={onDismiss}
        tone="warning"
      >
        Item removed
      </Banner>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('has no buttons unless an action or dismiss is given', () => {
    render(<Banner tone="info">Just so you know</Banner>);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
