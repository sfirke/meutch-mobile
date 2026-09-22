import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import {
  createTestQueryClient,
  defaultSettingsFixture,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useSettingsQuery } from '../useSettingsQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

describe('useSettingsQuery', () => {
  test('loads and parses the settings fixture', async () => {
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/settings': { settings: defaultSettingsFixture },
    });
    mockSession({ authenticatedApiFetch });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSettingsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(defaultSettingsFixture);
  });
});
