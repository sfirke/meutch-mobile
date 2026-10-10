import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { referenceKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useTagsQuery } from '../useTagsQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

describe('useTagsQuery', () => {
  test('loads tags under the reference key', async () => {
    const authenticatedApiFetch = mockApiFetch({
      'GET /tags': {
        tags: [
          { id: 'c3333333-3333-4333-8333-333333333333', name: 'power' },
          { id: 'd4444444-4444-4444-8444-444444444444', name: 'garden' },
        ],
      },
    });
    mockSession({ authenticatedApiFetch });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useTagsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((t) => t.name)).toEqual([
      'power',
      'garden',
    ]);
    expect(queryClient.getQueryData(referenceKeys.tags())).toEqual(
      result.current.data,
    );
  });
});
