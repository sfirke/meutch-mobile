import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import type { FeedEvent } from '../../lib/feed';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { FeedEventCard } from '../FeedEventCard';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const NOW = new Date('2026-05-26T18:30:00.000Z');

function createEvent(overrides: Partial<FeedEvent> = {}): FeedEvent {
  return {
    event_type: 'giveaway',
    created_at: '2026-05-26T18:25:00.000Z',
    title: 'Cordless drill',
    description: null,
    action: 'posted a giveaway',
    actor_name: 'Ada Example',
    actor_avatar_url: null,
    actor_id: 'a1111111-1111-4111-8111-111111111111',
    actor_profile_viewable: true,
    image_url: null,
    distance: null,
    item_id: 'b2222222-2222-4222-8222-222222222222',
    request_id: null,
    loan_request_id: null,
    circle_id: null,
    user_id: null,
    status: null,
    claim_status: 'unclaimed',
    extra_circle_count: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push: mockPush,
  } as unknown as ReturnType<typeof useRouter>);
});

describe('<FeedEventCard />', () => {
  test('renders a request event: chip, verbatim action, and title', () => {
    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'request',
          item_id: null,
          action: 'requested',
          title: 'Extension ladder',
        })}
        now={NOW}
      />,
    );

    expect(screen.getByText('Request')).toBeTruthy();
    expect(
      screen.getByText('Ada Example requested · Extension ladder'),
    ).toBeTruthy();
  });

  test('renders a giveaway event: chip, verbatim action, and title', () => {
    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'giveaway',
          action: 'posted a giveaway',
          title: 'Cordless drill',
        })}
        now={NOW}
      />,
    );

    expect(screen.getByText('Giveaway')).toBeTruthy();
    expect(
      screen.getByText('Ada Example posted a giveaway · Cordless drill'),
    ).toBeTruthy();
  });

  test('renders a lent event: chip, verbatim action, and title', () => {
    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'lent',
          action: 'lent out',
          title: 'Camping tent',
        })}
        now={NOW}
      />,
    );

    expect(screen.getByText('Loan')).toBeTruthy();
    expect(
      screen.getByText('Ada Example lent out · Camping tent'),
    ).toBeTruthy();
  });

  test('renders a circle_join event: chip, verbatim action, and title', () => {
    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'circle_join',
          item_id: null,
          action: 'joined',
          title: 'Oak Street + 2 more of your circles',
        })}
        now={NOW}
      />,
    );

    expect(screen.getByText('Circle')).toBeTruthy();
    expect(
      screen.getByText(
        'Ada Example joined · Oak Street + 2 more of your circles',
      ),
    ).toBeTruthy();
  });

  test('calls onPressItem with the item id for an item-backed event', () => {
    const onPressItem = jest.fn();

    render(
      <FeedEventCard
        event={createEvent({ item_id: 'item-123' })}
        onPressItem={onPressItem}
        now={NOW}
      />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPressItem).toHaveBeenCalledWith('item-123');
  });

  test('calls onPressRequest with the request id for a request event', () => {
    const onPressRequest = jest.fn();

    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'request',
          item_id: null,
          request_id: 'request-123',
        })}
        onPressItem={jest.fn()}
        onPressRequest={onPressRequest}
        now={NOW}
      />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPressRequest).toHaveBeenCalledWith('request-123');
  });

  test('a request event is not pressable without onPressRequest', () => {
    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'request',
          item_id: null,
          request_id: 'request-123',
        })}
        onPressItem={jest.fn()}
        now={NOW}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('a circle_join event exposes no button role and is not pressable', () => {
    const onPressItem = jest.fn();

    render(
      <FeedEventCard
        event={createEvent({ event_type: 'circle_join', item_id: null })}
        onPressItem={onPressItem}
        now={NOW}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('calls onPressCircle with the circle id for a circle_join event', () => {
    const onPressCircle = jest.fn();

    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'circle_join',
          item_id: null,
          circle_id: 'circle-123',
        })}
        onPressCircle={onPressCircle}
        now={NOW}
      />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPressCircle).toHaveBeenCalledWith('circle-123');
  });

  test('a circle_join event with a circle id is not tappable without onPressCircle', () => {
    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'circle_join',
          item_id: null,
          circle_id: 'circle-123',
        })}
        now={NOW}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('a circle_join event with a null circle id is not tappable', () => {
    const onPressCircle = jest.fn();

    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'circle_join',
          item_id: null,
          circle_id: null,
        })}
        onPressCircle={onPressCircle}
        now={NOW}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('an item event calls onPressItem, not onPressCircle', () => {
    const onPressItem = jest.fn();
    const onPressCircle = jest.fn();

    render(
      <FeedEventCard
        event={createEvent({ item_id: 'item-123' })}
        onPressItem={onPressItem}
        onPressCircle={onPressCircle}
        now={NOW}
      />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPressItem).toHaveBeenCalledWith('item-123');
    expect(onPressCircle).not.toHaveBeenCalled();
  });

  test('an item-backed event is not tappable without onPressItem', () => {
    render(
      <FeedEventCard event={createEvent({ item_id: 'item-1' })} now={NOW} />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('shows an avatar image when actor_avatar_url is set', () => {
    render(
      <FeedEventCard
        event={createEvent({
          actor_avatar_url: 'https://images.example.test/ada.jpg',
        })}
        now={NOW}
      />,
    );

    expect(screen.getByTestId('feed-event-avatar')).toBeTruthy();
    expect(screen.queryByTestId('feed-event-avatar-initials')).toBeNull();
  });

  test('shows initials when actor_avatar_url is null', () => {
    render(
      <FeedEventCard
        event={createEvent({
          actor_name: 'Ada Example',
          actor_avatar_url: null,
        })}
        now={NOW}
      />,
    );

    expect(screen.getByTestId('feed-event-avatar-initials')).toBeTruthy();
    expect(screen.getByText('AE')).toBeTruthy();
    expect(screen.queryByTestId('feed-event-avatar')).toBeNull();
  });

  test('shows the event photo when image_url is set', () => {
    render(
      <FeedEventCard
        event={createEvent({
          image_url: 'https://images.example.test/drill.jpg',
        })}
        now={NOW}
      />,
    );

    expect(screen.getByTestId('feed-event-thumbnail')).toBeTruthy();
    expect(screen.queryByTestId('image-placeholder')).toBeNull();
  });

  test('shows a placeholder for an item-backed event with no photo', () => {
    render(
      <FeedEventCard
        event={createEvent({ item_id: 'item-1', image_url: null })}
        now={NOW}
      />,
    );

    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('feed-event-thumbnail')).toBeNull();
  });

  test('shows no image box for a request event with no photo', () => {
    render(
      <FeedEventCard
        event={createEvent({
          event_type: 'request',
          item_id: null,
          image_url: null,
        })}
        now={NOW}
      />,
    );

    expect(screen.queryByTestId('image-placeholder')).toBeNull();
    expect(screen.queryByTestId('feed-event-thumbnail')).toBeNull();
  });

  test('renders distance verbatim when present', () => {
    render(
      <FeedEventCard event={createEvent({ distance: '2-5 mi' })} now={NOW} />,
    );

    expect(screen.getByText('2-5 mi')).toBeTruthy();
  });

  test('omits distance when null', () => {
    render(<FeedEventCard event={createEvent({ distance: null })} now={NOW} />);

    expect(screen.queryByText(/mi$/)).toBeNull();
  });

  test('renders description when present, truncated to two lines', () => {
    render(
      <FeedEventCard
        event={createEvent({ description: 'Barely used, works great.' })}
        now={NOW}
      />,
    );

    const description = screen.getByText('Barely used, works great.');

    expect(description).toBeTruthy();
    expect(description.props.numberOfLines).toBe(2);
  });

  test('omits description when null', () => {
    render(
      <FeedEventCard event={createEvent({ description: null })} now={NOW} />,
    );

    expect(screen.queryByText('Barely used, works great.')).toBeNull();
  });

  test('renders the relative time from created_at', () => {
    render(
      <FeedEventCard
        event={createEvent({ created_at: '2026-05-26T18:25:00.000Z' })}
        now={NOW}
      />,
    );

    expect(screen.getByText('5m ago')).toBeTruthy();
  });

  test('links to the actor profile when viewable, without triggering the card press', () => {
    const onPressItem = jest.fn();

    render(
      <FeedEventCard
        event={createEvent({
          actor_id: 'a1111111-1111-4111-8111-111111111111',
          actor_profile_viewable: true,
          item_id: 'item-123',
        })}
        onPressItem={onPressItem}
        now={NOW}
      />,
    );

    fireEvent.press(screen.getByLabelText("View Ada Example's profile"));

    expect(mockPush).toHaveBeenCalledWith(
      '/user/a1111111-1111-4111-8111-111111111111',
    );
    expect(onPressItem).not.toHaveBeenCalled();
  });

  test('does not link to the actor profile when not viewable', () => {
    render(
      <FeedEventCard
        event={createEvent({
          actor_id: 'a1111111-1111-4111-8111-111111111111',
          actor_profile_viewable: false,
        })}
        now={NOW}
      />,
    );

    expect(screen.queryByLabelText("View Ada Example's profile")).toBeNull();
    expect(
      screen.getByText('Ada Example posted a giveaway · Cordless drill'),
    ).toBeTruthy();
  });
});
