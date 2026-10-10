import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { categoryKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useCategoriesQuery } from '../useCategoriesQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const categories = [
  { id: 'a1111111-1111-4111-8111-111111111111', name: 'Books' },
  { id: 'b2222222-2222-4222-8222-222222222222', name: 'Tools' },
];

function setup(options?: Parameters<typeof useCategoriesQuery>[0]) {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    'GET /categories': { categories },
  });
  mockSession({ authenticatedApiFetch });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useCategoriesQuery(options), { wrapper });

  return { queryClient, authenticatedApiFetch, ...hook };
}

describe('useCategoriesQuery', () => {
  test('fetches categories and caches them under the list key', async () => {
    const { result, queryClient, authenticatedApiFetch } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(categories);
    expect(queryClient.getQueryData(categoryKeys.list())).toEqual(categories);
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  });

  test('makes no request when disabled', () => {
    const { result, authenticatedApiFetch } = setup({ enabled: false });

    expect(authenticatedApiFetch).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });
});
