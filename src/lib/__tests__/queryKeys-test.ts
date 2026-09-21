import { circleKeys, feedKeys, itemKeys } from '../queryKeys';

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
});
