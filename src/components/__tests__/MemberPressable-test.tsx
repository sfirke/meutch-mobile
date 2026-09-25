import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { MemberPressable, type MemberPressableUser } from '../MemberPressable';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedPush = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push: mockedPush,
  } as unknown as ReturnType<typeof useRouter>);
});

function buildUser(
  overrides: Partial<MemberPressableUser> = {},
): MemberPressableUser {
  return {
    id: 'a1111111-1111-4111-8111-111111111111',
    full_name: 'Ada Example',
    profile_viewable: true,
    ...overrides,
  };
}

describe('<MemberPressable />', () => {
  test('pushes the profile route when pressed and the profile is viewable', () => {
    render(
      <MemberPressable user={buildUser()}>
        <Text>Ada Example</Text>
      </MemberPressable>,
    );

    fireEvent.press(screen.getByRole('link'));

    expect(mockedPush).toHaveBeenCalledWith(
      '/user/a1111111-1111-4111-8111-111111111111',
    );
  });

  test('labels the link with the full name', () => {
    render(
      <MemberPressable user={buildUser({ full_name: 'Ada Example' })}>
        <Text>Ada Example</Text>
      </MemberPressable>,
    );

    expect(screen.getByLabelText("View Ada Example's profile")).toBeTruthy();
  });

  test('renders children plain, with no link role, when not viewable', () => {
    render(
      <MemberPressable user={buildUser({ profile_viewable: false })}>
        <Text>Ada Example</Text>
      </MemberPressable>,
    );

    expect(screen.getByText('Ada Example')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(mockedPush).not.toHaveBeenCalled();
  });
});
