import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DEFAULT_FEED_DISTANCE,
  FEED_DISTANCES,
  FEED_TYPE_FILTERS,
  type FeedDistance,
  type FeedScope,
  type FeedTypeFilter,
  isEveryFeedType,
} from '../lib/feed';
import { useProfileQuery } from '../query/useProfileQuery';
import { colors, spacing, typography } from '../theme';
import { FilterSheet } from './FilterSheet';
import { SegmentedControl } from './SegmentedControl';
import { SelectList, type SelectListOption } from './SelectList';
import { SwitchRow } from './SwitchRow';

export type FeedFilters = {
  scope: FeedScope;
  /** Event types to show. Every type is the default; the sheet never applies an empty list. */
  types: FeedTypeFilter[];
  /** `null` is "no distance limit". 20 is the backend default for a member with a location. */
  distance: FeedDistance | null;
  showOwnActivity: boolean;
  showClaimedGiveaways: boolean;
};

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  scope: 'all',
  types: [...FEED_TYPE_FILTERS],
  distance: DEFAULT_FEED_DISTANCE,
  showOwnActivity: true,
  // The backend shows given-away giveaways unless told otherwise.
  showClaimedGiveaways: true,
};

/** How many filters differ from their defaults, for the toolbar count. */
export function countActiveFeedFilters(filters: FeedFilters): number {
  return (
    (filters.scope !== 'all' ? 1 : 0) +
    (!isEveryFeedType(filters.types) ? 1 : 0) +
    (filters.distance !== DEFAULT_FEED_DISTANCE ? 1 : 0) +
    (filters.showOwnActivity === false ? 1 : 0) +
    (filters.showClaimedGiveaways === false ? 1 : 0)
  );
}

const SCOPE_OPTIONS: { value: FeedScope; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'circles', label: 'My circles' },
];

const TYPE_OPTIONS: SelectListOption<FeedTypeFilter>[] = [
  { value: 'requests', label: 'Requests' },
  { value: 'giveaways', label: 'Giveaways' },
  { value: 'loans', label: 'Loans' },
  { value: 'circle_joins', label: 'Circle joins' },
];

type DistanceOption = 'none' | `${FeedDistance}`;

const NO_LOCATION_HINT =
  'Add a location on your profile to filter by distance.';

// `hint` is only passed once the profile has loaded, so it does not flash.
function distanceOptions(
  hasLocation: boolean,
  hint: string | undefined,
): SelectListOption<DistanceOption>[] {
  return [
    {
      value: 'none' as const,
      label: 'No distance limit',
      hint,
    },
    ...FEED_DISTANCES.map((miles) => ({
      value: `${miles}` as const,
      label: `Within ${miles} miles`,
    })),
  ].map((option) => ({ ...option, disabled: !hasLocation }));
}

function toDistanceOption(distance: FeedDistance | null): DistanceOption {
  return distance === null ? 'none' : `${distance}`;
}

function fromDistanceOption(option: DistanceOption): FeedDistance | null {
  return FEED_DISTANCES.find((miles) => `${miles}` === option) ?? null;
}

export type FeedFilterSheetProps = {
  visible: boolean;
  /** The applied filters; the draft starts from these each time the sheet opens. */
  filters: FeedFilters;
  /** Called with the draft when Apply is tapped. The parent closes the sheet. */
  onApply: (filters: FeedFilters) => void;
  onClose: () => void;
};

// Draft of the feed filters; nothing is sent until Apply.
export function FeedFilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: FeedFilterSheetProps) {
  const [draft, setDraft] = useState(filters);
  const [wasVisible, setWasVisible] = useState(visible);
  const { data: profile } = useProfileQuery();
  const hasLocation = profile?.has_location === true;
  const distanceHint = profile && !hasLocation ? NO_LOCATION_HINT : undefined;

  // Restart the draft from the applied filters each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);

    if (visible) {
      setDraft(filters);
    }
  }

  return (
    <FilterSheet
      applyDisabled={draft.types.length === 0}
      onApply={() => onApply(draft)}
      onClose={onClose}
      onReset={() => setDraft(DEFAULT_FEED_FILTERS)}
      title="Filter activity"
      visible={visible}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Show</Text>
        <SegmentedControl
          accessibilityLabel="Scope"
          onChange={(scope) => setDraft({ ...draft, scope })}
          options={SCOPE_OPTIONS}
          value={draft.scope}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distance</Text>
        <SelectList
          accessibilityLabel="Distance"
          onChange={([next]) => {
            if (next) {
              setDraft({ ...draft, distance: fromDistanceOption(next) });
            }
          }}
          options={distanceOptions(hasLocation, distanceHint)}
          // Without a location the server applies no distance, whatever the
          // draft holds, so the honest row to show ticked is "No distance limit".
          value={[hasLocation ? toDistanceOption(draft.distance) : 'none']}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity types</Text>
        <Text style={styles.helper}>Pick at least one.</Text>
        <SelectList
          accessibilityLabel="Activity types"
          multiple
          onChange={(types) => setDraft({ ...draft, types })}
          options={TYPE_OPTIONS}
          value={draft.types}
        />
      </View>
      <View style={styles.section}>
        <SwitchRow
          label="Show my own activity"
          onValueChange={(showOwnActivity) =>
            setDraft({ ...draft, showOwnActivity })
          }
          value={draft.showOwnActivity}
        />
        <SwitchRow
          label="Show given-away giveaways"
          onValueChange={(showClaimedGiveaways) =>
            setDraft({ ...draft, showClaimedGiveaways })
          }
          value={draft.showClaimedGiveaways}
        />
      </View>
    </FilterSheet>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: colors.secondary,
    ...typography.meta,
  },
  section: {
    gap: spacing[8],
    paddingBottom: spacing[16],
  },
  sectionTitle: {
    color: colors.text,
    ...typography.label,
  },
});
