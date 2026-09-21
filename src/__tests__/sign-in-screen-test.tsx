import type { PropsWithChildren } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { useSession } from '../session/SessionProvider';
import MockFontAwesome6 from '../test-utils/mockFontAwesome6';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../session/SessionProvider', () => ({
  SessionProvider: ({ children }: PropsWithChildren) => children,
  useSession: jest.fn(),
}));

// expo-router loads every route module (including the tabs layout) to build
// its route tree, even ones a given test never navigates to.
jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

type SessionValue = ReturnType<typeof useSession>;

const mockedUseSession = jest.mocked(useSession);
const signIn = jest.fn<ReturnType<SessionValue['signIn']>, [string, string]>();

function mockSession(overrides: Partial<SessionValue>) {
  mockedUseSession.mockReturnValue({
    authenticatedApiFetch: jest.fn(),
    errorMessage: null,
    refreshUser: jest.fn(),
    signIn,
    signOut: jest.fn(),
    status: 'signed-out',
    user: null,
    ...overrides,
  });
}

async function renderSignIn() {
  renderRouter('app', { initialUrl: '/sign-in' });

  expect(await screen.findByText('Borrow more, buy less.')).toBeTruthy();
}

describe('sign-in screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signIn.mockResolvedValue(null);
    mockSession({ status: 'signed-out' });
  });

  test('keeps submit disabled until both fields are filled', async () => {
    await renderSignIn();

    const submit = screen.getByRole('button', { name: 'Sign in' });

    expect(submit).toBeDisabled();

    fireEvent.changeText(screen.getByPlaceholderText('Email'), '   ');
    expect(submit).toBeDisabled();

    fireEvent.changeText(
      screen.getByPlaceholderText('Email'),
      'member@example.com',
    );
    expect(submit).toBeDisabled();

    fireEvent.changeText(
      screen.getByPlaceholderText('Password'),
      'not-a-real-password',
    );
    expect(submit).toBeEnabled();
  });

  test('submits the entered credentials', async () => {
    await renderSignIn();

    fireEvent.changeText(
      screen.getByPlaceholderText('Email'),
      'member@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('Password'),
      'not-a-real-password',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(signIn).toHaveBeenCalledWith(
      'member@example.com',
      'not-a-real-password',
    );
  });

  test('shows the busy label and blocks submits while signing in', async () => {
    mockSession({ status: 'signing-in' });

    await renderSignIn();

    expect(screen.getByText('Signing in...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('shows the session error message', async () => {
    mockSession({ errorMessage: 'Invalid email or password.' });

    await renderSignIn();

    expect(screen.getByText('Invalid email or password.')).toBeTruthy();
  });
});
