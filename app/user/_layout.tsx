import { Stack } from 'expo-router';

import { RequireSession } from '../../src/components/RequireSession';
import { stackScreenOptions } from '../../src/components/ui/NavigationChrome';

// User profile screens live outside the tab group but still need a session,
// so the gate lives here rather than in each screen.
export default function UserLayout() {
  return (
    <RequireSession>
      <Stack screenOptions={stackScreenOptions} />
    </RequireSession>
  );
}
