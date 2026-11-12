import type { CircleSummary } from '../../lib/circles';
import type { FeedEvent } from '../../lib/feed';
import type { ItemSummary } from '../../lib/items';
import { colors } from '../../theme';

// Ported from the web's components/tags.html and the .item-tag rules.
export const ITEM_TAG_LABELS = {
  giveaway: 'Up for grabs',
  pending: 'Pending pickup',
  rehomed: 'Rehomed',
  on_loan: 'Out on loan',
  wanted: 'Wanted',
  found: 'Found!',
  circle: 'Circle',
  'closed-circle': 'Closed circle',
  'secret-circle': 'Secret circle',
  regional: 'Regional circle',
  member: 'Member',
  admin: 'Admin',
  mine: 'Your item',
  expired: 'Expired',
} as const;

export type ItemTagKind = keyof typeof ITEM_TAG_LABELS;

export const ITEM_TAG_KINDS = Object.keys(ITEM_TAG_LABELS) as ItemTagKind[];

export type TagTone =
  | 'white'
  | 'emerald'
  | 'tangerine'
  | 'tangerineWash'
  | 'teal'
  | 'tealWash'
  | 'ink';

export type TagColors = { fill: string; text: string };

export const TAG_TONE_COLORS: Record<TagTone, TagColors> = {
  white: { fill: colors.cardPaper, text: colors.ink },
  emerald: { fill: colors.emerald, text: colors.white },
  tangerine: { fill: colors.tangerine, text: colors.ink },
  tangerineWash: { fill: colors.tangerineWash, text: colors.ink },
  teal: { fill: colors.teal, text: colors.ink },
  tealWash: { fill: colors.tealWash, text: colors.ink },
  ink: { fill: colors.ink, text: colors.paper },
};

export const ITEM_TAG_TONES: Record<ItemTagKind, TagTone> = {
  giveaway: 'emerald',
  pending: 'tangerineWash',
  rehomed: 'ink',
  on_loan: 'white',
  wanted: 'tangerine',
  found: 'ink',
  circle: 'teal',
  'closed-circle': 'white',
  'secret-circle': 'white',
  regional: 'tealWash',
  member: 'white',
  admin: 'white',
  mine: 'white',
  expired: 'white',
};

export function itemTagColors(kind: ItemTagKind): TagColors {
  return TAG_TONE_COLORS[ITEM_TAG_TONES[kind]];
}

export type StatusTagItem = Pick<
  ItemSummary,
  'available' | 'claim_status' | 'is_giveaway'
>;

/** The one tag that says where an item stands (web `item_status_tag`). */
export function itemStatusTag(item: StatusTagItem): ItemTagKind | null {
  if (item.is_giveaway && item.claim_status === 'claimed') {
    return 'rehomed';
  }
  if (item.is_giveaway && !item.available) {
    return 'pending';
  }
  if (item.is_giveaway) {
    return 'giveaway';
  }
  if (!item.available) {
    return 'on_loan';
  }
  return null;
}

export type TaggedFeedEvent = Pick<
  FeedEvent,
  'event_type' | 'status' | 'claim_status'
>;

/**
 * The feed card's tag (web main/index.html). A claimed giveaway gets none:
 * the web draws it as a compact row without a tag.
 */
export function feedEventTag(event: TaggedFeedEvent): ItemTagKind | null {
  switch (event.event_type) {
    case 'request':
      return event.status === 'fulfilled' ? 'found' : 'wanted';
    case 'giveaway':
      return event.claim_status === 'claimed' ? null : 'giveaway';
    case 'lent':
      return 'on_loan';
    case 'circle_join':
      return 'circle';
  }
}

/** Type and regional tags for a circle (web components/circles.html). */
export function circleTags(
  circle: Pick<CircleSummary, 'circle_type' | 'is_regional'>,
): ItemTagKind[] {
  const tags: ItemTagKind[] = [];
  if (circle.circle_type === 'closed') {
    tags.push('closed-circle');
  } else if (circle.circle_type === 'secret') {
    tags.push('secret-circle');
  }
  if (circle.is_regional) {
    tags.push('regional');
  }
  return tags;
}
