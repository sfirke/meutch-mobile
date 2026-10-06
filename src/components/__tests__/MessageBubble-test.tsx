import { fireEvent, render, screen } from '@testing-library/react-native';

import { Linking } from 'react-native';

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
  profile_viewable: false,
};

const recipient: MessageSummary['recipient'] = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
  profile_viewable: false,
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

  describe('with links', () => {
    const body = 'Details at https://example.com/page today';

    test('a url opens through Linking when pressed', () => {
      const spy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined as never);
      render(
        <MessageBubble
          isOwn={false}
          message={buildMessage({ body })}
          now={NOW}
        />,
      );

      fireEvent.press(screen.getByRole('link'));

      expect(spy).toHaveBeenCalledWith('https://example.com/page');
      spy.mockRestore();
    });

    test('an own bubble link uses the on-primary color', () => {
      render(
        <MessageBubble isOwn message={buildMessage({ body })} now={NOW} />,
      );

      expect(screen.getByRole('link')).toHaveStyle({
        color: colors.onPrimaryText,
      });
    });

    test('drops the grouped label but keeps the sender prefix', () => {
      render(
        <MessageBubble
          isOwn={false}
          message={buildMessage({ body })}
          now={NOW}
        />,
      );

      expect(screen.queryByLabelText(`Ada: ${body}`)).toBeNull();
      expect(screen.getByText('Ada:')).toBeTruthy();
    });

    test('an own linked bubble keeps the "You:" prefix', () => {
      render(
        <MessageBubble isOwn message={buildMessage({ body })} now={NOW} />,
      );

      expect(screen.getByText('You:')).toBeTruthy();
    });

    test('a plain body still has the grouped label', () => {
      render(<MessageBubble isOwn message={buildMessage()} now={NOW} />);

      expect(screen.getByLabelText('You: See you Saturday?')).toBeTruthy();
      expect(screen.queryByText('You:')).toBeNull();
    });
  });
});
