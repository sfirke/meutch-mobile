import { Stack } from 'expo-router';

import { RequireSession } from '../../src/components/RequireSession';

// Settings lives outside the tab group but still needs a session, so the
// gate lives here rather than in the screen.
export default function ProfileStackLayout() {
  return (
    <RequireSession>
      <Stack />
    </RequireSession>
  );
}
