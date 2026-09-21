import type { ItemSummary } from '../lib/items';
import type { IconName } from './Icon';

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

/**
 * Mirrors the availability badge rule from the web card
 * (`app/templates/main/_item_card.html`): nothing while available, otherwise
 * "Rehomed" for a claimed giveaway, "Pending Pickup" for an unclaimed one,
 * and "Borrowed" for a plain loan.
 */
export function getAvailabilityBadge(
  item: BadgeItem,
): AvailabilityBadge | null {
  if (item.available) {
    return null;
  }

  if (item.is_giveaway) {
    return item.claim_status === 'claimed'
      ? { label: 'Rehomed', tone: 'success', icon: 'rehomed' }
      : { label: 'Pending Pickup', tone: 'warning', icon: 'pending' };
  }

  return { label: 'Borrowed', tone: 'warning', icon: 'pending' };
}
