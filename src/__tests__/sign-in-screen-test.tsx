import type { PropsWithChildren } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { apiFetch } from '../lib/api';
import { useSession } from '../session/SessionProvider';
import MockFontAwesome6 from '../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  mockApiFetch,
} from '../test-utils/renderWithProviders';

jest.mock('../lib/api', () => ({
  ...jest.requireActual('../lib/api'),
  apiFetch: jest.fn(),
}));

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
    discardSession: jest.fn(),
    errorCode: null,
    errorMessage: null,
    notice: null,
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

  test('shows the session notice in a neutral card', async () => {
    mockSession({ notice: 'Your account has been deleted.' });

    await renderSignIn();

    expect(screen.getByTestId('sign-in-notice')).toHaveTextContent(
      'Your account has been deleted.',
    );
  });

  test('offers to resend the confirmation email for an unconfirmed account', async () => {
    const fetchMock = mockApiFetch({
      'POST /auth/resend-confirmation': { message: 'Sent another one.' },
    });
    jest.mocked(apiFetch).mockImplementation(fetchMock);
    mockSession({
      errorCode: 'FORBIDDEN',
      errorMessage: 'Please confirm your email first.',
    });

    await renderSignIn();

    expect(screen.getByTestId('sign-in-unconfirmed')).toBeTruthy();
    expect(screen.getByText('Please confirm your email first.')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();

    fireEvent.changeText(
      screen.getByPlaceholderText('Email'),
      ' member@example.com ',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('Password'),
      'not-a-real-password',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    // Editing the field after the attempt must not change what is resent.
    fireEvent.changeText(
      screen.getByPlaceholderText('Email'),
      'other@example.com',
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Resend confirmation email' }),
    );

    expect(await screen.findByText('Sent another one.')).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe('/auth/resend-confirmation');
    expect(getRequestBody(fetchMock.mock.calls[0][1])).toEqual({
      email: 'member@example.com',
    });
    expect(
      screen.queryByRole('button', { name: 'Resend confirmation email' }),
    ).toBeNull();
  });

  test('opens forgot password from the link', async () => {
    await renderSignIn();

    fireEvent.changeText(
      screen.getByPlaceholderText('Email'),
      ' member@example.com ',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));

    await waitFor(() =>
      expect(screen.getByText('Forgot your password?')).toBeTruthy(),
    );
    expect(screen.getByTestId('field-email').props.value).toBe(
      'member@example.com',
    );
  });
});
