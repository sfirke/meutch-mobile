import {
  act,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { BackHandler } from 'react-native';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { InboxScreen } from '../InboxScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: jest.fn(),
}));
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
      screen.getByText('Archived conversations will show up here.'),
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

    const { queryClient } = renderInboxScreen(authenticatedApiFetch);

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
    // Let the refetch settle so the list's re-render stays inside the test.
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
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

  test('tapping a row whose other participant was deleted does not navigate', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      conversationPage([conversation({ other_user: null })]),
    ) as jest.MockedFunction<ApiFetch>;

    renderInboxScreen(authenticatedApiFetch);

    fireEvent.press(await screen.findByText('Deleted User'));

    expect(push).not.toHaveBeenCalled();
  });

  describe('managing conversations', () => {
    const INBOX_PATH = '/messages?status=inbox&page=1';
    const ARCHIVED_PATH = '/messages?status=archived&page=1';

    const ada = conversation();
    const rae = conversation({
      conversation_id: 'conversation-2',
      other_user: secondUser,
      unread_count: 2,
      latest_message: message({
        id: SECOND_MESSAGE_ID,
        body: 'Thanks, picking it up tomorrow.',
        sender: secondUser,
      }),
    });

    function postsTo(
      authenticatedApiFetch: jest.Mock<
        ReturnType<ApiFetch>,
        Parameters<ApiFetch>
      >,
      path: string,
    ) {
      return authenticatedApiFetch.mock.calls.filter(
        ([callPath, init]) => callPath === path && init?.method === 'POST',
      );
    }

    async function longPress(name: string) {
      fireEvent(await screen.findByText(name), 'longPress');
    }

    test('long-press selects a row, tapping toggles another, close exits', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada, rae]),
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');

      expect(screen.getByText('1 selected')).toBeTruthy();
      expect(screen.getAllByTestId('conversation-checkbox')).toHaveLength(2);

      fireEvent.press(screen.getByText('Rae Example'));

      expect(screen.getByText('2 selected')).toBeTruthy();
      expect(push).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText('Rae Example'));
      expect(screen.getByText('1 selected')).toBeTruthy();

      fireEvent.press(screen.getByTestId('selection-close'));

      expect(screen.queryByText('1 selected')).toBeNull();
      expect(screen.queryByTestId('conversation-checkbox')).toBeNull();
    });

    test('switching folders clears the selection', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada]),
        [ARCHIVED_PATH]: conversationPage([]),
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');
      expect(screen.getByText('1 selected')).toBeTruthy();

      fireEvent.press(screen.getByText('Archived'));

      expect(await screen.findByText('Nothing archived')).toBeTruthy();
      expect(screen.queryByText('1 selected')).toBeNull();
    });

    test('hardware back exits selection instead of leaving', async () => {
      const addListener = jest.spyOn(BackHandler, 'addEventListener');
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada]),
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');

      const [eventName, handler] = addListener.mock.calls.at(-1) ?? [];

      expect(eventName).toBe('hardwareBackPress');

      let consumed: boolean | null | undefined;
      act(() => {
        consumed = handler?.({} as never);
      });

      expect(consumed).toBe(true);
      expect(screen.queryByText('1 selected')).toBeNull();

      addListener.mockRestore();
    });

    test('archiving one conversation posts its route and removes the row', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada, rae]),
        'POST /conversations/conversation-1/archive': { status: 'ok' },
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');
      fireEvent.press(screen.getByTestId('selection-action-archive'));

      await waitForElementToBeRemoved(() => screen.queryByText('Ada Example'));
      expect(screen.getByText('Rae Example')).toBeTruthy();
      expect(screen.queryByText('1 selected')).toBeNull();
      expect(
        postsTo(authenticatedApiFetch, '/conversations/conversation-1/archive'),
      ).toHaveLength(1);
    });

    test('archiving two conversations posts bulk-archive', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada, rae]),
        'POST /conversations/bulk-archive': { status: 'ok', archived: 2 },
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');
      fireEvent.press(screen.getByText('Rae Example'));
      fireEvent.press(screen.getByTestId('selection-action-archive'));

      expect(await screen.findByText('No messages yet')).toBeTruthy();

      const [[, init]] = postsTo(
        authenticatedApiFetch,
        '/conversations/bulk-archive',
      );

      expect(getRequestBody(init)).toEqual({
        conversation_ids: ['conversation-1', 'conversation-2'],
      });
    });

    test('unarchiving on the archived folder posts the unarchive route', async () => {
      const archived = conversation({ is_archived: true });
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([]),
        [ARCHIVED_PATH]: conversationPage([archived]),
        'POST /conversations/conversation-1/unarchive': { status: 'ok' },
      });

      renderInboxScreen(authenticatedApiFetch);
      expect(await screen.findByText('No messages yet')).toBeTruthy();

      fireEvent.press(screen.getByText('Archived'));
      await longPress('Ada Example');

      expect(screen.queryByTestId('selection-action-archive')).toBeNull();

      fireEvent.press(screen.getByTestId('selection-action-unarchive'));

      expect(await screen.findByText('Nothing archived')).toBeTruthy();
      expect(
        postsTo(
          authenticatedApiFetch,
          '/conversations/conversation-1/unarchive',
        ),
      ).toHaveLength(1);
    });

    test('mark read applies to unread rows and clears the dot', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada, rae]),
        'POST /conversations/bulk-mark-read': { status: 'ok' },
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');

      // Ada is already read.
      expect(screen.getByTestId('selection-action-mark-read')).toBeDisabled();

      fireEvent.press(screen.getByText('Rae Example'));
      fireEvent.press(screen.getByTestId('selection-action-mark-read'));

      await waitForElementToBeRemoved(() =>
        screen.queryAllByTestId('conversation-unread-dot'),
      );

      const [[, init]] = postsTo(
        authenticatedApiFetch,
        '/conversations/bulk-mark-read',
      );

      expect(getRequestBody(init)).toEqual({
        conversation_ids: ['conversation-1', 'conversation-2'],
      });
    });

    test('mark unread posts bulk-mark-unread and refetches the folder', async () => {
      let inboxRequests = 0;
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: () => {
          inboxRequests += 1;

          return conversationPage(
            inboxRequests === 1 ? [ada] : [{ ...ada, unread_count: 1 }],
          );
        },
        'POST /conversations/bulk-mark-unread': { status: 'ok', marked: 1 },
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');

      expect(
        screen.getByTestId('selection-action-mark-unread'),
      ).not.toBeDisabled();

      fireEvent.press(screen.getByTestId('selection-action-mark-unread'));

      expect(await screen.findByTestId('conversation-unread-dot')).toBeTruthy();
      expect(inboxRequests).toBe(2);
      expect(
        postsTo(authenticatedApiFetch, '/conversations/bulk-mark-unread'),
      ).toHaveLength(1);
      expect(screen.queryByTestId('inbox-notice')).toBeNull();
    });

    test('a partial mark unread shows a notice', async () => {
      const second = { ...rae, unread_count: 0 };
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada, second]),
        'POST /conversations/bulk-mark-unread': { status: 'ok', marked: 1 },
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');
      fireEvent.press(screen.getByText('Rae Example'));
      fireEvent.press(screen.getByTestId('selection-action-mark-unread'));

      const notice = await screen.findByTestId('inbox-notice');

      expect(
        within(notice).getByText(
          "Conversations with no received messages can't be marked unread.",
        ),
      ).toBeTruthy();
      await waitFor(() =>
        expect(
          authenticatedApiFetch.mock.calls.filter(
            ([path]) => path === INBOX_PATH,
          ),
        ).toHaveLength(2),
      );
    });

    test('mark all read posts for the folder and clears every dot', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([{ ...ada, unread_count: 1 }, rae]),
        'POST /conversations/mark-all-read?status=inbox': { status: 'ok' },
      });

      renderInboxScreen(authenticatedApiFetch);
      expect(
        await screen.findAllByTestId('conversation-unread-dot'),
      ).toHaveLength(2);

      fireEvent.press(screen.getByTestId('inbox-mark-all-read'));

      await waitForElementToBeRemoved(() =>
        screen.queryAllByTestId('conversation-unread-dot'),
      );
      expect(screen.getByTestId('inbox-mark-all-read')).toBeDisabled();
      expect(
        postsTo(
          authenticatedApiFetch,
          '/conversations/mark-all-read?status=inbox',
        ),
      ).toHaveLength(1);
    });

    test('mark all read is disabled when nothing is unread', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada]),
      });

      renderInboxScreen(authenticatedApiFetch);
      expect(await screen.findByText('Ada Example')).toBeTruthy();

      expect(screen.getByTestId('inbox-mark-all-read')).toBeDisabled();
    });

    test('choosing Oldest refetches with sort=oldest', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada]),
        '/messages?status=inbox&page=1&sort=oldest': conversationPage([rae]),
      });

      renderInboxScreen(authenticatedApiFetch);
      expect(await screen.findByText('Ada Example')).toBeTruthy();

      fireEvent.press(screen.getByTestId('inbox-sort-button'));
      fireEvent.press(screen.getByTestId('option-oldest'));

      expect(await screen.findByText('Rae Example')).toBeTruthy();
      expect(screen.getByText('Sort: Oldest')).toBeTruthy();
      expect(authenticatedApiFetch.mock.calls.at(-1)?.[0]).toBe(
        '/messages?status=inbox&page=1&sort=oldest',
      );
    });

    test('a failed action shows the error banner and keeps the selection', async () => {
      const authenticatedApiFetch = mockApiFetch({
        [INBOX_PATH]: conversationPage([ada]),
        'POST /conversations/conversation-1/archive': jsonResponse(
          { error: { code: 'INTERNAL_ERROR', message: 'Boom' } },
          500,
        ),
      });

      renderInboxScreen(authenticatedApiFetch);
      await longPress('Ada Example');
      fireEvent.press(screen.getByTestId('selection-action-archive'));

      expect(await screen.findByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Ada Example')).toBeTruthy();
      expect(screen.getByText('1 selected')).toBeTruthy();
    });
  });
});
