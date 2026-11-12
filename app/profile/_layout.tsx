import { Stack } from 'expo-router';

import { RequireSession } from '../../src/components/RequireSession';
import { stackScreenOptions } from '../../src/components/ui/NavigationChrome';

// Settings lives outside the tab group but still needs a session, so the
// gate lives here rather than in the screen.
export default function ProfileStackLayout() {
  return (
    <RequireSession>
      <Stack screenOptions={stackScreenOptions} />
    </RequireSession>
  );
}
