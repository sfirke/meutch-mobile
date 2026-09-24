import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ConversationCircleContext } from '../../lib/messages';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { describeSharedCircles, ThreadContextCard } from '../ThreadContextCard';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

describe('<ThreadContextCard />', () => {
  test('item context is tappable and calls onPressItem with the item id', () => {
    const onPressItem = jest.fn();

    render(
      <ThreadContextCard
        context={{
          kind: 'item',
          item: {
            id: 'a1111111-1111-4111-8111-111111111111',
            name: 'Cordless drill',
            image_url: null,
          },
        }}
        onPressItem={onPressItem}
        sharedCircles={[]}
      />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPressItem).toHaveBeenCalledWith(
      'a1111111-1111-4111-8111-111111111111',
    );
  });

  test('circle context is tappable and calls onPressCircle with the circle id', () => {
    const onPressCircle = jest.fn();

    render(
      <ThreadContextCard
        context={{
          kind: 'circle',
          circle: {
            id: 'b2222222-2222-4222-8222-222222222222',
            name: 'Oak Street',
            circle_type: 'closed',
            image_url: null,
          },
        }}
        onPressCircle={onPressCircle}
        sharedCircles={[]}
      />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPressCircle).toHaveBeenCalledWith(
      'b2222222-2222-4222-8222-222222222222',
    );
    expect(screen.getByText('Closed circle')).toBeTruthy();
  });

  test('request context renders the title and a status chip with no button role', () => {
    render(
      <ThreadContextCard
        context={{
          kind: 'request',
          request: {
            id: 'c3333333-3333-4333-8333-333333333333',
            title: 'Need a ladder',
            status: 'open',
            visibility: 'circles',
            expires_at: null,
          },
        }}
        sharedCircles={[]}
      />,
    );

    expect(screen.getByText('Need a ladder')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('renders nothing for kind "none" with no shared circles', () => {
    const { toJSON } = render(
      <ThreadContextCard context={{ kind: 'none' }} sharedCircles={[]} />,
    );

    expect(toJSON()).toBeNull();
  });

  test('renders the shared-circles line for kind "none" when circles are shared', () => {
    render(
      <ThreadContextCard
        context={{ kind: 'none' }}
        sharedCircles={[
          {
            id: 'd4444444-4444-4444-8444-444444444444',
            name: 'Oak Street',
            circle_type: 'open',
            image_url: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('You share Oak Street')).toBeTruthy();
  });
});

describe('describeSharedCircles', () => {
  function buildCircle(
    name: string,
    overrides: Partial<ConversationCircleContext> = {},
  ): ConversationCircleContext {
    return {
      id: `${name}-id`,
      name,
      circle_type: 'open',
      image_url: null,
      ...overrides,
    };
  }

  test('returns null for zero circles', () => {
    expect(describeSharedCircles([])).toBeNull();
  });

  test('describes a single shared circle', () => {
    expect(describeSharedCircles([buildCircle('Oak Street')])).toBe(
      'You share Oak Street',
    );
  });

  test('describes two shared circles', () => {
    expect(
      describeSharedCircles([
        buildCircle('Oak Street'),
        buildCircle('Elm Ave'),
      ]),
    ).toBe('You share Oak Street and 1 other circle');
  });

  test('describes three shared circles', () => {
    expect(
      describeSharedCircles([
        buildCircle('Oak Street'),
        buildCircle('Elm Ave'),
        buildCircle('Pine Court'),
      ]),
    ).toBe('You share Oak Street and 2 other circles');
  });
});
