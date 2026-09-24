import { render, screen } from '@testing-library/react-native';

import type { MessageSummary } from '../../lib/messages';
import { colors } from '../../theme';
import { MessageBubble } from '../MessageBubble';

const NOW = new Date('2026-05-26T18:30:00.000Z');

const sender: MessageSummary['sender'] = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

const recipient: MessageSummary['recipient'] = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

function buildMessage(overrides: Partial<MessageSummary> = {}): MessageSummary {
  return {
    id: 'c3333333-3333-4333-8333-333333333333',
    body: 'See you Saturday?',
    timestamp: '2026-05-26T18:25:00.000Z',
    is_read: true,
    sender,
    recipient,
    ...overrides,
  };
}

describe('<MessageBubble />', () => {
  test('renders the message body', () => {
    render(<MessageBubble isOwn={false} message={buildMessage()} now={NOW} />);

    expect(screen.getByText('See you Saturday?')).toBeTruthy();
  });

  test('renders the relative time', () => {
    render(<MessageBubble isOwn={false} message={buildMessage()} now={NOW} />);

    expect(screen.getByText('5m ago')).toBeTruthy();
  });

  test('own message aligns right with the primary background', () => {
    render(<MessageBubble isOwn message={buildMessage()} now={NOW} />);

    expect(screen.getByTestId('message-bubble-own')).toHaveStyle({
      backgroundColor: colors.primaryDark,
    });
    expect(screen.getByText('See you Saturday?')).toHaveStyle({
      color: colors.onPrimaryText,
    });
  });

  test('other message aligns left with the surface background', () => {
    render(<MessageBubble isOwn={false} message={buildMessage()} now={NOW} />);

    expect(screen.getByTestId('message-bubble-other')).toHaveStyle({
      backgroundColor: colors.surface,
    });
    expect(screen.getByText('See you Saturday?')).toHaveStyle({
      color: colors.text,
    });
  });

  test('accessibility label reads "You: <body>" for an own message', () => {
    render(<MessageBubble isOwn message={buildMessage()} now={NOW} />);

    expect(screen.getByLabelText('You: See you Saturday?')).toBeTruthy();
  });

  test('accessibility label reads "<first name>: <body>" for another message', () => {
    render(<MessageBubble isOwn={false} message={buildMessage()} now={NOW} />);

    expect(screen.getByLabelText('Ada: See you Saturday?')).toBeTruthy();
  });
});
