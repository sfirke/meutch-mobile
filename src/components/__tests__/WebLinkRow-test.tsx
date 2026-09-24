import { fireEvent, render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import type { WebLink } from '../../lib/profile';
import { WebLinkRow } from '../WebLinkRow';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

function createLink(overrides: Partial<WebLink> = {}): WebLink {
  return {
    id: 'c1111111-1111-4111-8111-111111111111',
    platform_type: 'website',
    platform_name: 'Personal site',
    display_name: 'My woodworking blog',
    url: 'https://example.test/blog',
    display_order: 0,
    ...overrides,
  };
}

describe('<WebLinkRow />', () => {
  test('renders the display name and platform name', () => {
    render(<WebLinkRow link={createLink()} onPress={jest.fn()} />);

    expect(screen.getByText('My woodworking blog')).toBeTruthy();
    expect(screen.getByText('Personal site')).toBeTruthy();
  });

  test('omits the platform line when platform_name is null', () => {
    render(
      <WebLinkRow
        link={createLink({ platform_name: null })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByText('Personal site')).toBeNull();
  });

  test('pressing the row calls onPress with the url', () => {
    const onPress = jest.fn();

    render(
      <WebLinkRow
        link={createLink({ url: 'https://example.test/blog' })}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByRole('link'));

    expect(onPress).toHaveBeenCalledWith('https://example.test/blog');
  });

  test('exposes the display name as the accessibility label', () => {
    render(
      <WebLinkRow
        link={createLink({ display_name: 'My woodworking blog' })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('My woodworking blog')).toBeTruthy();
  });
});
