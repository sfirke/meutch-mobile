import type { PropsWithChildren } from 'react';
import { screen } from '@testing-library/react-native';
import { act, renderRouter } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

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
const mockedHideAsync = jest.mocked(SplashScreen.hideAsync);

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
    signOut: jest.fn(),
    status: 'signed-out',
    user: null,
    ...overrides,
  });
}

describe('auth gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing and stays put while the session is restoring', async () => {
    mockSession({ status: 'restoring' });

    const { getPathname } = renderRouter('app');

    // Flush everything a redirect would need, then prove none happened.
    await act(async () => {
      await Promise.resolve();
    });

    expect(getPathname()).toBe('/');
    expect(screen.queryByText('Borrow more, buy less.')).toBeNull();
    expect(screen.queryByText('Nothing here yet')).toBeNull();
    expect(mockedHideAsync).not.toHaveBeenCalled();
  });

  test('hides the splash once the status leaves restoring', async () => {
    mockSession({ status: 'signed-in', user: member });

    renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
    expect(mockedHideAsync).toHaveBeenCalledTimes(1);
  });

  test('sends a signed-out visitor from the feed to sign-in', async () => {
    mockSession({ status: 'signed-out' });

    const { getPathname } = renderRouter('app');

    expect(await screen.findByText('Borrow more, buy less.')).toBeTruthy();
    expect(getPathname()).toBe('/sign-in');
  });

  test('sends a signed-out visitor from a deep link to sign-in', async () => {
    mockSession({ status: 'signed-out' });

    const { getPathname } = renderRouter('app', { initialUrl: '/browse' });

    expect(await screen.findByText('Borrow more, buy less.')).toBeTruthy();
    expect(getPathname()).toBe('/sign-in');
  });

  test('keeps a signing-in visitor on the sign-in screen', async () => {
    mockSession({ status: 'signing-in' });

    const { getPathname } = renderRouter('app', { initialUrl: '/sign-in' });

    expect(await screen.findByText('Signing in...')).toBeTruthy();
    expect(getPathname()).toBe('/sign-in');
  });

  test('lands a signed-in member on the feed with both tabs', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
    expect(getPathname()).toBe('/');
    expect(screen.getAllByText('Feed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Browse').length).toBeGreaterThan(0);
  });

  test('redirects a signed-in member away from sign-in', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', { initialUrl: '/sign-in' });

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
    expect(getPathname()).toBe('/');
  });

  test('keeps a signing-out member on the tabs until sign-out settles', async () => {
    mockSession({ status: 'signing-out', user: member });

    const { getPathname } = renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
    expect(getPathname()).toBe('/');
    expect(screen.getByText('Signing out...')).toBeTruthy();
  });
});
