import { Stack } from 'expo-router';

import { RequireSession } from '../../src/components/RequireSession';

// Thread screens live outside the tab group but still need a session, so
// the gate lives here rather than in each screen.
export default function MessageLayout() {
  return (
    <RequireSession>
      <Stack />
    </RequireSession>
  );
}
