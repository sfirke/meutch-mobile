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

  test('labels the link with the full name by default', () => {
    render(
      <MemberPressable user={buildUser({ full_name: 'Ada Example' })}>
        <Text>Ada Example</Text>
      </MemberPressable>,
    );

    expect(screen.getByLabelText("View Ada Example's profile")).toBeTruthy();
  });

  test('uses a custom accessibility label when given one', () => {
    render(
      <MemberPressable
        accessibilityLabel="Ada Example, admin, joined Jan 2026"
        user={buildUser()}
      >
        <Text>Ada Example</Text>
      </MemberPressable>,
    );

    expect(
      screen.getByLabelText('Ada Example, admin, joined Jan 2026'),
    ).toBeTruthy();
    expect(screen.queryByLabelText("View Ada Example's profile")).toBeNull();
  });

  test('passes through a custom accessibility hint', () => {
    render(
      <MemberPressable accessibilityHint="Opens profile" user={buildUser()}>
        <Text>Ada Example</Text>
      </MemberPressable>,
    );

    expect(screen.getByRole('link').props.accessibilityHint).toBe(
      'Opens profile',
    );
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
