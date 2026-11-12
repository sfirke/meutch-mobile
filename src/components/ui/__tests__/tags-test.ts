import { FEED_EVENT_TYPES } from '../../../lib/feed';
import { ITEM_CLAIM_STATUSES } from '../../../lib/items';
import {
  circleTags,
  feedEventTag,
  ITEM_TAG_KINDS,
  ITEM_TAG_LABELS,
  itemStatusTag,
  itemTagColors,
} from '../tags';

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('itemStatusTag', () => {
  test.each([
    [true, true, 'claimed', 'rehomed'],
    [true, false, 'claimed', 'rehomed'],
    [true, false, 'pending_pickup', 'pending'],
    [true, false, 'unclaimed', 'pending'],
    [true, false, null, 'pending'],
    [true, true, 'unclaimed', 'giveaway'],
    [true, true, null, 'giveaway'],
    [true, true, 'pending_pickup', 'giveaway'],
    [false, false, null, 'on_loan'],
    [false, false, 'claimed', 'on_loan'],
    [false, true, null, null],
    [false, true, 'claimed', null],
  ] as const)(
    'giveaway %s, available %s, claim %s gives %s',
    (isGiveaway, available, claimStatus, expected) => {
      expect(
        itemStatusTag({
          is_giveaway: isGiveaway,
          available,
          claim_status: claimStatus,
        }),
      ).toBe(expected);
    },
  );

  test('covers every claim status the app knows', () => {
    for (const claimStatus of ITEM_CLAIM_STATUSES) {
      expect(
        itemStatusTag({
          is_giveaway: true,
          available: false,
          claim_status: claimStatus,
        }),
      ).not.toBeNull();
    }
  });
});

describe('feedEventTag', () => {
  test.each([
    ['request', 'open', null, 'wanted'],
    ['request', 'fulfilled', null, 'found'],
    ['request', 'expired', null, 'wanted'],
    ['request', null, null, 'wanted'],
    ['giveaway', null, 'unclaimed', 'giveaway'],
    ['giveaway', null, 'pending_pickup', 'giveaway'],
    ['giveaway', null, null, 'giveaway'],
    ['giveaway', null, 'claimed', null],
    ['lent', null, null, 'on_loan'],
    ['circle_join', null, null, 'circle'],
  ] as const)(
    '%s with status %s and claim %s gives %s',
    (type, status, claim, expected) => {
      expect(
        feedEventTag({ event_type: type, status, claim_status: claim }),
      ).toBe(expected);
    },
  );

  test('has a case for every feed event type', () => {
    for (const type of FEED_EVENT_TYPES) {
      expect(
        feedEventTag({ event_type: type, status: null, claim_status: null }),
      ).not.toBeUndefined();
    }
  });
});

describe('circleTags', () => {
  test.each([
    ['open', false, []],
    ['open', true, ['regional']],
    ['closed', false, ['closed-circle']],
    ['secret', true, ['secret-circle', 'regional']],
    [null, false, []],
  ] as const)('%s, regional %s', (type, regional, expected) => {
    expect(circleTags({ circle_type: type, is_regional: regional })).toEqual(
      expected,
    );
  });
});

describe('tag labels and colors', () => {
  test('labels are sentence case and never say free', () => {
    for (const kind of ITEM_TAG_KINDS) {
      const label = ITEM_TAG_LABELS[kind];
      expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
      expect(label.slice(1)).toBe(label.slice(1).toLowerCase());
      expect(label.toLowerCase()).not.toContain('free');
    }
  });

  test('every kind has readable text on its fill', () => {
    for (const kind of ITEM_TAG_KINDS) {
      const { fill, text } = itemTagColors(kind);
      expect(ratio(fill, text)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
