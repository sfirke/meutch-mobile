import { StatusBar } from 'expo-status-bar';

import { AppShell } from './src/components/AppShell';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <AppShell />
    </>
  );
}
