import { Stack } from 'expo-router';

import { RequireSession } from '../../src/components/RequireSession';

// Request detail screens live outside the tab group but still need a session,
// so the gate lives here rather than in each screen.
export default function RequestLayout() {
  return (
    <RequireSession>
      <Stack />
    </RequireSession>
  );
}
