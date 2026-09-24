import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import {
  createTestQueryClient,
  getRequestBody,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { circleKeys, feedKeys, itemKeys } from '../../lib/queryKeys';
import { useJoinCircleMutation } from '../useJoinCircleMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const CIRCLE_ID = 'c1111111-1111-4111-8111-111111111111';

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('joining invalidates circleKeys.all on success', async () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /circles/${CIRCLE_ID}/join`]: (init?: RequestInit) => {
      expect(getRequestBody(init)).toEqual({ message: 'Please let me in.' });

      return { membership_status: 'pending', join_request: null };
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useJoinCircleMutation(CIRCLE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync('Please let me in.');
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({
    membership_status: 'pending',
    join_request: null,
  });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: circleKeys.all });
  // A pending request opens up nothing yet, so Feed and Browse stay put.
  expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: feedKeys.all });
  expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: itemKeys.all });
});

test('becoming a member also invalidates the feed and items', async () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /circles/${CIRCLE_ID}/join`]: {
      membership_status: 'member',
      join_request: null,
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useJoinCircleMutation(CIRCLE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync(undefined);
  });

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: circleKeys.all });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: feedKeys.all });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: itemKeys.all });
});

test('a failed join does not invalidate and exposes the ApiError', async () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /circles/${CIRCLE_ID}/join`]: {
      status: 400,
      json: async () => ({
        error: {
          code: 'INVALID_ACTION',
          message: 'You are already a member of this circle.',
        },
      }),
      ok: false,
      clone() {
        return this;
      },
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useJoinCircleMutation(CIRCLE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync(undefined).catch(() => {});
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(isApiError(result.current.error) && result.current.error.code).toBe(
    'INVALID_ACTION',
  );
  expect(invalidateSpy).not.toHaveBeenCalled();
});
