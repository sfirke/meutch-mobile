import type { ApiFetch } from '../api';
import { isApiError } from '../api';
import {
  fetchConversations,
  fetchMessageThread,
  markThreadRead,
  replyToMessage,
} from '../messages';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const VIEWER_ID = 'a1111111-1111-4111-8111-111111111111';
const OTHER_ID = 'b2222222-2222-4222-8222-222222222222';
const MESSAGE_ID = 'c3333333-3333-4333-8333-333333333333';
const CONVERSATION_ID = 'd4444444-4444-4444-8444-444444444444';
const ITEM_ID = 'e5555555-5555-4555-8555-555555555555';
const REQUEST_ID = 'f6666666-6666-4666-8666-666666666666';
const CIRCLE_ID = 'a7777777-7777-4777-8777-777777777777';
const LOAN_ID = 'b8888888-8888-4888-8888-888888888888';

const viewer = {
  id: VIEWER_ID,
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

const otherUser = {
  id: OTHER_ID,
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

function createMessage(overrides?: Record<string, unknown>) {
  return {
    id: MESSAGE_ID,
    body: 'Is this still available?',
    timestamp: '2026-05-26T18:30:00+00:00',
    is_read: false,
    sender: otherUser,
    recipient: viewer,
    ...overrides,
  };
}

function createConversation(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    conversation_id: CONVERSATION_ID,
    other_user: otherUser,
    latest_message: createMessage(),
    unread_count: 2,
    is_archived: false,
    item: null,
    item_request: null,
    circle: null,
    ...overrides,
  };
}

const itemContext = {
  id: ITEM_ID,
  name: 'Cordless drill',
  image_url: 'https://cdn.example.test/img/drill.jpg',
};

const requestContext = {
  id: REQUEST_ID,
  title: 'Need a melon baller',
  status: 'open',
  visibility: 'circles',
  expires_at: '2026-06-10T00:00:00+00:00',
};

const circleContext = {
  id: CIRCLE_ID,
  name: 'Oak Street',
  circle_type: 'neighborhood',
  image_url: 'https://cdn.example.test/img/oak.jpg',
};

const pagination = {
  page: 1,
  per_page: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_prev: false,
};

function createThread(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    conversation_id: CONVERSATION_ID,
    other_user: otherUser,
    shared_circles: [circleContext],
    item: itemContext,
    item_request: null,
    circle: null,
    active_loan: null,
    has_unread_messages: true,
    messages: [createMessage()],
    ...overrides,
  };
}

function getRequestPath(fetchImpl: jest.MockedFunction<ApiFetch>): string {
  return fetchImpl.mock.calls[0][0];
}

function getRequestInit(
  fetchImpl: jest.MockedFunction<ApiFetch>,
): RequestInit | undefined {
  return fetchImpl.mock.calls[0][1];
}

describe('fetchConversations', () => {
  test('parses an inbox page and requests the expected path', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        conversations: [createConversation({ item: itemContext })],
        pagination,
      }),
    );

    const page = await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 2,
    });

    expect(getRequestPath(fetchImpl)).toBe('/messages?status=inbox&page=2');
    expect(page.pagination).toEqual(pagination);
    expect(page.conversations).toEqual([
      {
        conversation_id: CONVERSATION_ID,
        other_user: otherUser,
        latest_message: {
          id: MESSAGE_ID,
          body: 'Is this still available?',
          timestamp: '2026-05-26T18:30:00+00:00',
          is_read: false,
          sender: otherUser,
          recipient: viewer,
        },
        unread_count: 2,
        is_archived: false,
        context: { kind: 'item', item: itemContext },
      },
    ]);
  });

  test('sends per_page and the archived status only when asked', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ conversations: [], pagination }),
    );

    await fetchConversations(fetchImpl, {
      status: 'archived',
      page: 1,
      perPage: 50,
    });

    expect(getRequestPath(fetchImpl)).toBe(
      '/messages?status=archived&page=1&per_page=50',
    );
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ conversations: [], pagination }),
    );

    await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 1,
      signal: controller.signal,
    });

    expect(fetchImpl).toHaveBeenCalledWith('/messages?status=inbox&page=1', {
      signal: controller.signal,
    });
  });

  test('parses a request context row', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        conversations: [createConversation({ item_request: requestContext })],
        pagination,
      }),
    );

    const { conversations } = await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 1,
    });

    expect(conversations[0].context).toEqual({
      kind: 'request',
      request: requestContext,
    });
  });

  test('parses a circle context row', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        conversations: [createConversation({ circle: circleContext })],
        pagination,
      }),
    );

    const { conversations } = await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 1,
    });

    expect(conversations[0].context).toEqual({
      kind: 'circle',
      circle: circleContext,
    });
  });

  test('treats absent context keys like null ones', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const rowWithNulls = createConversation();
    const rowWithoutKeys = createConversation();

    delete rowWithoutKeys.item;
    delete rowWithoutKeys.item_request;
    delete rowWithoutKeys.circle;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        conversations: [rowWithNulls, rowWithoutKeys],
        pagination,
      }),
    );

    const { conversations } = await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 1,
    });

    expect(conversations[0].context).toEqual({ kind: 'none' });
    expect(conversations[1].context).toEqual({ kind: 'none' });
  });

  test('keeps a conversation whose other account was deleted', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        conversations: [createConversation({ other_user: null })],
        pagination,
      }),
    );

    const { conversations } = await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 1,
    });

    expect(conversations).toHaveLength(1);
    expect(conversations[0].other_user).toBeNull();
  });

  test('drops a relative context image url', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        conversations: [
          createConversation({
            item: { ...itemContext, image_url: '/static/img/default.png' },
          }),
        ],
        pagination,
      }),
    );

    const { conversations } = await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 1,
    });

    expect(conversations[0].context).toEqual({
      kind: 'item',
      item: { ...itemContext, image_url: null },
    });
  });

  test('rejects a row without a conversation id', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const row = createConversation();

    delete row.conversation_id;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ conversations: [row], pagination }),
    );

    await expect(
      fetchConversations(fetchImpl, { status: 'inbox', page: 1 }),
    ).rejects.toThrow('Invalid conversation payload.');
  });

  test('rejects a malformed latest message', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        conversations: [
          createConversation({
            latest_message: createMessage({ is_read: 'no' }),
          }),
        ],
        pagination,
      }),
    );

    await expect(
      fetchConversations(fetchImpl, { status: 'inbox', page: 1 }),
    ).rejects.toThrow('Invalid message payload.');
  });

  test('propagates a 403 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not part of this conversation.',
            details: {},
          },
        },
        403,
      ),
    );

    const error = await fetchConversations(fetchImpl, {
      status: 'inbox',
      page: 1,
    }).catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('FORBIDDEN');
    expect(isApiError(error) && error.status).toBe(403);
  });
});

describe('fetchMessageThread', () => {
  test('parses a thread anchored on a message id', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse(createThread()));

    const thread = await fetchMessageThread(fetchImpl, MESSAGE_ID);

    expect(getRequestPath(fetchImpl)).toBe(`/messages/${MESSAGE_ID}`);
    expect(thread).toEqual({
      conversation_id: CONVERSATION_ID,
      other_user: otherUser,
      shared_circles: [circleContext],
      context: { kind: 'item', item: itemContext },
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
    });
  });

  test('parses an active loan', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        createThread({
          active_loan: {
            id: LOAN_ID,
            start_date: '2026-06-01',
            end_date: '2026-06-08',
            status: 'pending',
            borrower: otherUser,
          },
        }),
      ),
    );

    const thread = await fetchMessageThread(fetchImpl, MESSAGE_ID);

    expect(thread.active_loan).toEqual({
      id: LOAN_ID,
      start_date: '2026-06-01',
      end_date: '2026-06-08',
      status: 'pending',
      borrower: otherUser,
    });
  });

  test('treats an absent active loan like a null one', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const thread = createThread();

    delete thread.active_loan;

    fetchImpl.mockResolvedValueOnce(createMockResponse(thread));

    const parsed = await fetchMessageThread(fetchImpl, MESSAGE_ID);

    expect(parsed.active_loan).toBeNull();
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(createMockResponse(createThread()));

    await fetchMessageThread(fetchImpl, MESSAGE_ID, {
      signal: controller.signal,
    });

    expect(fetchImpl).toHaveBeenCalledWith(`/messages/${MESSAGE_ID}`, {
      signal: controller.signal,
    });
  });

  test('rejects a thread whose messages are not an array', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(createThread({ messages: null })),
    );

    await expect(fetchMessageThread(fetchImpl, MESSAGE_ID)).rejects.toThrow(
      'Invalid conversation thread payload.',
    );
  });

  test('propagates a 404 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found.',
            details: {},
          },
        },
        404,
      ),
    );

    const error = await fetchMessageThread(fetchImpl, MESSAGE_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('NOT_FOUND');
    expect(isApiError(error) && error.status).toBe(404);
  });
});

describe('replyToMessage', () => {
  test('posts the body as JSON and parses the created message', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const reply = createMessage({
      id: 'c9999999-9999-4999-8999-999999999999',
      body: 'Yes, it is.',
      is_read: true,
      sender: viewer,
      recipient: otherUser,
    });

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ message: reply }, 201),
    );

    const message = await replyToMessage(fetchImpl, MESSAGE_ID, 'Yes, it is.');
    const init = getRequestInit(fetchImpl);

    expect(getRequestPath(fetchImpl)).toBe(`/messages/${MESSAGE_ID}/reply`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ body: 'Yes, it is.' }));
    expect(init?.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    expect(message.body).toBe('Yes, it is.');
    expect(message.sender.full_name).toBe('Ada Example');
    expect(message.recipient.full_name).toBe('Morgan Member');
  });

  test('surfaces a 422 with its field details', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request.',
            details: { body: ['Length must be between 1 and 1000.'] },
          },
        },
        422,
      ),
    );

    const error = await replyToMessage(fetchImpl, MESSAGE_ID, '').catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('VALIDATION_ERROR');
    expect(isApiError(error) && error.details).toEqual({
      body: ['Length must be between 1 and 1000.'],
    });
  });

  test('rejects a reply response without a message', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({}, 201));

    await expect(replyToMessage(fetchImpl, MESSAGE_ID, 'Hi')).rejects.toThrow(
      'Invalid message payload.',
    );
  });
});

describe('markThreadRead', () => {
  test('posts without a body and parses the read state', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ has_unread_messages: false }),
    );

    const result = await markThreadRead(fetchImpl, MESSAGE_ID);

    expect(fetchImpl).toHaveBeenCalledWith(
      `/messages/${MESSAGE_ID}/mark-read`,
      { method: 'POST' },
    );
    expect(getRequestInit(fetchImpl)?.body).toBeUndefined();
    expect(result).toEqual({ has_unread_messages: false });
  });

  test('rejects a mark-read response missing the read state', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({}));

    await expect(markThreadRead(fetchImpl, MESSAGE_ID)).rejects.toThrow(
      'Invalid mark-read payload.',
    );
  });

  test('propagates a 403 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not part of this conversation.',
            details: {},
          },
        },
        403,
      ),
    );

    const error = await markThreadRead(fetchImpl, MESSAGE_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.status).toBe(403);
  });
});
