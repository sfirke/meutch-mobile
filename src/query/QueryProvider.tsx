import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { isApiError, RequestTimeoutError } from '../lib/api';
import { SessionExpiredError, SessionRequiredError } from '../lib/session';
import { useSession } from '../session/SessionProvider';

const MAX_RETRIES = 2;

/** Retry policy shared by every query: no point burning the rate limit on
 * errors an immediate retry cannot fix. */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (
    error instanceof SessionExpiredError ||
    error instanceof SessionRequiredError
  ) {
    return false;
  }

  // The member has already waited the full timeout; let them choose to retry.
  if (error instanceof RequestTimeoutError) {
    return false;
  }

  if (isApiError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        // Feed-like data doesn't need to be second-fresh; a modest staleTime
        // avoids refetch storms that would burn the 60 reads/min budget.
        staleTime: 30 * 1000,
        // Long enough to survive quick screen swaps; sign-out clears the
        // cache outright anyway, so this isn't the privacy boundary.
        gcTime: 5 * 60 * 1000,
        // There is no browser "window" to focus on native; wiring
        // AppState/NetInfo-based refetching is out of scope for this PR.
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createQueryClient());
  const { status, user } = useSession();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = previousUserIdRef.current;
    const hadSignedInUser =
      previousUserId !== undefined && previousUserId !== null;

    // Clear whenever a previously signed-in user signs out, or a different
    // user takes over the session, so a second person on this phone never
    // sees the last member's cached feed.
    if (
      hadSignedInUser &&
      (status === 'signed-out' || currentUserId !== previousUserId)
    ) {
      queryClient.clear();
    }

    previousUserIdRef.current = currentUserId;
  }, [queryClient, status, user?.id]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
