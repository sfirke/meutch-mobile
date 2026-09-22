import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { InboxScreen } from '../InboxScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const push = jest.fn();

const VIEWER_ID = 'fake-user-1';

const viewer = {
  id: VIEWER_ID,
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

const otherUser = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

const secondUser = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Rae',
  last_name: 'Example',
  full_name: 'Rae Example',
  profile_image_url: null,
};

const MESSAGE_ID = 'c3333333-3333-4333-8333-333333333333';
const SECOND_MESSAGE_ID = 'd4444444-4444-4444-8444-444444444444';

function pagination(overrides?: Record<string, unknown>) {
  return {
    page: 1,
    per_page: 20,
    total: 1,
    pages: 1,
    has_next: false,
    has_prev: false,
    ...overrides,
  };
}

function message(overrides?: Record<string, unknown>) {
  return {
    id: MESSAGE_ID,
    body: 'Is the drill free this weekend?',
    timestamp: '2026-05-01T12:00:00+00:00',
    is_read: true,
    sender: otherUser,
    recipient: viewer,
    ...overrides,
  };
}

function conversation(overrides?: Record<string, unknown>) {
  return {
    conversation_id: 'conversation-1',
    other_user: otherUser,
    latest_message: message(),
    unread_count: 0,
    is_archived: false,
    item: null,
    item_request: null,
    circle: null,
    ...overrides,
  };
}

function conversationPage(
  conversations: Record<string, unknown>[],
  paginationOverrides?: Record<string, unknown>,
) {
  return jsonResponse({
    conversations,
    pagination: pagination(paginationOverrides),
  });
}

function renderInboxScreen(
  authenticatedApiFetch: jest.MockedFunction<ApiFetch>,
) {
  mockSession({
    authenticatedApiFetch,
    user: {
      ...viewer,
      email: 'fake.member@example.com',
      email_confirmed: true,
    },
  });

  return renderWithProviders(<InboxScreen />);
}

function assertOnlyReads(
  authenticatedApiFetch: jest.MockedFunction<ApiFetch>,
): void {
  for (const [, init] of authenticatedApiFetch.mock.calls) {
    const method = init?.method;

    expect(method === undefined || method === 'GET').toBe(true);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
});

describe('InboxScreen', () => {
  test('shows a spinner before the first page resolves', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const authenticatedApiFetch = jest.fn(
      (_path: string) =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByLabelText('Loading messages')).toBeTruthy();

    resolveFetch(conversationPage([]));
    await waitFor(
      () => expect(screen.queryByLabelText('Loading messages')).toBeNull(),
      { timeout: 3000 },
    );
  });

  test('renders rows for a populated inbox and requests page 1', async () => {
    const unread = conversation({
      conversation_id: 'conversation-2',
      other_user: secondUser,
      unread_count: 2,
      latest_message: message({
        id: SECOND_MESSAGE_ID,
        body: 'Thanks, picking it up tomorrow.',
        sender: secondUser,
      }),
    });

    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      conversationPage([conversation(), unread]),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('Ada Example')).toBeTruthy();
    expect(screen.getByText('Rae Example')).toBeTruthy();
    expect(screen.getByText('Is the drill free this weekend?')).toBeTruthy();
    expect(screen.getAllByTestId('conversation-unread-dot')).toHaveLength(1);
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
      '/messages?status=inbox&page=1',
    );
  });

  test('prefixes the viewer own latest message with "You:"', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      conversationPage([
        conversation({
          latest_message: message({
            body: 'Sure, any time after noon.',
            sender: viewer,
            recipient: otherUser,
          }),
        }),
      ]),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(
      await screen.findByText('You: Sure, any time after noon.'),
    ).toBeTruthy();
  });

  test('shows the inbox empty copy when there are no conversations', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      conversationPage([]),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('No messages yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Conversations about items and circles will show up here.',
      ),
    ).toBeTruthy();
  });

  test('shows the archived empty copy on the archived segment', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      conversationPage([]),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('No messages yet')).toBeTruthy();

    fireEvent.press(screen.getByText('Archived'));

    expect(await screen.findByText('Nothing archived')).toBeTruthy();
    expect(
      screen.getByText(
        'Archived conversations will show up here. Archive conversations on meutch.com.',
      ),
    ).toBeTruthy();
  });

  test('shows offline copy and retries on request', async () => {
    const authenticatedApiFetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(
        conversationPage([conversation()]),
      ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Ada Example')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
  });

  test('pages forward and dedupes a conversation repeated across pages', async () => {
    const first = conversation();
    const second = conversation({
      conversation_id: 'conversation-2',
      other_user: secondUser,
      latest_message: message({
        id: SECOND_MESSAGE_ID,
        body: 'Thanks, picking it up tomorrow.',
        sender: secondUser,
      }),
    });
    const third = conversation({
      conversation_id: 'conversation-3',
      other_user: {
        ...otherUser,
        id: 'e5555555-5555-4555-8555-555555555555',
        first_name: 'Lin',
        full_name: 'Lin Example',
      },
      latest_message: message({
        id: 'f6666666-6666-4666-8666-666666666666',
        body: 'Left it on the porch.',
      }),
    });

    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === '/messages?status=inbox&page=1') {
        return conversationPage([first, second], {
          page: 1,
          has_next: true,
        });
      }

      if (path === '/messages?status=inbox&page=2') {
        // The inbox is offset-paged over live data, so a row can repeat.
        return conversationPage([second, third], {
          page: 2,
          has_next: false,
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    }) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('Ada Example')).toBeTruthy();

    fireEvent(screen.getByTestId('inbox-list'), 'endReached');

    expect(await screen.findByText('Lin Example')).toBeTruthy();
    expect(screen.getAllByText('Rae Example')).toHaveLength(1);
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
    expect(authenticatedApiFetch.mock.calls[1][0]).toBe(
      '/messages?status=inbox&page=2',
    );
  });

  test('pull-to-refresh re-requests only the first page', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === '/messages?status=inbox&page=1') {
        return conversationPage([conversation()], {
          page: 1,
          has_next: true,
        });
      }

      if (path === '/messages?status=inbox&page=2') {
        return conversationPage(
          [
            conversation({
              conversation_id: 'conversation-2',
              other_user: secondUser,
              latest_message: message({
                id: SECOND_MESSAGE_ID,
                sender: secondUser,
              }),
            }),
          ],
          { page: 2, has_next: false },
        );
      }

      throw new Error(`Unexpected request: ${path}`);
    }) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('Ada Example')).toBeTruthy();

    const list = screen.getByTestId('inbox-list');
    fireEvent(list, 'endReached');

    expect(await screen.findByText('Rae Example')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);

    fireEvent(list, 'refresh');

    await waitFor(
      () => expect(authenticatedApiFetch).toHaveBeenCalledTimes(3),
      { timeout: 3000 },
    );
    expect(authenticatedApiFetch.mock.calls[2][0]).toBe(
      '/messages?status=inbox&page=1',
    );
  });

  test('switching to Archived requests the archived folder', async () => {
    const archived = conversation({
      conversation_id: 'conversation-archived',
      is_archived: true,
      other_user: secondUser,
      latest_message: message({
        id: SECOND_MESSAGE_ID,
        body: 'Closing this out.',
        sender: secondUser,
      }),
    });

    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === '/messages?status=archived&page=1') {
        return conversationPage([archived]);
      }

      return conversationPage([conversation()]);
    }) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('Ada Example')).toBeTruthy();

    fireEvent.press(screen.getByText('Archived'));

    expect(await screen.findByText('Rae Example')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[1][0]).toBe(
      '/messages?status=archived&page=1',
    );
  });

  test('tapping a row pushes the thread keyed by the latest message', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      conversationPage([conversation()]),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    fireEvent.press(await screen.findByRole('button', { name: 'Ada Example' }));

    expect(push).toHaveBeenCalledWith(`/message/${MESSAGE_ID}`);
  });

  test('a row whose other participant was deleted is not tappable', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      conversationPage([conversation({ other_user: null })]),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('Deleted User')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Deleted User' })).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  test('never sends a non-GET request', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === '/messages?status=inbox&page=1') {
        return conversationPage([conversation()], {
          page: 1,
          has_next: true,
        });
      }

      return conversationPage([], { page: 2, has_next: false });
    }) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    expect(await screen.findByText('Ada Example')).toBeTruthy();

    const list = screen.getByTestId('inbox-list');
    fireEvent(list, 'endReached');
    await waitFor(
      () => expect(authenticatedApiFetch).toHaveBeenCalledTimes(2),
      { timeout: 3000 },
    );

    fireEvent(list, 'refresh');
    fireEvent.press(screen.getByText('Archived'));

    await waitFor(
      () =>
        expect(
          authenticatedApiFetch.mock.calls.some(
            ([path]) => path === '/messages?status=archived&page=1',
          ),
        ).toBe(true),
      { timeout: 3000 },
    );

    assertOnlyReads(authenticatedApiFetch);
  });
});
