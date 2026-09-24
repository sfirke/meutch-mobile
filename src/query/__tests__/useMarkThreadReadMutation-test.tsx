import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import type { MessageThread } from '../../lib/messages';
import { messageKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useMarkThreadReadMutation } from '../useMarkThreadReadMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const MESSAGE_ID = 'a1111111-1111-4111-8111-111111111111';

const otherUser = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

const viewer = {
  id: 'c3333333-3333-4333-8333-333333333333',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

function createThread(): MessageThread {
  return {
    conversation_id: 'd4444444-4444-4444-8444-444444444444',
    other_user: otherUser,
    shared_circles: [],
    context: { kind: 'none' },
    active_loan: null,
    has_unread_messages: true,
    messages: [
      {
        id: MESSAGE_ID,
        body: 'Is this still available?',
        timestamp: '2026-05-26T18:30:00+00:00',
        is_read: false,
        sender: otherUser,
        recipient: viewer,
      },
    ],
  };
}

// createTestQueryClient sets gcTime: 0, which would drop an observer-less
// seeded thread before the assertions run.
function seedThread(client: ReturnType<typeof createTestQueryClient>) {
  client.setQueryDefaults(messageKeys.thread(MESSAGE_ID), {
    gcTime: Infinity,
  });
  client.setQueryData(messageKeys.thread(MESSAGE_ID), createThread());
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('clears the thread unread flag and invalidates the inbox', async () => {
  const queryClient = createTestQueryClient();

  seedThread(queryClient);

  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /messages/${MESSAGE_ID}/mark-read`]: (init?: RequestInit) => {
      expect(init?.body).toBeUndefined();

      return { has_unread_messages: false };
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMarkThreadReadMutation(MESSAGE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync();
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(
    queryClient.getQueryData<MessageThread>(messageKeys.thread(MESSAGE_ID))
      ?.has_unread_messages,
  ).toBe(false);
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: [...messageKeys.all, 'inbox'],
  });
});

test('a failed mark-read keeps the unread flag and exposes the error', async () => {
  const queryClient = createTestQueryClient();

  seedThread(queryClient);

  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /messages/${MESSAGE_ID}/mark-read`]: jsonResponse(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You are not part of this conversation.',
        },
      },
      403,
    ),
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMarkThreadReadMutation(MESSAGE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync().catch(() => {});
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(
    queryClient.getQueryData<MessageThread>(messageKeys.thread(MESSAGE_ID))
      ?.has_unread_messages,
  ).toBe(true);
  expect(isApiError(result.current.error) && result.current.error.code).toBe(
    'FORBIDDEN',
  );
  expect(invalidateSpy).not.toHaveBeenCalled();
});
