import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryProvider } from '../src/query/QueryProvider';
import { SessionProvider, useSession } from '../src/session/SessionProvider';
import { fontAssets } from '../src/theme/fonts';

// Held from module scope so the splash is pinned before the first render; a
// returning member must never see the sign-in screen flash past.
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useSession();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // A font that fails to load falls back to the system font rather than
  // holding the splash forever.
  const fontsReady = fontsLoaded || fontError !== null;
  const isReady = status !== 'restoring' && fontsReady;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Rendering nothing while restoring also means no navigator exists yet, so
  // the group layouts cannot redirect on a session we have not read.
  if (!isReady) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="item" options={{ headerShown: false }} />
      <Stack.Screen name="request" options={{ headerShown: false }} />
      <Stack.Screen name="loan" options={{ headerShown: false }} />
      <Stack.Screen name="message" options={{ headerShown: false }} />
      <Stack.Screen name="circle" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="user" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <SessionProvider>
            <QueryProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </QueryProvider>
          </SessionProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
