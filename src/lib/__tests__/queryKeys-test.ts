import {
  circleKeys,
  feedKeys,
  itemKeys,
  loanKeys,
  messageKeys,
  profileKeys,
  requestKeys,
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

  test('my item keys include the kind and normalize the search query', () => {
    expect(itemKeys.mine({ kind: 'lending' })).toEqual([
      'items',
      'mine',
      { kind: 'lending', q: null },
    ]);
    expect(itemKeys.mine({ kind: 'lending', q: '' })).toEqual(
      itemKeys.mine({ kind: 'lending' }),
    );
    expect(itemKeys.mine({ kind: 'lending', q: '  drill ' })).toEqual(
      itemKeys.mine({ kind: 'lending', q: 'drill' }),
    );
    expect(itemKeys.mine({ kind: 'lending' })).not.toEqual(
      itemKeys.mine({ kind: 'past_giveaways' }),
    );
  });

  test('my request keys differ by status', () => {
    expect(requestKeys.mine({ status: 'active' })).toEqual([
      'requests',
      'mine',
      { status: 'active' },
    ]);
    expect(requestKeys.mine({ status: 'active' })).not.toEqual(
      requestKeys.mine({ status: 'fulfilled' }),
    );
  });

  test('loan keys differ by role and detail is scoped by id', () => {
    expect(loanKeys.list({ role: 'borrowing' })).toEqual([
      'loans',
      'list',
      { role: 'borrowing' },
    ]);
    expect(loanKeys.list({ role: 'borrowing' })).not.toEqual(
      loanKeys.list({ role: 'lending' }),
    );
    expect(loanKeys.detail('x')).toEqual(['loans', 'detail', 'x']);
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
      { status: 'inbox', sort: 'newest' },
    ]);
    expect(messageKeys.inbox({ status: 'archived' })).toEqual([
      'messages',
      'inbox',
      { status: 'archived', sort: 'newest' },
    ]);
    expect(messageKeys.inbox({ status: 'inbox' })).not.toEqual(
      messageKeys.inbox({ status: 'archived' }),
    );
  });

  test('an omitted inbox sort shares the key with an explicit newest', () => {
    expect(messageKeys.inbox({ status: 'inbox' })).toEqual(
      messageKeys.inbox({ status: 'inbox', sort: 'newest' }),
    );
    expect(messageKeys.inbox({ status: 'inbox', sort: 'unread' })).toEqual([
      'messages',
      'inbox',
      { status: 'inbox', sort: 'unread' },
    ]);
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
        keys: [
          [...itemKeys.list()],
          [...itemKeys.mine({ kind: 'lending' })],
          [...itemKeys.detail('x')],
        ],
      },
      {
        all: requestKeys.all,
        keys: [
          [...requestKeys.mine({ status: 'active' })],
          [...requestKeys.detail('x')],
        ],
      },
      {
        all: loanKeys.all,
        keys: [
          [...loanKeys.list({ role: 'borrowing' })],
          [...loanKeys.detail('x')],
        ],
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
