import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { isApiError } from '../lib/api';
import {
  SessionExpiredError,
  SessionRequiredError,
  sessionClient,
  type AuthenticatedUser,
} from '../lib/session';

export type SessionStatus =
  'restoring' | 'signed-out' | 'signing-in' | 'signed-in' | 'signing-out';

type SessionContextValue = {
  authenticatedApiFetch: (
    path: string,
    init?: RequestInit,
  ) => Promise<Response>;
  errorMessage: string | null;
  refreshUser: () => Promise<AuthenticatedUser | null>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<AuthenticatedUser | null>;
  signOut: () => Promise<void>;
  status: SessionStatus;
  user: AuthenticatedUser | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (
    error instanceof SessionExpiredError ||
    error instanceof SessionRequiredError ||
    isApiError(error)
  ) {
    return error.message;
  }

  return 'Unable to complete that request right now.';
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = sessionClient.subscribe((nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        setStatus('signed-in');
        return;
      }

      setStatus((currentStatus) =>
        currentStatus === 'restoring' ? currentStatus : 'signed-out',
      );
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isActive = true;

    void sessionClient
      .restoreSession()
      .then((restoredUser) => {
        if (!isActive) {
          return;
        }

        setUser(restoredUser);
        setStatus(restoredUser ? 'signed-in' : 'signed-out');
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        const fallbackUser = sessionClient.getCurrentUser();

        setUser(fallbackUser);
        setStatus(fallbackUser ? 'signed-in' : 'signed-out');
        setErrorMessage(getErrorMessage(error));
      });

    return () => {
      isActive = false;
    };
  }, []);

  const value: SessionContextValue = {
    authenticatedApiFetch: async (path, init) => {
      try {
        return await sessionClient.authenticatedApiFetch(path, init);
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          setErrorMessage(error.message);
        }

        throw error;
      }
    },

    errorMessage,

    refreshUser: async () => {
      setErrorMessage(null);

      try {
        const refreshedUser = await sessionClient.refreshUser();

        setUser(refreshedUser);
        setStatus('signed-in');

        return refreshedUser;
      } catch (error) {
        setErrorMessage(getErrorMessage(error));

        if (
          error instanceof SessionExpiredError ||
          error instanceof SessionRequiredError
        ) {
          setUser(null);
          setStatus('signed-out');
        }

        return null;
      }
    },

    signIn: async (email, password) => {
      setStatus('signing-in');
      setErrorMessage(null);

      try {
        const signedInUser = await sessionClient.login(email, password);

        setUser(signedInUser);
        setStatus('signed-in');

        return signedInUser;
      } catch (error) {
        setStatus('signed-out');
        setErrorMessage(getErrorMessage(error));

        return null;
      }
    },

    signOut: async () => {
      setStatus('signing-out');
      setErrorMessage(null);

      try {
        await sessionClient.logout();
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        // logout() drops the in-memory session before touching storage, so the
        // UI must not stay stuck in "signing-out" if clearing storage fails.
        setUser(sessionClient.getCurrentUser());
        setStatus(sessionClient.getCurrentUser() ? 'signed-in' : 'signed-out');
      }
    },

    status,
    user,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used within a SessionProvider.');
  }

  return value;
}
