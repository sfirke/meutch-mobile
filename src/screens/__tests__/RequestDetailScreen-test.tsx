import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import type { UserSummary } from '../../lib/parse';
import type { RequestConversation, RequestSummary } from '../../lib/requests';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { RequestDetailScreen } from '../RequestDetailScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const REQUEST_ID = 'b2222222-2222-4222-8222-222222222222';
const MESSAGE_ID = 'e5555555-5555-4555-8555-555555555555';
const VIEWER_ID = 'fake-user-1';

const requester: UserSummary = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

const responder: UserSummary = {
  id: 'c3333333-3333-4333-8333-333333333333',
  first_name: 'Bo',
  last_name: 'Sample',
  full_name: 'Bo Sample',
  profile_image_url: null,
  profile_viewable: false,
};

function buildRequest(overrides?: Partial<RequestSummary>): RequestSummary {
  return {
    id: REQUEST_ID,
    title: 'Extension ladder',
    description: 'For a weekend gutter job.',
    seeking: 'loan',
    visibility: 'public',
    status: 'open',
    expires_at: '2099-01-15T00:00:00',
    fulfilled_at: null,
    created_at: '2026-05-26T18:30:00+00:00',
    user: requester,
    distance: '2 miles',
    ...overrides,
  };
}

type RenderOptions = {
  id?: string | string[];
  request?: Partial<RequestSummary>;
  conversations?: RequestConversation[];
  asOwner?: boolean;
};

function mockFetch(asOwner = false) {
  const authenticatedApiFetch = jest.fn();

  mockSession({
    authenticatedApiFetch,
    user: {
      id: asOwner ? requester.id : VIEWER_ID,
      email: 'fake.member@example.com',
      email_confirmed: true,
      first_name: 'Fake',
      last_name: 'Member',
      full_name: 'Fake Member',
      profile_image_url: null,
    },
  });

  return authenticatedApiFetch;
}

function setParams(id: string | string[] | undefined) {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue(id === undefined ? {} : { id });
}

function renderScreen(options: RenderOptions = {}) {
  const request = buildRequest(options.request);
  const authenticatedApiFetch = mockFetch(options.asOwner);

  authenticatedApiFetch.mockImplementation(
    async (path: string, init?: RequestInit) => {
      if (path === '/messages' && init?.method === 'POST') {
        return jsonResponse(
          {
            message: {
              id: MESSAGE_ID,
              body: 'I have one you can borrow.',
              timestamp: '2026-05-27T10:00:00+00:00',
              is_read: false,
              sender: { ...responder, id: VIEWER_ID },
              recipient: requester,
            },
          },
          201,
        );
      }

      return jsonResponse({
        request,
        conversations: options.conversations ?? [],
      });
    },
  );
  setParams(options.id ?? REQUEST_ID);
  renderWithProviders(<RequestDetailScreen />);

  return { authenticatedApiFetch, request };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<RequestDetailScreen />', () => {
  test('requests the request by id and renders its details', async () => {
    const { authenticatedApiFetch } = renderScreen();

    expect(screen.getByLabelText('Loading request')).toBeTruthy();
    expect(await screen.findByText('Extension ladder')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
      `/requests/${REQUEST_ID}`,
    );
    expect(screen.getByText('For a weekend gutter job.')).toBeTruthy();
    expect(screen.getByText('Ada Example')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText('Expires Jan 15, 2099.')).toBeTruthy();
    expect(screen.getByText('Seeking a loan')).toBeTruthy();
    expect(screen.getByText('Public')).toBeTruthy();
    expect(screen.getByText('2 miles')).toBeTruthy();
  });

  test('sends a message to the requester and opens the thread', async () => {
    const { authenticatedApiFetch } = renderScreen();

    fireEvent.changeText(
      await screen.findByLabelText('Message'),
      '  I have one you can borrow.  ',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/message/${MESSAGE_ID}`);
    });

    const [path, init] = authenticatedApiFetch.mock.calls.find(
      ([calledPath]) => calledPath === '/messages',
    ) as [string, RequestInit];

    expect(path).toBe('/messages');
    expect(getRequestBody(init)).toEqual({
      request_id: REQUEST_ID,
      body: 'I have one you can borrow.',
    });
  });

  test('keeps the send button disabled until there is a message', async () => {
    renderScreen();

    const send = await screen.findByRole('button', { name: 'Send message' });

    expect(send.props.accessibilityState).toEqual({ disabled: true });
  });

  test('shows why a message failed to send', async () => {
    const { authenticatedApiFetch } = renderScreen();

    authenticatedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit) =>
        path === '/messages' && init?.method === 'POST'
          ? jsonResponse(
              {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid.',
                  details: { body: ['Message is too long.'] },
                },
              },
              422,
            )
          : jsonResponse({ request: buildRequest(), conversations: [] }),
    );

    fireEvent.changeText(await screen.findByLabelText('Message'), 'Hello');
    fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Message is too long.')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('closes messaging on a fulfilled request', async () => {
    renderScreen({
      request: {
        status: 'fulfilled',
        fulfilled_at: '2026-06-02T12:00:00+00:00',
      },
    });

    expect(await screen.findByText('Fulfilled on Jun 2, 2026.')).toBeTruthy();
    expect(
      screen.getByText(
        "This request is fulfilled, so it's no longer taking messages.",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Message')).toBeNull();
  });

  test('closes messaging once the request has expired', async () => {
    renderScreen({ request: { expires_at: '2020-03-01T00:00:00' } });

    expect(await screen.findByText('Expired on Mar 1, 2020.')).toBeTruthy();
    expect(screen.queryByLabelText('Message')).toBeNull();
  });

  test('shows the owner their conversations instead of a composer', async () => {
    renderScreen({
      asOwner: true,
      conversations: [
        {
          other_user: responder,
          latest_message: {
            id: MESSAGE_ID,
            body: 'I have a ladder.',
            timestamp: '2026-05-27T10:00:00+00:00',
            is_read: true,
          },
        },
      ],
    });

    expect(await screen.findByText('You')).toBeTruthy();
    expect(screen.queryByLabelText('Message')).toBeNull();
    expect(screen.getByText('I have a ladder.')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: 'Conversation with Bo Sample' }),
    );

    expect(mockPush).toHaveBeenCalledWith(`/message/${MESSAGE_ID}`);
  });

  test('tells the owner when nobody has messaged yet', async () => {
    renderScreen({ asOwner: true });

    expect(
      await screen.findByText('No one has messaged you about this yet.'),
    ).toBeTruthy();
  });
});

describe('<RequestDetailScreen /> errors', () => {
  test('explains a 403 without offering a retry', async () => {
    const authenticatedApiFetch = mockFetch();

    authenticatedApiFetch.mockResolvedValue(
      jsonResponse(
        { error: { code: 'FORBIDDEN', message: 'Not allowed.' } },
        403,
      ),
    );
    setParams(REQUEST_ID);
    renderWithProviders(<RequestDetailScreen />);

    expect(await screen.findByText("You can't see this request")).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('explains a 404 without offering a retry', async () => {
    const authenticatedApiFetch = mockFetch();

    authenticatedApiFetch.mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Gone.' } }, 404),
    );
    setParams(REQUEST_ID);
    renderWithProviders(<RequestDetailScreen />);

    expect(await screen.findByText('This request is gone')).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('shows the missing state for an id that is not a uuid', async () => {
    const authenticatedApiFetch = mockFetch();

    setParams('not-a-uuid');
    renderWithProviders(<RequestDetailScreen />);

    expect(await screen.findByText('This request is gone')).toBeTruthy();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
  });
});
