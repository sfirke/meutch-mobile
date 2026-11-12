import type { PropsWithChildren } from 'react';
import { screen } from '@testing-library/react-native';
import { act, renderRouter } from 'expo-router/testing-library';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { useSession } from '../session/SessionProvider';
import { fonts } from '../theme';
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

const mockedUseFonts = jest.mocked(useFonts);
const mockedHideAsync = jest.mocked(SplashScreen.hideAsync);

function mockSignedIn() {
  jest.mocked(useSession).mockReturnValue({
    authenticatedApiFetch: emptyApiFetch(),
    discardSession: jest.fn(),
    errorCode: null,
    errorMessage: null,
    notice: null,
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
  } satisfies SessionValue);
}

describe('font loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignedIn();
    mockedUseFonts.mockReturnValue([true, null]);
  });

  test('loads every display and body family', async () => {
    renderRouter('app');
    await screen.findByText('Nothing here yet');

    const requested = Object.keys(mockedUseFonts.mock.calls[0][0] as object);
    const families = [
      ...Object.values(fonts.display),
      ...Object.values(fonts.body),
    ];
    expect(requested.sort()).toEqual(families.sort());
  });

  test('keeps the splash up until the fonts load', async () => {
    mockedUseFonts.mockReturnValue([false, null]);

    renderRouter('app');
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText('Nothing here yet')).toBeNull();
    expect(mockedHideAsync).not.toHaveBeenCalled();
  });

  test('carries on with system fonts when loading fails', async () => {
    mockedUseFonts.mockReturnValue([false, new Error('font failed')]);

    renderRouter('app');

    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
    expect(mockedHideAsync).toHaveBeenCalledTimes(1);
  });
});
