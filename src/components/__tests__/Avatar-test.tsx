import { render, screen } from '@testing-library/react-native';

import type { UserSummary } from '../../lib/parse';
import { Avatar, getInitials } from '../Avatar';

const ada: UserSummary = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: 'https://example.com/ada.jpg',
  profile_viewable: false,
};

describe('<Avatar />', () => {
  test('renders the photo with its URL and the user as the accessibility label', () => {
    render(<Avatar user={ada} />);

    const image = screen.getByTestId('avatar');

    expect(image.props.source).toEqual([{ uri: ada.profile_image_url }]);
    expect(screen.getByLabelText('Ada Example')).toBeTruthy();
  });

  test('renders initials when the user has no photo', () => {
    render(<Avatar user={{ ...ada, profile_image_url: null }} />);

    expect(screen.getByTestId('avatar-initials')).toBeTruthy();
    expect(screen.getByText('AE')).toBeTruthy();
  });

  test('renders "?" for a null user (a deleted account)', () => {
    render(<Avatar user={null} />);

    expect(screen.getByTestId('avatar-initials')).toBeTruthy();
    expect(screen.getByText('?')).toBeTruthy();
  });

  test('prefixes the initials testID with a custom testID', () => {
    render(
      <Avatar
        testID="owner-avatar"
        user={{ ...ada, profile_image_url: null }}
      />,
    );

    expect(screen.getByTestId('owner-avatar-initials')).toBeTruthy();
  });

  test('uses a custom testID for the image', () => {
    render(<Avatar testID="thread-avatar" user={ada} />);

    expect(screen.getByTestId('thread-avatar')).toBeTruthy();
  });
});

describe('getInitials', () => {
  test('takes the first letter of the first and last name, upper-cased', () => {
    expect(getInitials(ada)).toBe('AE');
  });

  test('upper-cases lower-case names', () => {
    expect(
      getInitials({ ...ada, first_name: 'ada', last_name: 'example' }),
    ).toBe('AE');
  });

  test('returns "?" when both names are empty', () => {
    expect(getInitials({ ...ada, first_name: '', last_name: '' })).toBe('?');
  });

  test('returns "?" for a null user', () => {
    expect(getInitials(null)).toBe('?');
  });
});
