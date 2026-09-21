import { Redirect, Stack } from 'expo-router';

import { useSession } from '../../src/session/SessionProvider';

export default function AuthLayout() {
  const { status } = useSession();

  if (status === 'restoring') {
    return null;
  }

  // 'signing-in' deliberately stays put so the form can show its busy state and
  // then the error message if the credentials are rejected.
  if (status === 'signed-in') {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
