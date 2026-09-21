import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';

import { ApiError } from '../../lib/api';
import { SessionExpiredError, SessionRequiredError } from '../../lib/session';
import { useSession } from '../../session/SessionProvider';
import {
  createQueryClient,
  QueryProvider,
  shouldRetryQuery,
} from '../QueryProvider';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const mockedUseSession = jest.mocked(useSession);

const fakeUser = {
  id: 'fake-user-1',
  email: 'fake.member@example.com',
  email_confirmed: true,
  first_name: 'Fake',
  last_name: 'Member',
  full_name: 'Fake Member',
  profile_image_url: null,
};

function buildSession(
  overrides: Partial<ReturnType<typeof useSession>>,
): ReturnType<typeof useSession> {
  return {
    authenticatedApiFetch: jest.fn(),
    errorMessage: null,
    refreshUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    status: 'signed-out',
    user: null,
    ...overrides,
  };
}

function ClientProbe({
  onClient,
}: {
  onClient: (client: QueryClient) => void;
}) {
  const client = useQueryClient();

  onClient(client);

  return null;
}

describe('shouldRetryQuery', () => {
  test('never retries SessionExpiredError', () => {
    expect(shouldRetryQuery(0, new SessionExpiredError())).toBe(false);
  });

  test('never retries SessionRequiredError', () => {
    expect(shouldRetryQuery(0, new SessionRequiredError())).toBe(false);
  });

  test('never retries a 4xx ApiError', () => {
    const error = new ApiError({
      code: 'NOT_FOUND',
      message: 'Not found.',
      status: 404,
    });

    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  test('retries a 5xx ApiError up to the max attempts', () => {
    const error = new ApiError({
      code: 'SERVER_ERROR',
      message: 'Server error.',
      status: 500,
    });

    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
  });

  test('retries a plain network error up to the max attempts', () => {
    const error = new Error('Network request failed');

    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
  });
});

describe('createQueryClient', () => {
  test('wires the shared retry predicate as the default', () => {
    const client = createQueryClient();

    expect(client.getDefaultOptions().queries?.retry).toBe(shouldRetryQuery);
  });
});

describe('<QueryProvider />', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('creates the QueryClient once and keeps it stable across re-renders', () => {
    mockedUseSession.mockReturnValue(
      buildSession({ status: 'signed-in', user: fakeUser }),
    );

    const clients: QueryClient[] = [];
    const { rerender } = render(
      <QueryProvider>
        <ClientProbe onClient={(client) => clients.push(client)} />
      </QueryProvider>,
    );

    rerender(
      <QueryProvider>
        <ClientProbe onClient={(client) => clients.push(client)} />
      </QueryProvider>,
    );

    expect(clients).toHaveLength(2);
    expect(clients[0]).toBe(clients[1]);
  });

  test('does not clear the cache on the first sign-in', () => {
    const clearSpy = jest.spyOn(QueryClient.prototype, 'clear');

    mockedUseSession.mockReturnValue(buildSession({ status: 'restoring' }));

    const { rerender } = render(
      <QueryProvider>
        <ClientProbe onClient={() => {}} />
      </QueryProvider>,
    );

    mockedUseSession.mockReturnValue(
      buildSession({ status: 'signed-in', user: fakeUser }),
    );
    rerender(
      <QueryProvider>
        <ClientProbe onClient={() => {}} />
      </QueryProvider>,
    );

    expect(clearSpy).not.toHaveBeenCalled();
  });

  test('clears the cache when the session signs out', () => {
    const clearSpy = jest.spyOn(QueryClient.prototype, 'clear');

    mockedUseSession.mockReturnValue(
      buildSession({ status: 'signed-in', user: fakeUser }),
    );

    const { rerender } = render(
      <QueryProvider>
        <ClientProbe onClient={() => {}} />
      </QueryProvider>,
    );

    expect(clearSpy).not.toHaveBeenCalled();

    mockedUseSession.mockReturnValue(
      buildSession({ status: 'signed-out', user: null }),
    );
    rerender(
      <QueryProvider>
        <ClientProbe onClient={() => {}} />
      </QueryProvider>,
    );

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  test('clears the cache when a different user takes over the session', () => {
    const clearSpy = jest.spyOn(QueryClient.prototype, 'clear');

    mockedUseSession.mockReturnValue(
      buildSession({ status: 'signed-in', user: fakeUser }),
    );

    const { rerender } = render(
      <QueryProvider>
        <ClientProbe onClient={() => {}} />
      </QueryProvider>,
    );

    mockedUseSession.mockReturnValue(
      buildSession({
        status: 'signed-in',
        user: { ...fakeUser, id: 'fake-user-2' },
      }),
    );
    rerender(
      <QueryProvider>
        <ClientProbe onClient={() => {}} />
      </QueryProvider>,
    );

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
