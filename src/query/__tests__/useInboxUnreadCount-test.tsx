import { QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { ConversationPage, ConversationSummary } from '../../lib/messages';
import { messageKeys } from '../../lib/queryKeys';
import { createTestQueryClient } from '../../test-utils/renderWithProviders';
import { useInboxUnreadCount } from '../useInboxUnreadCount';

const otherUser = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

const viewer = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

function conversation(
  conversationId: string,
  unreadCount: number,
): ConversationSummary {
  return {
    conversation_id: conversationId,
    other_user: otherUser,
    latest_message: {
      id: `${conversationId}-message`,
      body: 'Is this still available?',
      timestamp: '2026-05-26T18:30:00+00:00',
      is_read: unreadCount === 0,
      sender: otherUser,
      recipient: viewer,
    },
    unread_count: unreadCount,
    is_archived: false,
    context: { kind: 'none' },
  };
}

function page(
  pageNumber: number,
  conversations: ConversationSummary[],
): ConversationPage {
  return {
    conversations,
    pagination: {
      page: pageNumber,
      per_page: 20,
      total: conversations.length,
      pages: 2,
      has_next: pageNumber === 1,
      has_prev: pageNumber > 1,
    },
  };
}

function renderUnreadCount() {
  const queryClient = createTestQueryClient();
  const inboxKey = messageKeys.inbox({ status: 'inbox' });

  // The test client gcs entries with no observer immediately, and this hook
  // never subscribes to the query itself.
  queryClient.setQueryDefaults(inboxKey, { gcTime: Infinity });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const view = renderHook(() => useInboxUnreadCount(), { wrapper });

  function setInbox(pages: ConversationPage[]): void {
    act(() => {
      queryClient.setQueryData<InfiniteData<ConversationPage, number>>(
        inboxKey,
        {
          pages,
          pageParams: pages.map((_, index) => index + 1),
        },
      );
    });
  }

  return { ...view, setInbox };
}

describe('useInboxUnreadCount', () => {
  test('is zero when the inbox has never been loaded', () => {
    const { result } = renderUnreadCount();

    expect(result.current).toBe(0);
  });

  test('counts only first-page rows with unread messages', () => {
    const { result, setInbox } = renderUnreadCount();

    setInbox([
      page(1, [
        conversation('conversation-1', 2),
        conversation('conversation-2', 0),
        conversation('conversation-3', 1),
      ]),
      page(2, [conversation('conversation-4', 5)]),
    ]);

    expect(result.current).toBe(2);
  });

  test('follows later cache updates', () => {
    const { result, setInbox } = renderUnreadCount();

    setInbox([page(1, [conversation('conversation-1', 1)])]);

    expect(result.current).toBe(1);

    setInbox([page(1, [conversation('conversation-1', 0)])]);

    expect(result.current).toBe(0);
  });
});
