import {
  circleKeys,
  feedKeys,
  itemKeys,
  messageKeys,
  profileKeys,
} from '../queryKeys';

describe('query keys', () => {
  test('feed keys nest under a shared prefix', () => {
    expect(feedKeys.list()).toEqual(['feed', 'list', { types: null }]);
    expect(feedKeys.list({ types: ['giveaways'] })).toEqual([
      'feed',
      'list',
      { types: ['giveaways'] },
    ]);
  });

  test('item list keys normalize the search query', () => {
    expect(itemKeys.list()).toEqual(['items', 'list', { q: null }]);
    expect(itemKeys.list({ q: '   ' })).toEqual(itemKeys.list());
    expect(itemKeys.list({ q: ' drill ' })).toEqual(
      itemKeys.list({ q: 'drill' }),
    );
  });

  test('item detail keys are scoped by id', () => {
    expect(itemKeys.detail('b2222222-2222-4222-8222-222222222222')).toEqual([
      'items',
      'detail',
      'b2222222-2222-4222-8222-222222222222',
    ]);
  });

  test('circle keys nest under a shared prefix', () => {
    expect(circleKeys.hasAny()).toEqual(['circles', 'has-any']);
  });

  test('circle list keys normalize the search query', () => {
    expect(circleKeys.list({ membership: 'mine' })).toEqual([
      'circles',
      'list',
      { membership: 'mine', q: null },
    ]);
    expect(circleKeys.list({ membership: 'mine', q: '   ' })).toEqual(
      circleKeys.list({ membership: 'mine' }),
    );
    expect(circleKeys.list({ membership: 'mine', q: ' garden ' })).toEqual(
      circleKeys.list({ membership: 'mine', q: 'garden' }),
    );
  });

  test('circle list keys differ by membership', () => {
    expect(circleKeys.list({ membership: 'mine' })).not.toEqual(
      circleKeys.list({ membership: 'discoverable' }),
    );
  });

  test('circle detail keys are scoped by id', () => {
    expect(circleKeys.detail('c3333333-3333-4333-8333-333333333333')).toEqual([
      'circles',
      'detail',
      'c3333333-3333-4333-8333-333333333333',
    ]);
  });

  test('message inbox keys are stable per status', () => {
    expect(messageKeys.inbox({ status: 'inbox' })).toEqual([
      'messages',
      'inbox',
      { status: 'inbox' },
    ]);
    expect(messageKeys.inbox({ status: 'archived' })).toEqual([
      'messages',
      'inbox',
      { status: 'archived' },
    ]);
    expect(messageKeys.inbox({ status: 'inbox' })).not.toEqual(
      messageKeys.inbox({ status: 'archived' }),
    );
  });

  test('message thread keys are scoped by id and nest under messages', () => {
    expect(messageKeys.thread('d4444444-4444-4444-8444-444444444444')).toEqual([
      'messages',
      'thread',
      'd4444444-4444-4444-8444-444444444444',
    ]);
  });

  test('profile keys nest under a shared prefix', () => {
    expect(profileKeys.me()).toEqual(['profile', 'me']);
    expect(profileKeys.settings()).toEqual(['profile', 'settings']);
  });

  test('every family all prefix is a prefix of its other keys', () => {
    const families: { all: readonly unknown[]; keys: unknown[][] }[] = [
      {
        all: feedKeys.all,
        keys: [
          [...feedKeys.list()],
          [...feedKeys.list({ types: ['giveaways'] })],
        ],
      },
      {
        all: itemKeys.all,
        keys: [[...itemKeys.list()], [...itemKeys.detail('x')]],
      },
      {
        all: circleKeys.all,
        keys: [
          [...circleKeys.hasAny()],
          [...circleKeys.list({ membership: 'mine' })],
          [...circleKeys.detail('x')],
        ],
      },
      {
        all: messageKeys.all,
        keys: [
          [...messageKeys.inbox({ status: 'inbox' })],
          [...messageKeys.thread('x')],
        ],
      },
      {
        all: profileKeys.all,
        keys: [[...profileKeys.me()], [...profileKeys.settings()]],
      },
    ];

    for (const { all, keys } of families) {
      for (const key of keys) {
        expect(key.slice(0, all.length)).toEqual([...all]);
      }
    }
  });
});
