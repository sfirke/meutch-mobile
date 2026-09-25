import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import type { WebLink } from '../../lib/profile';
import { ProfileLinksSection } from '../ProfileLinksSection';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

function buildLink(overrides: Partial<WebLink> = {}): WebLink {
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

beforeEach(() => {
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('<ProfileLinksSection />', () => {
  test('renders nothing when there are no links', () => {
    const { toJSON } = render(<ProfileLinksSection links={[]} />);

    expect(toJSON()).toBeNull();
  });

  test('renders the links label and a row per link', () => {
    render(
      <ProfileLinksSection
        links={[
          buildLink(),
          buildLink({
            id: 'd2222222-2222-4222-8222-222222222222',
            display_name: 'Other site',
            url: 'https://example.test/other',
          }),
        ]}
      />,
    );

    expect(screen.getByText('Links')).toBeTruthy();
    expect(screen.getByText('My woodworking blog')).toBeTruthy();
    expect(screen.getByText('Other site')).toBeTruthy();
  });

  test('opens the link url when its row is pressed', () => {
    render(<ProfileLinksSection links={[buildLink()]} />);

    fireEvent.press(screen.getByLabelText('My woodworking blog'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.test/blog');
  });
});
