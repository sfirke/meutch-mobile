import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { ApiError } from '../../lib/api';
import { sessionClient, type AuthenticatedUser } from '../../lib/session';
import { SessionProvider, useSession } from '../SessionProvider';

jest.mock('../../lib/session', () => {
  class SessionExpiredError extends Error {}
  class SessionRequiredError extends Error {}

  return {
    SessionExpiredError,
    SessionRequiredError,
    sessionClient: {
      authenticatedApiFetch: jest.fn(),
      discardSession: jest.fn(),
      getCurrentUser: jest.fn(() => null),
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
      restoreSession: jest.fn(),
      subscribe: jest.fn(() => () => {}),
    },
  };
});

const mockedClient = jest.mocked(sessionClient);

const member: AuthenticatedUser = {
  id: 'user-1',
  email: 'member@example.com',
  email_confirmed: true,
  first_name: 'Test',
  last_name: 'Member',
  full_name: 'Test Member',
  profile_image_url: null,
};

const latest: { session: ReturnType<typeof useSession> | null } = {
  session: null,
};

function Consumer() {
  const session = useSession();

  useEffect(() => {
    latest.session = session;
  });

  return (
    <Text testID="state">
      {JSON.stringify({
        errorCode: session.errorCode,
        errorMessage: session.errorMessage,
        notice: session.notice,
        status: session.status,
        user: session.user?.id ?? null,
      })}
    </Text>
  );
}

function readState() {
  return JSON.parse(String(screen.getByTestId('state').props.children));
}

async function renderProvider(restoredUser: AuthenticatedUser | null) {
  mockedClient.restoreSession.mockResolvedValueOnce(restoredUser);
  render(
    <SessionProvider>
      <Consumer />
    </SessionProvider>,
  );
  await waitFor(() =>
    expect(readState().status).toBe(restoredUser ? 'signed-in' : 'signed-out'),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SessionProvider', () => {
  test('exposes the error code from a failed sign-in', async () => {
    await renderProvider(null);

    mockedClient.login.mockRejectedValueOnce(
      new ApiError({
        code: 'FORBIDDEN',
        message: 'Please confirm your email address.',
        status: 403,
      }),
    );

    await act(async () => {
      await latest.session!.signIn('member@example.com', 'not-a-real-password');
    });

    expect(readState()).toMatchObject({
      errorCode: 'FORBIDDEN',
      errorMessage: 'Please confirm your email address.',
      status: 'signed-out',
    });
  });

  test('discardSession signs out locally and sets the notice', async () => {
    await renderProvider(member);

    await act(async () => {
      await latest.session!.discardSession('Your account has been deleted.');
    });

    expect(mockedClient.discardSession).toHaveBeenCalledTimes(1);
    expect(mockedClient.logout).not.toHaveBeenCalled();
    expect(readState()).toEqual({
      errorCode: null,
      errorMessage: null,
      notice: 'Your account has been deleted.',
      status: 'signed-out',
      user: null,
    });
  });

  test('signIn clears the notice and a previous error code', async () => {
    await renderProvider(member);

    await act(async () => {
      await latest.session!.discardSession('Your account has been deleted.');
    });

    mockedClient.login.mockRejectedValueOnce(
      new ApiError({ code: 'FORBIDDEN', message: 'Forbidden.', status: 403 }),
    );
    await act(async () => {
      await latest.session!.signIn('member@example.com', 'not-a-real-password');
    });

    expect(readState()).toMatchObject({ errorCode: 'FORBIDDEN', notice: null });

    mockedClient.login.mockResolvedValueOnce(member);
    await act(async () => {
      await latest.session!.signIn('member@example.com', 'not-a-real-password');
    });

    expect(readState()).toEqual({
      errorCode: null,
      errorMessage: null,
      notice: null,
      status: 'signed-in',
      user: 'user-1',
    });
  });
});
