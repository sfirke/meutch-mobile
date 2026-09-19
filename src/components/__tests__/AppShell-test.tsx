import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from '../AppShell';
import { useSession } from '../../session/SessionProvider';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

jest.mock('../../config/env', () => ({
  environmentOptions: [
    { name: 'local', apiBaseUrl: 'http://10.0.2.2:5000/api/v1' },
    {
      name: 'integration',
      apiBaseUrl: 'https://staging.meutch.com/api/v1',
    },
    { name: 'production', apiBaseUrl: 'https://meutch.com/api/v1' },
  ],
  runtimeConfig: {
    environmentName: 'integration',
    apiBaseUrl: 'https://staging.meutch.com/api/v1',
  },
}));

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);

describe('<AppShell />', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      authenticatedApiFetch: jest.fn(),
      errorMessage: null,
      refreshUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      status: 'signed-out',
      user: null,
    });
  });

  test('renders the sign-in state and current API target', () => {
    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <AppShell />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Meutch Mobile')).toBeTruthy();
    expect(screen.getByText('Current target')).toBeTruthy();
    expect(screen.getAllByText('integration')).toHaveLength(2);
    expect(
      screen.getAllByText('https://staging.meutch.com/api/v1'),
    ).toHaveLength(2);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getAllByText('Sign in')).toHaveLength(2);
  });

  test('renders the signed-in state with session actions', () => {
    mockedUseSession.mockReturnValue({
      authenticatedApiFetch: jest.fn(),
      errorMessage: null,
      refreshUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      status: 'signed-in',
      user: {
        email: 'tester@example.com',
        email_confirmed: true,
        first_name: 'Tess',
        full_name: 'Tess Tester',
        id: '02d79872-e6fb-4f88-bad6-b09fb2f74fd8',
        last_name: 'Tester',
        profile_image_url: null,
      },
    });

    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <AppShell />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Signed in')).toBeTruthy();
    expect(screen.getByText('Tess Tester')).toBeTruthy();
    expect(screen.getByText('Refresh profile')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(
      screen.getByText(
        'Profile sync uses the authenticated API wrapper instead of reading tokens in the component tree.',
      ),
    ).toBeTruthy();
  });
});
