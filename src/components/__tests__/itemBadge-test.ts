import { getAvailabilityBadge } from '../itemBadge';

describe('getAvailabilityBadge', () => {
  test('returns null when available, regardless of a stale claim_status', () => {
    expect(
      getAvailabilityBadge({
        available: true,
        is_giveaway: false,
        claim_status: 'claimed',
      }),
    ).toBeNull();
    expect(
      getAvailabilityBadge({
        available: true,
        is_giveaway: true,
        claim_status: 'claimed',
      }),
    ).toBeNull();
  });

  test('returns Rehomed for an unavailable, claimed giveaway', () => {
    expect(
      getAvailabilityBadge({
        available: false,
        is_giveaway: true,
        claim_status: 'claimed',
      }),
    ).toEqual({ label: 'Rehomed', tone: 'success', icon: 'rehomed' });
  });

  test.each(['pending_pickup', 'unclaimed', null] as const)(
    'returns Pending Pickup for an unavailable giveaway with claim_status %s',
    (claimStatus) => {
      expect(
        getAvailabilityBadge({
          available: false,
          is_giveaway: true,
          claim_status: claimStatus,
        }),
      ).toEqual({ label: 'Pending Pickup', tone: 'warning', icon: 'pending' });
    },
  );

  test.each(['claimed', 'pending_pickup', 'unclaimed', null] as const)(
    'returns Borrowed for an unavailable, non-giveaway item with claim_status %s',
    (claimStatus) => {
      expect(
        getAvailabilityBadge({
          available: false,
          is_giveaway: false,
          claim_status: claimStatus,
        }),
      ).toEqual({ label: 'Borrowed', tone: 'warning', icon: 'pending' });
    },
  );
});
