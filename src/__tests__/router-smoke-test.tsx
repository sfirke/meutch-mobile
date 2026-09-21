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

const mockedUseSession = jest.mocked(useSession);

// Renders the real app/ directory, so this fails if expo-router cannot load the
// route tree or its native dependencies under jest.
describe('expo-router entry', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      authenticatedApiFetch: emptyApiFetch(),
      errorMessage: null,
      refreshUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      status: 'signed-in',
      user: {
        email: 'member@example.com',
        email_confirmed: true,
        first_name: 'Morgan',
        full_name: 'Morgan Member',
        id: '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e',
        last_name: 'Member',
        profile_image_url: null,
      },
    });
  });

  test('renders the feed tab at the root URL', async () => {
    const { getPathname } = renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
    expect(getPathname()).toBe('/');
  });
});
