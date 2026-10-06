import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ProfileHeader, type ProfileHeaderUser } from '../ProfileHeader';

function buildUser(
  overrides: Partial<ProfileHeaderUser> = {},
): ProfileHeaderUser {
  return {
    id: 'a1111111-1111-4111-8111-111111111111',
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: null,
    ...overrides,
  };
}

describe('<ProfileHeader />', () => {
  test('renders the avatar and full name', () => {
    render(<ProfileHeader user={buildUser()} />);

    expect(screen.getByTestId('profile-avatar-initials')).toBeTruthy();
    expect(screen.getByText('Ada Example')).toBeTruthy();
  });

  test('renders a photo avatar when the user has one', () => {
    render(
      <ProfileHeader
        user={buildUser({ profile_image_url: 'https://example.test/ada.jpg' })}
      />,
    );

    expect(screen.getByTestId('profile-avatar')).toBeTruthy();
  });

  test('renders children under the name', () => {
    render(
      <ProfileHeader user={buildUser()}>
        <Text>Extra copy</Text>
      </ProfileHeader>,
    );

    expect(screen.getByText('Extra copy')).toBeTruthy();
  });
});
