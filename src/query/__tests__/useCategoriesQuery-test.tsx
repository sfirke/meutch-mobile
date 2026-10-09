import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { referenceKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useCategoriesQuery } from '../useCategoriesQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

describe('useCategoriesQuery', () => {
  test('loads sorted categories under the reference key', async () => {
    const authenticatedApiFetch = mockApiFetch({
      'GET /categories': {
        categories: [
          { id: 'c3333333-3333-4333-8333-333333333333', name: 'Tools' },
          { id: 'd4444444-4444-4444-8444-444444444444', name: 'Books' },
        ],
      },
    });
    mockSession({ authenticatedApiFetch });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCategoriesQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((c) => c.name)).toEqual(['Books', 'Tools']);
    expect(queryClient.getQueryData(referenceKeys.categories())).toEqual(
      result.current.data,
    );
  });
});
