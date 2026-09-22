import type { PropsWithChildren } from 'react';
import { screen } from '@testing-library/react-native';
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

const member: SessionValue['user'] = {
  email: 'member@example.com',
  email_confirmed: true,
  first_name: 'Morgan',
  full_name: 'Morgan Member',
  id: '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e',
  last_name: 'Member',
  profile_image_url: null,
};

const THREAD_ID = '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e';
const CIRCLE_ID = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';

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

describe('detail stacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mounts the thread screen for a message deep link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/message/${THREAD_ID}`,
    });

    // The shared empty fetch answers every path with a collection page, which
    // is not a thread payload, so the screen never leaves its loading state.
    expect(await screen.findByLabelText('Loading conversation')).toBeTruthy();
    expect(getPathname()).toBe(`/message/${THREAD_ID}`);
  });

  test('mounts the circle detail screen for a circle deep link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/circle/${CIRCLE_ID}`,
    });

    // The shared empty fetch answers every path with a collection page, which
    // is not a circle detail payload, so the screen never leaves its loading
    // state.
    expect(await screen.findByLabelText('Loading circle')).toBeTruthy();
    expect(getPathname()).toBe(`/circle/${CIRCLE_ID}`);
  });

  test('mounts the settings screen at /profile/settings', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: '/profile/settings',
    });

    expect(await screen.findByRole('button', { name: 'Save' })).toBeTruthy();
    expect(getPathname()).toBe('/profile/settings');
  });

  test('renders the profile tab at /profile, not the settings stack', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', { initialUrl: '/profile' });

    expect(
      await screen.findByRole('button', { name: 'Sign out' }),
    ).toBeTruthy();
    expect(getPathname()).toBe('/profile');
  });

  test('redirects a signed-out visitor from a message deep link to sign-in', async () => {
    mockSession({ status: 'signed-out' });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/message/${THREAD_ID}`,
    });

    expect(await screen.findByText('Borrow more, buy less.')).toBeTruthy();
    expect(getPathname()).toBe('/sign-in');
  });
});
