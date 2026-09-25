import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import type { MessageSummary, MessageThread } from '../../lib/messages';
import { messageKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useReplyMutation } from '../useReplyMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const MESSAGE_ID = 'a1111111-1111-4111-8111-111111111111';
const REPLY_ID = 'b2222222-2222-4222-8222-222222222222';

const otherUser = {
  id: 'c3333333-3333-4333-8333-333333333333',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
  profile_viewable: false,
};

const viewer = {
  id: 'd4444444-4444-4444-8444-444444444444',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

const firstMessage: MessageSummary = {
  id: MESSAGE_ID,
  body: 'Is this still available?',
  timestamp: '2026-05-26T18:30:00+00:00',
  is_read: true,
  sender: otherUser,
  recipient: viewer,
};

const replyPayload = {
  id: REPLY_ID,
  body: 'Yes, it is.',
  timestamp: '2026-05-26T18:31:00+00:00',
  is_read: false,
  sender: viewer,
  recipient: otherUser,
};

function createThread(): MessageThread {
  return {
    conversation_id: 'e5555555-5555-4555-8555-555555555555',
    other_user: otherUser,
    shared_circles: [],
    context: { kind: 'none' },
    active_loan: null,
    has_unread_messages: false,
    messages: [firstMessage],
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

test('appends the reply to the thread cache and invalidates messages', async () => {
  const queryClient = createTestQueryClient();

  seedThread(queryClient);

  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /messages/${MESSAGE_ID}/reply`]: (init?: RequestInit) => {
      expect(getRequestBody(init)).toEqual({ body: 'Yes, it is.' });

      return jsonResponse({ message: replyPayload }, 201);
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useReplyMutation(MESSAGE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync('Yes, it is.');
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const thread = queryClient.getQueryData<MessageThread>(
    messageKeys.thread(MESSAGE_ID),
  );

  expect(thread?.messages.map((message) => message.id)).toEqual([
    MESSAGE_ID,
    REPLY_ID,
  ]);
  expect(thread?.messages[1].body).toBe('Yes, it is.');
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: messageKeys.all });
});

test('a rejected reply leaves the cache untouched and exposes the error', async () => {
  const queryClient = createTestQueryClient();

  seedThread(queryClient);

  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /messages/${MESSAGE_ID}/reply`]: jsonResponse(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request.',
          details: { body: ['Length must be between 1 and 1000.'] },
        },
      },
      422,
    ),
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useReplyMutation(MESSAGE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync('').catch(() => {});
  });

  await waitFor(() => expect(result.current.isError).toBe(true));

  const thread = queryClient.getQueryData<MessageThread>(
    messageKeys.thread(MESSAGE_ID),
  );

  expect(thread?.messages).toHaveLength(1);
  expect(
    isApiError(result.current.error) && result.current.error.details,
  ).toEqual({ body: ['Length must be between 1 and 1000.'] });
  expect(invalidateSpy).not.toHaveBeenCalled();
});
