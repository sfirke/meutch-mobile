import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from '../AppShell';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

jest.mock('../../config/env', () => ({
  environmentOptions: [
    { name: 'local', apiBaseUrl: 'http://10.0.2.2:5000/api/v1' },
    {
      name: 'integration',
      apiBaseUrl: 'https://mobile-int-api.meutch.com/api/v1',
    },
    { name: 'production', apiBaseUrl: 'https://meutch.com/api/v1' },
  ],
  runtimeConfig: {
    environmentName: 'integration',
    apiBaseUrl: 'https://mobile-int-api.meutch.com/api/v1',
  },
}));

describe('<AppShell />', () => {
  test('renders the current API target and auth milestones', () => {
    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <AppShell />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Meutch Mobile')).toBeTruthy();
    expect(screen.getByText('Current target')).toBeTruthy();
    expect(screen.getAllByText('integration')).toHaveLength(2);
    expect(
      screen.getAllByText('https://mobile-int-api.meutch.com/api/v1'),
    ).toHaveLength(2);
    expect(
      screen.getByText('Restore the last valid session on app launch.'),
    ).toBeTruthy();
  });
});
