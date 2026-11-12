import type { ItemSummary } from '../lib/items';
import type { IconName } from './Icon';
import { itemStatusTag, TAG_TONE_COLORS } from './ui/tags';

// Legacy shape for ItemCard and ItemDetailScreen until they move to
// `itemStatusTag` and `ItemTag`. New code should use ./ui/tags.

export type AvailabilityBadgeTone = 'success' | 'warning';

export type AvailabilityBadge = {
  label: 'Rehomed' | 'Pending Pickup' | 'Borrowed';
  tone: AvailabilityBadgeTone;
  icon: IconName;
};

type BadgeItem = Pick<
  ItemSummary,
  'available' | 'claim_status' | 'is_giveaway'
>;

export const availabilityBadgeToneColors: Record<
  AvailabilityBadgeTone,
  string
> = {
  success: TAG_TONE_COLORS.emerald.fill,
  warning: TAG_TONE_COLORS.tangerine.fill,
};

/**
 * Nothing while available, otherwise "Rehomed" for a claimed giveaway,
 * "Pending Pickup" for an unclaimed one, and "Borrowed" for a plain loan.
 */
export function getAvailabilityBadge(
  item: BadgeItem,
): AvailabilityBadge | null {
  if (item.available) {
    return null;
  }

  switch (itemStatusTag(item)) {
    case 'rehomed':
      return { label: 'Rehomed', tone: 'success', icon: 'rehomed' };
    case 'pending':
      return { label: 'Pending Pickup', tone: 'warning', icon: 'pending' };
    default:
      return { label: 'Borrowed', tone: 'warning', icon: 'pending' };
  }
}
