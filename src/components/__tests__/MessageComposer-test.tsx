import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { MessageComposer } from '../MessageComposer';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';
const MESSAGE_ID = 'e5555555-5555-4555-8555-555555555555';
const SUBJECT = { itemId: ITEM_ID };

const sentMessage = {
  id: MESSAGE_ID,
  body: 'Is it still available?',
  timestamp: '2026-05-27T10:00:00+00:00',
  is_read: false,
  sender: {
    id: 'fake-user-1',
    first_name: 'Fake',
    last_name: 'Member',
    full_name: 'Fake Member',
    profile_image_url: null,
    profile_viewable: false,
  },
  recipient: {
    id: 'a1111111-1111-4111-8111-111111111111',
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: null,
    profile_viewable: false,
  },
};

function renderComposer(send: MockRoute, hint?: string) {
  const authenticatedApiFetch = mockApiFetch({ 'POST /messages': send });
  const onSent = jest.fn();

  mockSession({ authenticatedApiFetch });
  renderWithProviders(
    <MessageComposer
      errorTestID="composer-error"
      hint={hint}
      onSent={onSent}
      placeholder="Say hello"
      recipientName="Ada"
      subject={SUBJECT}
      testID="composer"
    />,
  );

  return { authenticatedApiFetch, onSent };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('keeps send disabled until there is a message', () => {
  renderComposer(jsonResponse({ message: sentMessage }, 201));

  expect(screen.getByText('Message Ada')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Send message' }).props
      .accessibilityState,
  ).toEqual({ disabled: true });

  fireEvent.changeText(screen.getByLabelText('Message'), '   ');

  expect(
    screen.getByRole('button', { name: 'Send message' }).props
      .accessibilityState,
  ).toEqual({ disabled: true });
});

test('posts the trimmed message about the subject and reports the id', async () => {
  const { authenticatedApiFetch, onSent } = renderComposer(
    jsonResponse({ message: sentMessage }, 201),
  );

  fireEvent.changeText(
    screen.getByLabelText('Message'),
    '  Is it still available?  ',
  );
  fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => expect(onSent).toHaveBeenCalledWith(MESSAGE_ID));

  const [path, init] = authenticatedApiFetch.mock.calls[0];

  expect(path).toBe('/messages');
  expect(getRequestBody(init)).toEqual({
    item_id: ITEM_ID,
    body: 'Is it still available?',
  });
  expect(screen.getByLabelText('Message').props.value).toBe('');
});

test('shows the server error inline', async () => {
  const { onSent } = renderComposer(
    jsonResponse(
      { error: { code: 'FORBIDDEN', message: 'Not allowed.' } },
      403,
    ),
  );

  expect(screen.queryByTestId('composer-error')).toBeNull();

  fireEvent.changeText(screen.getByLabelText('Message'), 'Hello');
  fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

  expect(await screen.findByTestId('composer-error')).toBeTruthy();
  expect(onSent).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Message').props.value).toBe('Hello');
});

test('prefers the body field error when the server sends one', async () => {
  renderComposer(
    jsonResponse(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid.',
          details: { body: ['Message is too long.'] },
        },
      },
      422,
    ),
  );

  fireEvent.changeText(screen.getByLabelText('Message'), 'Hello');
  fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

  expect(await screen.findByText('Message is too long.')).toBeTruthy();
});

test('renders the hint only when given', () => {
  renderComposer(jsonResponse({ message: sentMessage }, 201), 'Ask away.');

  expect(screen.getByText('Ask away.')).toBeTruthy();
  expect(screen.getByLabelText('Message').props.placeholder).toBe('Say hello');
});
