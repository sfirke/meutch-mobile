import {
  QueryClientProvider,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import type {
  ConversationPage,
  ConversationSummary,
  InboxSort,
  InboxStatus,
} from '../../lib/messages';
import { messageKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import {
  useInboxActionMutation,
  type InboxActionVariables,
} from '../useInboxActionMutation';
import { useInboxQuery } from '../useInboxQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

type InboxData = InfiniteData<ConversationPage, number>;
type QueryClient = ReturnType<typeof createTestQueryClient>;

const FIRST_ID = 'a1111111-1111-4111-8111-111111111111';
const SECOND_ID = 'b2222222-2222-4222-8222-222222222222';
const THIRD_ID = 'c3333333-3333-4333-8333-333333333333';
const ARCHIVED_ID = 'd4444444-4444-4444-8444-444444444444';

const INBOX_KEY = messageKeys.inbox({ status: 'inbox', sort: 'newest' });
const ARCHIVED_KEY = messageKeys.inbox({ status: 'archived', sort: 'newest' });

const otherUser = {
  id: 'e5555555-5555-4555-8555-555555555555',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
  profile_viewable: false,
};

const viewer = {
  id: 'f6666666-6666-4666-8666-666666666666',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

function rawConversation(conversationId: string, isArchived = false) {
  return {
    conversation_id: conversationId,
    other_user: otherUser,
    latest_message: {
      id: `${conversationId.slice(0, -1)}9`,
      body: 'Is this still available?',
      timestamp: '2026-05-26T18:30:00+00:00',
      is_read: false,
      sender: otherUser,
      recipient: viewer,
    },
    unread_count: 2,
    is_archived: isArchived,
    item: null,
    item_request: null,
    circle: null,
  };
}

function conversation(
  conversationId: string,
  isArchived = false,
): ConversationSummary {
  const raw = rawConversation(conversationId, isArchived);

  return {
    conversation_id: raw.conversation_id,
    other_user: raw.other_user,
    latest_message: raw.latest_message,
    unread_count: raw.unread_count,
    is_archived: raw.is_archived,
    context: { kind: 'none' },
  };
}

function pagination(page: number, pages: number) {
  return {
    page,
    per_page: 2,
    total: 3,
    pages,
    has_next: page < pages,
    has_prev: page > 1,
  };
}

// Stale-free and kept, so seeded entries neither refetch on mount nor get
// dropped before the assertions run (createTestQueryClient sets gcTime: 0).
function seedInbox(client: QueryClient) {
  client.setQueryDefaults([...messageKeys.all, 'inbox'], {
    gcTime: Infinity,
    staleTime: Infinity,
  });
  client.setQueryData<InboxData>(INBOX_KEY, {
    pages: [
      {
        conversations: [conversation(FIRST_ID), conversation(SECOND_ID)],
        pagination: pagination(1, 2),
      },
      { conversations: [conversation(THIRD_ID)], pagination: pagination(2, 2) },
    ],
    pageParams: [1, 2],
  });
  client.setQueryData<InboxData>(ARCHIVED_KEY, {
    pages: [
      {
        conversations: [conversation(ARCHIVED_ID, true)],
        pagination: { ...pagination(1, 1), total: 1 },
      },
    ],
    pageParams: [1],
  });
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function rowsOf(client: QueryClient, key: QueryKey) {
  return client
    .getQueryData<InboxData>(key)
    ?.pages.flatMap((page) => page.conversations);
}

function idsOf(client: QueryClient, key: QueryKey) {
  return rowsOf(client, key)?.map((row) => row.conversation_id);
}

function setup(
  routes: Record<string, MockRoute>,
  status: InboxStatus = 'inbox',
  sort: InboxSort = 'newest',
) {
  const queryClient = createTestQueryClient();

  seedInbox(queryClient);

  const authenticatedApiFetch = mockApiFetch(routes);

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(
    () => useInboxActionMutation({ status, sort }),
    { wrapper: createWrapper(queryClient) },
  );

  async function run(variables: InboxActionVariables) {
    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  }

  return { queryClient, authenticatedApiFetch, result, run };
}

const OK = { status: 'ok' };

test('archiving one conversation uses the single route and drops the row', async () => {
  const { queryClient, authenticatedApiFetch, run } = setup({
    [`POST /conversations/${SECOND_ID}/archive`]: OK,
  });

  await run({ action: 'archive', conversationIds: [SECOND_ID] });

  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  expect(idsOf(queryClient, INBOX_KEY)).toEqual([FIRST_ID, THIRD_ID]);

  const data = queryClient.getQueryData<InboxData>(INBOX_KEY);

  expect(data?.pageParams).toEqual([1, 2]);
  expect(data?.pages[0].pagination).toEqual(pagination(1, 2));
});

test('archiving several conversations uses the bulk route', async () => {
  const { queryClient, authenticatedApiFetch, run } = setup({
    'POST /conversations/bulk-archive': (init?: RequestInit) => {
      expect(getRequestBody(init)).toEqual({
        conversation_ids: [FIRST_ID, THIRD_ID],
      });

      return OK;
    },
  });

  await run({ action: 'archive', conversationIds: [FIRST_ID, THIRD_ID] });

  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  expect(idsOf(queryClient, INBOX_KEY)).toEqual([SECOND_ID]);
});

test('unarchiving one conversation uses the single route', async () => {
  const { queryClient, authenticatedApiFetch, run } = setup(
    { [`POST /conversations/${ARCHIVED_ID}/unarchive`]: OK },
    'archived',
  );

  await run({ action: 'unarchive', conversationIds: [ARCHIVED_ID] });

  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  expect(idsOf(queryClient, ARCHIVED_KEY)).toEqual([]);
  expect(idsOf(queryClient, INBOX_KEY)).toHaveLength(3);
});

test('unarchiving several conversations uses the bulk route', async () => {
  const { queryClient, run } = setup(
    {
      'POST /conversations/bulk-unarchive': (init?: RequestInit) => {
        expect(getRequestBody(init)).toEqual({
          conversation_ids: [ARCHIVED_ID, FIRST_ID],
        });

        return OK;
      },
    },
    'archived',
  );

  await run({ action: 'unarchive', conversationIds: [ARCHIVED_ID, FIRST_ID] });

  expect(idsOf(queryClient, ARCHIVED_KEY)).toEqual([]);
});

test('markRead zeroes the unread count on the affected rows only', async () => {
  const { queryClient, run } = setup({
    'POST /conversations/bulk-mark-read': (init?: RequestInit) => {
      expect(getRequestBody(init)).toEqual({ conversation_ids: [THIRD_ID] });

      return OK;
    },
  });

  await run({ action: 'markRead', conversationIds: [THIRD_ID] });

  expect(
    rowsOf(queryClient, INBOX_KEY)?.map((row) => row.unread_count),
  ).toEqual([2, 2, 0]);
});

test('markAllRead sends the folder status and zeroes every row', async () => {
  const { queryClient, authenticatedApiFetch, run } = setup(
    { 'POST /conversations/mark-all-read?status=archived': OK },
    'archived',
  );

  await run({ action: 'markAllRead' });

  expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
    '/conversations/mark-all-read?status=archived',
  );
  expect(
    rowsOf(queryClient, ARCHIVED_KEY)?.map((row) => row.unread_count),
  ).toEqual([0]);
  // The other folder is left to its own refetch.
  expect(
    rowsOf(queryClient, INBOX_KEY)?.map((row) => row.unread_count),
  ).toEqual([2, 2, 2]);
});

test('markUnread resolves with the count and refetches the current folder once', async () => {
  const queryClient = createTestQueryClient();

  seedInbox(queryClient);

  const authenticatedApiFetch = mockApiFetch({
    'POST /conversations/bulk-mark-unread': (init?: RequestInit) => {
      expect(getRequestBody(init)).toEqual({
        conversation_ids: [FIRST_ID, SECOND_ID],
      });

      return { status: 'ok', marked: 2 };
    },
    '/messages?status=inbox&page=1': {
      conversations: [rawConversation(FIRST_ID), rawConversation(SECOND_ID)],
      pagination: pagination(1, 2),
    },
    '/messages?status=inbox&page=2': {
      conversations: [rawConversation(THIRD_ID)],
      pagination: pagination(2, 2),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(
    () => ({
      inbox: useInboxQuery('inbox'),
      action: useInboxActionMutation({ status: 'inbox', sort: 'newest' }),
    }),
    { wrapper: createWrapper(queryClient) },
  );

  let value: { marked?: number } | undefined;

  await act(async () => {
    value = await result.current.action.mutateAsync({
      action: 'markUnread',
      conversationIds: [FIRST_ID, SECOND_ID],
    });
  });

  expect(value).toEqual({ marked: 2 });

  await waitFor(() =>
    expect(authenticatedApiFetch).toHaveBeenCalledWith(
      '/messages?status=inbox&page=2',
      expect.anything(),
    ),
  );
  await waitFor(() => expect(result.current.inbox.isFetching).toBe(false));

  const pageReads = authenticatedApiFetch.mock.calls.filter(([path]) =>
    path.startsWith('/messages'),
  );

  expect(pageReads.map(([path]) => path)).toEqual([
    '/messages?status=inbox&page=1',
    '/messages?status=inbox&page=2',
  ]);
  expect(queryClient.getQueryState(INBOX_KEY)?.isInvalidated).toBe(false);
  expect(queryClient.getQueryState(ARCHIVED_KEY)?.isInvalidated).toBe(true);
});

test('other folders and sorts are invalidated without refetching', async () => {
  const queryClient = createTestQueryClient();

  seedInbox(queryClient);

  const OLDEST_KEY = messageKeys.inbox({ status: 'inbox', sort: 'oldest' });

  queryClient.setQueryData<InboxData>(
    OLDEST_KEY,
    queryClient.getQueryData<InboxData>(INBOX_KEY),
  );

  const authenticatedApiFetch = mockApiFetch({
    'POST /conversations/bulk-mark-read': OK,
  });

  mockSession({ authenticatedApiFetch });

  // Mounted observers, so a refetch of either other entry would fire.
  const { result } = renderHook(
    () => ({
      archived: useInboxQuery('archived'),
      oldest: useInboxQuery('inbox', 'oldest'),
      action: useInboxActionMutation({ status: 'inbox', sort: 'newest' }),
    }),
    { wrapper: createWrapper(queryClient) },
  );

  await act(async () => {
    await result.current.action.mutateAsync({
      action: 'markRead',
      conversationIds: [FIRST_ID],
    });
  });

  // Settles the observers' async notifications inside act.
  await waitFor(() => {
    expect(result.current.archived.isStale).toBe(true);
    expect(result.current.oldest.isStale).toBe(true);
  });
  expect(queryClient.getQueryState(ARCHIVED_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(OLDEST_KEY)?.isInvalidated).toBe(true);
  // The patched current folder stays fresh.
  expect(queryClient.getQueryState(INBOX_KEY)?.isInvalidated).toBe(false);
  expect(result.current.archived.isFetching).toBe(false);
  expect(result.current.oldest.isFetching).toBe(false);
  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
});

test('a failed action leaves the cache untouched and exposes the error', async () => {
  const { queryClient, result, authenticatedApiFetch } = setup({
    'POST /conversations/bulk-archive': jsonResponse(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You are not part of this conversation.',
        },
      },
      403,
    ),
  });
  const before = queryClient.getQueryData<InboxData>(INBOX_KEY);
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

  await act(async () => {
    await result.current
      .mutateAsync({
        action: 'archive',
        conversationIds: [FIRST_ID, SECOND_ID],
      })
      .catch(() => {});
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData<InboxData>(INBOX_KEY)).toBe(before);
  expect(isApiError(result.current.error) && result.current.error.code).toBe(
    'FORBIDDEN',
  );
  expect(invalidateSpy).not.toHaveBeenCalled();
  expect(queryClient.getQueryState(ARCHIVED_KEY)?.isInvalidated).toBe(false);
});
