import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { ThreadScreen } from '../ThreadScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const push = jest.fn();

const MESSAGE_ID = 'c3333333-3333-4333-8333-333333333333';
const OWN_MESSAGE_ID = 'd4444444-4444-4444-8444-444444444444';
const REPLY_ID = 'e5555555-5555-4555-8555-555555555555';
const ITEM_ID = 'f6666666-6666-4666-8666-666666666666';
const CIRCLE_ID = 'a7777777-7777-4777-8777-777777777777';
const LOAN_ID = 'b8888888-8888-4888-8888-888888888888';

const viewer = {
  id: '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e',
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
  profile_viewable: false,
};

const otherMessage = {
  id: MESSAGE_ID,
  body: 'Is the drill free this weekend?',
  timestamp: '2026-05-01T12:00:00+00:00',
  is_read: true,
  sender: otherUser,
  recipient: viewer,
};

const ownMessage = {
  id: OWN_MESSAGE_ID,
  body: 'Sure, any time after noon.',
  timestamp: '2026-05-01T12:05:00+00:00',
  is_read: true,
  sender: viewer,
  recipient: otherUser,
};

function thread(overrides?: Record<string, unknown>) {
  return {
    conversation_id: 'conversation-1',
    other_user: otherUser,
    shared_circles: [
      {
        id: CIRCLE_ID,
        name: 'Oak Street',
        circle_type: 'open',
        image_url: null,
      },
    ],
    item: { id: ITEM_ID, name: 'Cordless drill', image_url: null },
    item_request: null,
    circle: null,
    active_loan: {
      id: LOAN_ID,
      start_date: '2026-05-02',
      end_date: '2026-05-09',
      status: 'pending',
      borrower: viewer,
    },
    has_unread_messages: false,
    messages: [otherMessage, ownMessage],
    ...overrides,
  };
}

function replyMessage(body: string) {
  return {
    id: REPLY_ID,
    body,
    timestamp: '2026-05-01T12:10:00+00:00',
    is_read: false,
    sender: viewer,
    recipient: otherUser,
  };
}

function replyResponse(body: string) {
  return jsonResponse({ message: replyMessage(body) }, 201);
}

type RenderOptions = {
  id?: string | string[];
  thread?: Record<string, unknown>;
  threadRoute?: MockRoute;
  routes?: Record<string, MockRoute>;
};

function renderThreadScreen(options: RenderOptions = {}) {
  const authenticatedApiFetch = mockApiFetch({
    [`/messages/${MESSAGE_ID}`]: options.threadRoute ?? thread(options.thread),
    [`POST /messages/${MESSAGE_ID}/mark-read`]: {
      has_unread_messages: false,
    },
    ...options.routes,
  });

  return renderThreadScreenWith(authenticatedApiFetch, options.id);
}

function renderThreadScreenWith(
  authenticatedApiFetch: jest.MockedFunction<ApiFetch>,
  id: string | string[] = MESSAGE_ID,
) {
  mockSession({
    authenticatedApiFetch,
    user: {
      ...viewer,
      email: 'fake.member@example.com',
      email_confirmed: true,
    },
  });
  jest.mocked(useLocalSearchParams).mockReturnValue({ id });

  renderWithProviders(<ThreadScreen />);

  return authenticatedApiFetch;
}

function lastTitle(): unknown {
  const calls = jest.mocked(Stack.Screen).mock.calls;
  const lastCall = calls[calls.length - 1][0] as {
    options?: { title?: string };
  };

  return lastCall.options?.title;
}

function callsTo(
  authenticatedApiFetch: jest.MockedFunction<ApiFetch>,
  path: string,
): Parameters<ApiFetch>[] {
  return authenticatedApiFetch.mock.calls.filter(([called]) => called === path);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
});

describe('<ThreadScreen />', () => {
  test('shows the loading state until the thread arrives', async () => {
    renderThreadScreen();

    expect(screen.getByLabelText('Loading conversation')).toBeTruthy();

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();
  });

  test('renders the thread newest-first with own and other bubbles', async () => {
    const authenticatedApiFetch = renderThreadScreen();

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();
    expect(screen.getByText('Is the drill free this weekend?')).toBeTruthy();

    const bubbles = screen.getAllByTestId(/^message-bubble-/);

    // The list is inverted, so the newest message renders first in the data.
    expect(bubbles.map((bubble) => bubble.props.testID)).toEqual([
      'message-bubble-own',
      'message-bubble-other',
    ]);
    expect(screen.getByTestId('thread-list')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
      `/messages/${MESSAGE_ID}`,
    );
  });

  test('titles the screen with the other participant and shows the context', async () => {
    renderThreadScreen();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(lastTitle()).toBe('Ada Example');
    expect(screen.getByText('You share Oak Street')).toBeTruthy();
    expect(screen.getByTestId('loan-banner')).toBeTruthy();
    expect(screen.getByText('Loan request pending')).toBeTruthy();
  });

  test('links to the partner profile when viewable', async () => {
    renderThreadScreen({
      thread: { other_user: { ...otherUser, profile_viewable: true } },
    });

    fireEvent.press(
      await screen.findByRole('link', { name: "View Ada Example's profile" }),
    );

    expect(push).toHaveBeenCalledWith(`/user/${otherUser.id}`);
  });

  test('has no partner profile link when not viewable', async () => {
    renderThreadScreen();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('omits the loan banner when there is no active loan', async () => {
    renderThreadScreen({ thread: { active_loan: null } });

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.queryByTestId('loan-banner')).toBeNull();
  });

  test('shows non-participant copy with no retry on a 403', async () => {
    renderThreadScreen({
      threadRoute: jsonResponse(
        { error: { code: 'FORBIDDEN', message: 'Forbidden.' } },
        403,
      ),
    });

    expect(
      await screen.findByText("You're not part of this conversation"),
    ).toBeTruthy();
    expect(screen.getByText('Only its participants can read it.')).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('shows missing-conversation copy with no retry on a 404', async () => {
    renderThreadScreen({
      threadRoute: jsonResponse(
        { error: { code: 'NOT_FOUND', message: 'Not found.' } },
        404,
      ),
    });

    expect(await screen.findByText('This conversation is gone')).toBeTruthy();
    expect(screen.getByText('It may have been removed.')).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('shows the missing copy for a non-UUID id without requesting', async () => {
    const authenticatedApiFetch = renderThreadScreen({ id: 'not-a-uuid' });

    expect(await screen.findByText('This conversation is gone')).toBeTruthy();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Message')).toBeNull();
  });

  test('marks the thread read exactly once when it has unread messages', async () => {
    const authenticatedApiFetch = renderThreadScreen({
      thread: { has_unread_messages: true },
    });

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();

    const markReadPath = `/messages/${MESSAGE_ID}/mark-read`;

    await waitFor(
      () =>
        expect(callsTo(authenticatedApiFetch, markReadPath)).toHaveLength(1),
      { timeout: 3000 },
    );

    const [, init] = callsTo(authenticatedApiFetch, markReadPath)[0];

    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();

    // The mark-read success invalidates the inbox; the thread must not be
    // marked read a second time.
    await waitFor(
      () =>
        expect(callsTo(authenticatedApiFetch, markReadPath)).toHaveLength(1),
      { timeout: 1000 },
    );
  });

  test('never marks the thread read when nothing is unread', async () => {
    const authenticatedApiFetch = renderThreadScreen();

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();

    expect(
      callsTo(authenticatedApiFetch, `/messages/${MESSAGE_ID}/mark-read`),
    ).toHaveLength(0);
  });

  test('sends a reply, appends the new bubble, and clears the input', async () => {
    const bodies: unknown[] = [];
    const sent = replyMessage('Picking it up at one.');
    const messages: Record<string, unknown>[] = [otherMessage, ownMessage];

    // A reply invalidates the thread, so the refetch must also carry the new
    // message; the bubble itself comes from the cache append.
    const routes: Record<string, MockRoute> = {
      [`/messages/${MESSAGE_ID}`]: () =>
        jsonResponse(thread({ messages: [...messages] })),
      [`POST /messages/${MESSAGE_ID}/reply`]: (init?: RequestInit) => {
        bodies.push(getRequestBody(init));
        messages.push(sent);

        return replyResponse(sent.body);
      },
    };
    const authenticatedApiFetch = mockApiFetch(routes);

    renderThreadScreenWith(authenticatedApiFetch);

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();

    const input = screen.getByLabelText('Message');
    fireEvent.changeText(input, 'Picking it up at one.');
    fireEvent.press(screen.getByLabelText('Send'));

    expect(await screen.findByText('Picking it up at one.')).toBeTruthy();

    const [, init] = callsTo(
      authenticatedApiFetch,
      `/messages/${MESSAGE_ID}/reply`,
    )[0];

    expect(init?.method).toBe('POST');
    expect(bodies).toEqual([{ body: 'Picking it up at one.' }]);
    expect(screen.getByLabelText('Message').props.value).toBe('');
    expect(screen.queryByTestId('reply-error')).toBeNull();
  });

  test('keeps the draft and shows the failure copy when a reply fails', async () => {
    let attempt = 0;
    renderThreadScreen({
      routes: {
        [`POST /messages/${MESSAGE_ID}/reply`]: () => {
          attempt += 1;

          return attempt === 1
            ? jsonResponse(
                {
                  error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: "You're doing that a bit too fast.",
                  },
                },
                429,
              )
            : jsonResponse(
                {
                  error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid payload.',
                    details: { body: ['Message cannot be empty.'] },
                  },
                },
                422,
              );
        },
      },
    });

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Message'), 'Any update?');
    fireEvent.press(screen.getByLabelText('Send'));

    expect(await screen.findByTestId('reply-error')).toBeTruthy();
    expect(screen.getByText('Slow down')).toBeTruthy();
    expect(screen.getByLabelText('Message').props.value).toBe('Any update?');

    fireEvent.press(screen.getByLabelText('Send'));

    // A 422 carries the field reason in details.body, which beats the
    // envelope's generic message.
    expect(await screen.findByText('Check your input')).toBeTruthy();
    expect(screen.getByText('Message cannot be empty.')).toBeTruthy();
    expect(screen.getByLabelText('Message').props.value).toBe('Any update?');
  });

  test('disables Send while the draft is blank', async () => {
    const authenticatedApiFetch = renderThreadScreen();

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();

    const send = screen.getByLabelText('Send');

    expect(send.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText('Message'), '   ');
    fireEvent.press(send);

    expect(
      callsTo(authenticatedApiFetch, `/messages/${MESSAGE_ID}/reply`),
    ).toHaveLength(0);

    fireEvent.changeText(
      screen.getByLabelText('Message'),
      'Ready when you are.',
    );

    expect(
      screen.getByLabelText('Send').props.accessibilityState.disabled,
    ).toBe(false);
  });

  test('disables Send while a reply is in flight', async () => {
    let resolveReply: (value: Response) => void = () => {};
    const authenticatedApiFetch = jest.fn(
      async (_path: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return new Promise<Response>((resolve) => {
            resolveReply = resolve;
          });
        }

        return jsonResponse(thread());
      },
    ) as jest.MockedFunction<ApiFetch>;

    renderThreadScreenWith(authenticatedApiFetch);

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Message'), 'On my way.');
    fireEvent.press(screen.getByLabelText('Send'));

    await waitFor(
      () =>
        expect(
          screen.getByLabelText('Send').props.accessibilityState.disabled,
        ).toBe(true),
      { timeout: 3000 },
    );
    expect(screen.getByLabelText('Message').props.value).toBe('On my way.');

    resolveReply(replyResponse('On my way.'));
    await waitFor(
      () => expect(screen.getByLabelText('Message').props.value).toBe(''),
      { timeout: 3000 },
    );
  });

  test('shows the character counter only past 900 characters', async () => {
    renderThreadScreen();

    expect(await screen.findByText('Sure, any time after noon.')).toBeTruthy();

    const input = screen.getByLabelText('Message');
    fireEvent.changeText(input, 'a'.repeat(900));

    expect(screen.queryByText('900/1000')).toBeNull();

    fireEvent.changeText(input, 'a'.repeat(901));

    expect(screen.getByText('901/1000')).toBeTruthy();
  });

  test('tapping the item context opens the item screen', async () => {
    renderThreadScreen();

    fireEvent.press(
      await screen.findByRole('button', { name: 'Cordless drill' }),
    );

    expect(push).toHaveBeenCalledWith(`/item/${ITEM_ID}`);
  });

  test('tapping a circle context opens the circle screen', async () => {
    renderThreadScreen({
      thread: {
        item: null,
        circle: {
          id: CIRCLE_ID,
          name: 'Oak Street',
          circle_type: 'open',
          image_url: null,
        },
        shared_circles: [],
      },
    });

    fireEvent.press(await screen.findByRole('button', { name: 'Oak Street' }));

    expect(push).toHaveBeenCalledWith(`/circle/${CIRCLE_ID}`);
  });

  test('tapping a request context opens the request screen', async () => {
    const requestId = 'f6666666-6666-4666-8666-666666666666';

    renderThreadScreen({
      thread: {
        item: null,
        item_request: {
          id: requestId,
          title: 'Extension ladder',
          status: 'open',
          visibility: 'public',
          expires_at: '2026-06-15T00:00:00',
        },
        shared_circles: [],
      },
    });

    fireEvent.press(
      await screen.findByRole('button', { name: 'Extension ladder' }),
    );

    expect(push).toHaveBeenCalledWith(`/request/${requestId}`);
  });
});
