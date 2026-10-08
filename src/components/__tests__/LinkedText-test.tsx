import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { colors } from '../../theme';
import { LinkedText } from '../LinkedText';

describe('<LinkedText />', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  test('renders text without links unchanged', () => {
    render(<LinkedText testID="body" text="Just a plain message" />);

    expect(screen.getByTestId('body').props.children).toBe(
      'Just a plain message',
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('passes TextProps to the outer text', () => {
    render(<LinkedText numberOfLines={2} testID="body" text="see www.a.com" />);

    expect(screen.getByTestId('body').props.numberOfLines).toBe(2);
  });

  test('renders a link segment with the link role', () => {
    render(<LinkedText text="Look: https://example.com/a." />);

    const link = screen.getByRole('link');
    expect(link.props.children).toBe('https://example.com/a');
    expect(link.props.style).toMatchObject({ textDecorationLine: 'underline' });
    expect(screen.getByText(/Look:/)).toBeTruthy();
  });

  test('pressing a link opens its href', () => {
    render(<LinkedText text="Look: https://example.com/a." />);

    fireEvent.press(screen.getByRole('link'));

    expect(openURL).toHaveBeenCalledWith('https://example.com/a');
  });

  test('a www link opens with https', () => {
    render(<LinkedText text="try www.example.com/x" />);

    expect(screen.getByRole('link').props.children).toBe('www.example.com/x');
    fireEvent.press(screen.getByRole('link'));

    expect(openURL).toHaveBeenCalledWith('https://www.example.com/x');
  });

  test('applies the default and custom link colors', () => {
    const { rerender } = render(<LinkedText text="https://example.com" />);
    expect(screen.getByRole('link').props.style.color).toBe(colors.primaryDark);

    rerender(<LinkedText linkColor="#ff0000" text="https://example.com" />);
    expect(screen.getByRole('link').props.style.color).toBe('#ff0000');
  });
});
