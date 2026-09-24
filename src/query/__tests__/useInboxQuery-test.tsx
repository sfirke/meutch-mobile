import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useInboxQuery } from '../useInboxQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const FIRST_CONVERSATION_ID = 'a1111111-1111-4111-8111-111111111111';
const SECOND_CONVERSATION_ID = 'b2222222-2222-4222-8222-222222222222';

const otherUser = {
  id: 'c3333333-3333-4333-8333-333333333333',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

const viewer = {
  id: 'd4444444-4444-4444-8444-444444444444',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

function createConversation(conversationId: string, messageId: string) {
  return {
    conversation_id: conversationId,
    other_user: otherUser,
    latest_message: {
      id: messageId,
      body: 'Is this still available?',
      timestamp: '2026-05-26T18:30:00+00:00',
      is_read: false,
      sender: otherUser,
      recipient: viewer,
    },
    unread_count: 1,
    is_archived: false,
    item: null,
    item_request: null,
    circle: null,
  };
}

function createPagination(page: number, hasNext: boolean) {
  return {
    page,
    per_page: 20,
    total: 2,
    pages: 2,
    has_next: hasNext,
    has_prev: page > 1,
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('de-duplicates a conversation repeated across two pages', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    '/messages?status=inbox&page=1': {
      conversations: [
        createConversation(
          FIRST_CONVERSATION_ID,
          'e5555555-5555-4555-8555-555555555555',
        ),
      ],
      pagination: createPagination(1, true),
    },
    // The backend pages in Python over live data, so page 2 can repeat a row.
    '/messages?status=inbox&page=2': {
      conversations: [
        createConversation(
          FIRST_CONVERSATION_ID,
          'e5555555-5555-4555-8555-555555555555',
        ),
        createConversation(
          SECOND_CONVERSATION_ID,
          'f6666666-6666-4666-8666-666666666666',
        ),
      ],
      pagination: createPagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useInboxQuery('inbox'), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.conversations).toHaveLength(1);

  await act(async () => {
    await result.current.fetchNextPage();
  });

  await waitFor(() => expect(result.current.conversations).toHaveLength(2));
  expect(
    result.current.conversations.map(
      (conversation) => conversation.conversation_id,
    ),
  ).toEqual([FIRST_CONVERSATION_ID, SECOND_CONVERSATION_ID]);
  expect(result.current.hasNextPage).toBe(false);
});

test('requests the archived status when asked', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    '/messages?status=archived&page=1': {
      conversations: [],
      pagination: createPagination(1, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useInboxQuery('archived'), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
    '/messages?status=archived&page=1',
  );
  expect(result.current.conversations).toEqual([]);
});
