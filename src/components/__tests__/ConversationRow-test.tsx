import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ConversationSummary } from '../../lib/messages';
import type { UserSummary } from '../../lib/parse';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { ConversationRow } from '../ConversationRow';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const NOW = new Date('2026-05-26T18:30:00.000Z');

const otherUser: UserSummary = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

const currentUser: UserSummary = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
  profile_viewable: false,
};

function buildConversation(
  overrides: Partial<ConversationSummary> = {},
): ConversationSummary {
  return {
    conversation_id: 'c3333333-3333-4333-8333-333333333333',
    other_user: otherUser,
    latest_message: {
      id: 'd4444444-4444-4444-8444-444444444444',
      body: 'See you Saturday?',
      timestamp: '2026-05-26T18:25:00.000Z',
      is_read: true,
      sender: otherUser,
      recipient: currentUser,
    },
    unread_count: 0,
    is_archived: false,
    context: { kind: 'none' },
    ...overrides,
  };
}

describe('<ConversationRow />', () => {
  test('renders the other user name', () => {
    render(
      <ConversationRow
        conversation={buildConversation()}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.getByText('Ada Example')).toBeTruthy();
  });

  test('shows "Deleted User" and is not tappable when other_user is null', () => {
    const onPress = jest.fn();

    render(
      <ConversationRow
        conversation={buildConversation({ other_user: null })}
        currentUserId={currentUser.id}
        now={NOW}
        onPress={onPress}
      />,
    );

    expect(screen.getByText('Deleted User')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  test('prefixes the preview with "You: " when the current user sent the latest message', () => {
    render(
      <ConversationRow
        conversation={buildConversation({
          latest_message: {
            id: 'd4444444-4444-4444-8444-444444444444',
            body: 'See you Saturday?',
            timestamp: '2026-05-26T18:25:00.000Z',
            is_read: true,
            sender: currentUser,
            recipient: otherUser,
          },
        })}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.getByText('You: See you Saturday?')).toBeTruthy();
  });

  test('omits the "You: " prefix when the other user sent the latest message', () => {
    render(
      <ConversationRow
        conversation={buildConversation()}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.getByText('See you Saturday?')).toBeTruthy();
  });

  test('shows an unread dot and label suffix when unread_count > 0', () => {
    render(
      <ConversationRow
        conversation={buildConversation({ unread_count: 2 })}
        currentUserId={currentUser.id}
        now={NOW}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId('conversation-unread-dot')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Ada Example, unread' }),
    ).toBeTruthy();
  });

  test('shows no unread dot or label suffix when unread_count is 0', () => {
    render(
      <ConversationRow
        conversation={buildConversation({ unread_count: 0 })}
        currentUserId={currentUser.id}
        now={NOW}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('conversation-unread-dot')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ada Example' })).toBeTruthy();
  });

  test('renders an item context chip', () => {
    render(
      <ConversationRow
        conversation={buildConversation({
          context: {
            kind: 'item',
            item: {
              id: 'e5555555-5555-4555-8555-555555555555',
              name: 'Cordless drill',
              image_url: null,
            },
          },
        })}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.getByText('Cordless drill')).toBeTruthy();
  });

  test('renders a request context chip', () => {
    render(
      <ConversationRow
        conversation={buildConversation({
          context: {
            kind: 'request',
            request: {
              id: 'f6666666-6666-4666-8666-666666666666',
              title: 'Need a ladder',
              status: 'open',
              visibility: 'circles',
              expires_at: null,
            },
          },
        })}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.getByText('Need a ladder')).toBeTruthy();
  });

  test('renders a circle context chip', () => {
    render(
      <ConversationRow
        conversation={buildConversation({
          context: {
            kind: 'circle',
            circle: {
              id: 'a7777777-7777-4777-8777-777777777777',
              name: 'Oak Street',
              circle_type: 'open',
              image_url: null,
            },
          },
        })}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.getByText('Oak Street')).toBeTruthy();
  });

  test('renders no chip icon when context kind is none', () => {
    render(
      <ConversationRow
        conversation={buildConversation({ context: { kind: 'none' } })}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.queryByTestId('icon-image')).toBeNull();
    expect(screen.queryByTestId('icon-hand')).toBeNull();
    expect(screen.queryByTestId('icon-people-group')).toBeNull();
  });

  test('renders the relative time of the latest message', () => {
    render(
      <ConversationRow
        conversation={buildConversation()}
        currentUserId={currentUser.id}
        now={NOW}
      />,
    );

    expect(screen.getByText('5m ago')).toBeTruthy();
  });

  test('pressing the row calls onPress with the conversation', () => {
    const onPress = jest.fn();
    const conversation = buildConversation();

    render(
      <ConversationRow
        conversation={conversation}
        currentUserId={currentUser.id}
        now={NOW}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledWith(conversation);
  });
});
