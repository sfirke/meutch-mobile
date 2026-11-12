import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { messageKeys } from '../../lib/queryKeys';
import type { SessionStatus } from '../../session/SessionProvider';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useInboxUnreadCount } from '../useInboxUnreadCount';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const UNREAD_COUNT = 'GET /messages/unread-count';

function setup(
  routes: Parameters<typeof mockApiFetch>[0],
  status: SessionStatus = 'signed-in',
) {
  const authenticatedApiFetch = mockApiFetch(routes);
  mockSession({ authenticatedApiFetch, status });

  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const hook = renderHook(() => useInboxUnreadCount(), { wrapper });

  return { ...hook, authenticatedApiFetch, queryClient };
}

describe('useInboxUnreadCount', () => {
  test('fetches the count without the inbox being loaded', async () => {
    const { result } = setup({ [UNREAD_COUNT]: { unread_count: 3 } });

    await waitFor(() => expect(result.current).toBe(3));
  });

  test('is zero until the first response arrives', () => {
    const { result } = setup({ [UNREAD_COUNT]: { unread_count: 3 } });

    expect(result.current).toBe(0);
  });

  test('refetches when invalidated', async () => {
    let count = 2;
    const { result, queryClient } = setup({
      [UNREAD_COUNT]: () => ({ unread_count: count }),
    });

    await waitFor(() => expect(result.current).toBe(2));

    count = 0;
    await act(() =>
      queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
    );

    await waitFor(() => expect(result.current).toBe(0));
  });

  test('does not fetch without a signed-in session', () => {
    const { result, authenticatedApiFetch } = setup(
      { [UNREAD_COUNT]: { unread_count: 3 } },
      'signing-out',
    );

    expect(authenticatedApiFetch).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
  });
});
