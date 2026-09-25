import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { circleKeys } from '../../lib/queryKeys';
import { useCancelJoinRequestMutation } from '../useCancelJoinRequestMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const CIRCLE_ID = 'c1111111-1111-4111-8111-111111111111';

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('canceling invalidates circleKeys.all on success', async () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /circles/${CIRCLE_ID}/cancel-request`]: { canceled: true },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useCancelJoinRequestMutation(CIRCLE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync();
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ canceled: true });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: circleKeys.all });
});
