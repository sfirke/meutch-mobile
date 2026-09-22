import type { PropsWithChildren } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { useSession } from '../session/SessionProvider';
import MockFontAwesome6 from '../test-utils/mockFontAwesome6';
import { emptyApiFetch } from '../test-utils/renderWithProviders';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../session/SessionProvider', () => ({
  SessionProvider: ({ children }: PropsWithChildren) => children,
  useSession: jest.fn(),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

type SessionValue = ReturnType<typeof useSession>;

const mockedUseSession = jest.mocked(useSession);
const signOut = jest.fn<ReturnType<SessionValue['signOut']>, []>();

const member: SessionValue['user'] = {
  email: 'member@example.com',
  email_confirmed: true,
  first_name: 'Morgan',
  full_name: 'Morgan Member',
  id: '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e',
  last_name: 'Member',
  profile_image_url: null,
};

function mockSession(overrides: Partial<SessionValue>) {
  mockedUseSession.mockReturnValue({
    authenticatedApiFetch: emptyApiFetch(),
    errorMessage: null,
    refreshUser: jest.fn(),
    signIn: jest.fn(),
    signOut,
    status: 'signed-in',
    user: member,
    ...overrides,
  });
}

describe('tabs layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signOut.mockResolvedValue(undefined);
    mockSession({});
  });

  test('switches between the feed and browse tabs', async () => {
    const { getPathname } = renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Browse' }));

    expect(await screen.findByLabelText('Search items')).toBeTruthy();
    expect(getPathname()).toBe('/browse');
  });

  test('signs out from the header button', async () => {
    renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  test('disables the header button while signing out', async () => {
    mockSession({ status: 'signing-out' });

    renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled();
    expect(screen.getByText('Signing out...')).toBeTruthy();
  });
});
