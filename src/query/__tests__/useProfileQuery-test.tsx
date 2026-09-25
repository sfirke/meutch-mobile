import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import {
  createTestQueryClient,
  defaultProfileFixture,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useProfileQuery } from '../useProfileQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

describe('useProfileQuery', () => {
  test('loads and parses the profile fixture', async () => {
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/profile': { user: defaultProfileFixture },
    });
    mockSession({ authenticatedApiFetch });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProfileQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(defaultProfileFixture);
  });
});
