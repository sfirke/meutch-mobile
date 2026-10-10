import {
  categoryKeys,
  circleKeys,
  feedKeys,
  itemKeys,
  loanKeys,
  messageKeys,
  profileKeys,
  referenceKeys,
  requestKeys,
} from '../queryKeys';

describe('query keys', () => {
  test('feed keys nest under a shared prefix', () => {
    expect(feedKeys.list()).toEqual([
      'feed',
      'list',
      {
        scope: 'all',
        types: null,
        distance: 20,
        showOwnActivity: true,
        showClaimedGiveaways: true,
      },
    ]);
    expect(feedKeys.list({ types: ['giveaways'] })).toEqual([
      'feed',
      'list',
      {
        scope: 'all',
        types: ['giveaways'],
        distance: 20,
        showOwnActivity: true,
        showClaimedGiveaways: true,
      },
    ]);
  });

  test('feed keys treat omitted filters as the backend defaults', () => {
    expect(
      feedKeys.list({
        scope: 'all',
        distance: 20,
        showOwnActivity: true,
        showClaimedGiveaways: true,
      }),
    ).toEqual(feedKeys.list());
    expect(feedKeys.list({ scope: 'circles' })).not.toEqual(feedKeys.list());
    expect(feedKeys.list({ distance: 5 })).not.toEqual(feedKeys.list());
    expect(feedKeys.list({ showOwnActivity: false })).not.toEqual(
      feedKeys.list(),
    );
    expect(feedKeys.list({ showClaimedGiveaways: false })).not.toEqual(
      feedKeys.list(),
    );
  });

  test('feed keys keep no distance limit apart from the default', () => {
    expect(feedKeys.list({ distance: null })).not.toEqual(feedKeys.list());
    expect(feedKeys.list({ distance: null })[2].distance).toBeNull();
  });

  test('feed keys normalize the type list', () => {
    expect(feedKeys.list({ types: [] })).toEqual(feedKeys.list());
    expect(
      feedKeys.list({
        types: ['loans', 'requests', 'giveaways', 'circle_joins'],
      }),
    ).toEqual(feedKeys.list());
    expect(feedKeys.list({ types: ['loans', 'giveaways', 'loans'] })).toEqual(
      feedKeys.list({ types: ['giveaways', 'loans'] }),
    );
  });

  test('item list keys normalize the search query', () => {
    expect(itemKeys.list()).toEqual([
      'items',
      'list',
      {
        q: null,
        categories: null,
        circles: null,
        itemType: 'both',
        sort: 'date',
      },
    ]);
    expect(itemKeys.list({ q: '   ' })).toEqual(itemKeys.list());
    expect(itemKeys.list({ q: ' drill ' })).toEqual(
      itemKeys.list({ q: 'drill' }),
    );
  });

  test('item list keys treat omitted filters as the backend defaults', () => {
    expect(itemKeys.list({ itemType: 'both', sort: 'date' })).toEqual(
      itemKeys.list(),
    );
    expect(itemKeys.list({ categories: [], circles: [] })).toEqual(
      itemKeys.list(),
    );
    expect(itemKeys.list({ itemType: 'loans' })).not.toEqual(itemKeys.list());
    expect(itemKeys.list({ sort: 'distance' })).not.toEqual(itemKeys.list());
  });

  test('item list keys sort and dedupe id lists', () => {
    expect(itemKeys.list({ categories: ['b', 'a', 'b'] })).toEqual(
      itemKeys.list({ categories: ['a', 'b'] }),
    );
    expect(itemKeys.list({ circles: ['z', 'y'] })).toEqual(
      itemKeys.list({ circles: ['y', 'z'] }),
    );
    expect(itemKeys.list({ categories: ['a'] })).not.toEqual(
      itemKeys.list({ circles: ['a'] }),
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
    expect(loanKeys.summary()).toEqual(['loans', 'summary']);
  });

  test('circle keys nest under a shared prefix', () => {
    expect(circleKeys.hasAny()).toEqual(['circles', 'has-any']);
    expect(circleKeys.mineAll()).toEqual(['circles', 'mine-all']);
  });

  test('category keys nest under a shared prefix', () => {
    expect(categoryKeys.list()).toEqual(['categories', 'list']);
  });

  test('circle list keys normalize the search query', () => {
    expect(circleKeys.list({ membership: 'mine' })).toEqual([
      'circles',
      'list',
      { membership: 'mine', q: null, radius: null },
    ]);
    expect(circleKeys.list({ membership: 'mine', q: '   ' })).toEqual(
      circleKeys.list({ membership: 'mine' }),
    );
    expect(circleKeys.list({ membership: 'mine', q: ' garden ' })).toEqual(
      circleKeys.list({ membership: 'mine', q: 'garden' }),
    );
  });

  test('circle list keys include the radius when set', () => {
    expect(circleKeys.list({ membership: 'discoverable', radius: 10 })).toEqual(
      ['circles', 'list', { membership: 'discoverable', q: null, radius: 10 }],
    );
    expect(
      circleKeys.list({ membership: 'discoverable', radius: 10 }),
    ).not.toEqual(circleKeys.list({ membership: 'discoverable' }));
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

  test('reference keys nest under a shared prefix', () => {
    expect(referenceKeys.tags()).toEqual(['reference', 'tags']);
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
          [...loanKeys.summary()],
        ],
      },
      {
        all: circleKeys.all,
        keys: [
          [...circleKeys.hasAny()],
          [...circleKeys.mineAll()],
          [...circleKeys.list({ membership: 'mine' })],
          [...circleKeys.detail('x')],
        ],
      },
      {
        all: categoryKeys.all,
        keys: [[...categoryKeys.list()]],
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
      {
        all: referenceKeys.all,
        keys: [[...referenceKeys.tags()]],
      },
    ];

    for (const { all, keys } of families) {
      for (const key of keys) {
        expect(key.slice(0, all.length)).toEqual([...all]);
      }
    }
  });
});
