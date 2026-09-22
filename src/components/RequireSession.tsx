import type { PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';

import { useSession } from '../session/SessionProvider';

/**
 * Wraps a layout so every route beneath it needs a session. `signing-out` is
 * deliberately allowed through: the screen stays mounted so its sign-out
 * control can show a busy state, and the redirect fires when the status
 * settles on `signed-out`.
 */
export function RequireSession({ children }: PropsWithChildren) {
  const { status } = useSession();

  if (status === 'restoring') {
    return null;
  }

  if (status === 'signed-out' || status === 'signing-in') {
    return <Redirect href="/sign-in" />;
  }

  return children;
}
