import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from './src/components/AppShell';
import { SessionProvider } from './src/session/SessionProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <AppShell />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
