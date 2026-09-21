import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryProvider } from '../src/query/QueryProvider';
import { SessionProvider, useSession } from '../src/session/SessionProvider';

// Held from module scope so the splash is pinned before the first render; a
// returning member must never see the sign-in screen flash past.
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useSession();
  const isRestoring = status === 'restoring';

  useEffect(() => {
    if (!isRestoring) {
      void SplashScreen.hideAsync();
    }
  }, [isRestoring]);

  // Rendering nothing while restoring also means no navigator exists yet, so
  // the group layouts cannot redirect on a session we have not read.
  if (isRestoring) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <QueryProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </QueryProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
