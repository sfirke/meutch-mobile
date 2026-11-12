import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { FeedTypeFilter } from '../../lib/feed';
import type { LoanActivity } from '../../lib/loans';
import { ChipRow, type ChipOption } from '../../components/ui/ChipRow';
import { ContextBadge } from '../../components/ui/ContextBadge';
import { CountBadge, UnreadDot } from '../../components/ui/CountBadge';
import { DueBadge } from '../../components/ui/DueBadge';
import { FilterChip } from '../../components/ui/FilterChip';
import { ItemTag } from '../../components/ui/ItemTag';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ITEM_TAG_KINDS } from '../../components/ui/tags';
import { colors, outline, radii, spacing } from '../../theme';
import { GalleryExample, GallerySection } from './GallerySection';

const FEED_CHIPS: ChipOption<FeedTypeFilter>[] = [
  { value: 'requests', label: 'Requests' },
  { value: 'giveaways', label: 'Giveaways' },
  { value: 'loans', label: 'Lending' },
  { value: 'circle_joins', label: 'Circles' },
];

type Sort = 'newest' | 'nearest' | 'name';

const SORT_CHIPS: ChipOption<Sort>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'name', label: 'Name' },
];

const baseLoan: LoanActivity = {
  id: 'c3333333-3333-4333-8333-333333333333',
  status: 'approved',
  start_date: '2026-06-01',
  end_date: '2026-06-08',
  item: {
    id: 'd4444444-4444-4444-8444-444444444444',
    name: 'Folding ladder',
    available: false,
    image_url: null,
  },
  owner: null,
  borrower: null,
  latest_conversation_message_id: null,
  due_state: 'on_time',
  days_until_due: 3,
  days_overdue: null,
  pending_extension_request: null,
};

const DUE_STATES: Partial<LoanActivity>[] = [
  { due_state: 'overdue', days_overdue: 1 },
  { due_state: 'overdue', days_overdue: 3 },
  { due_state: 'due_today', days_until_due: 0 },
  { due_state: 'due_soon', days_until_due: 1 },
  { due_state: 'due_soon', days_until_due: 2 },
];

function Wrap({ children }: { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

export function TagsSection() {
  const [feedTypes, setFeedTypes] = useState<FeedTypeFilter[]>(
    FEED_CHIPS.map((chip) => chip.value),
  );
  const [sort, setSort] = useState<Sort>('newest');
  const [chipOn, setChipOn] = useState(false);

  return (
    <GallerySection title="Tags">
      <GalleryExample label="ItemTag, every kind, then free-form">
        <Wrap>
          {ITEM_TAG_KINDS.map((kind) => (
            <ItemTag key={kind} kind={kind} />
          ))}
          <ItemTag label="Free-form" />
          <ItemTag label="Free-form teal wash" tone="tealWash" />
        </Wrap>
      </GalleryExample>

      <GalleryExample label="ItemTag onPhoto">
        <View style={styles.photos}>
          <View style={[styles.photo, styles.photoDark]}>
            <ItemTag kind="giveaway" onPhoto />
          </View>
          <View style={[styles.photo, styles.photoLight]}>
            <ItemTag kind="pending" onPhoto />
          </View>
        </View>
        <View style={styles.photos}>
          <View style={[styles.photo, styles.photoLight]}>
            <ItemTag kind="rehomed" onPhoto />
          </View>
          <View style={[styles.photo, styles.photoDark]}>
            <ItemTag kind="on_loan" onPhoto />
          </View>
        </View>
      </GalleryExample>

      <GalleryExample label="FilterChip off, on, and one to tap">
        <Wrap>
          <FilterChip label="Unselected" onPress={() => {}} selected={false} />
          <FilterChip label="Selected" onPress={() => {}} selected />
          <FilterChip
            label="Toggle me"
            onPress={() => setChipOn((on) => !on)}
            selected={chipOn}
          />
        </Wrap>
      </GalleryExample>

      <GalleryExample label="ChipRow multi with Everything (feed)">
        <ChipRow
          accessibilityLabel="Filter by type"
          mode="multi"
          onChange={setFeedTypes}
          options={FEED_CHIPS}
          selected={feedTypes}
          testID="gallery-feed-chips"
        />
      </GalleryExample>

      <GalleryExample label="ChipRow single">
        <ChipRow
          accessibilityLabel="Sort by"
          mode="single"
          onChange={setSort}
          options={SORT_CHIPS}
          selected={sort}
        />
      </GalleryExample>

      <GalleryExample label="CountBadge 1, 12, 120, then UnreadDot">
        <Wrap>
          <CountBadge count={1} />
          <CountBadge count={12} />
          <CountBadge count={120} />
          <UnreadDot accessibilityLabel="Unread" />
        </Wrap>
      </GalleryExample>

      <GalleryExample label="ContextBadge item, request, circle, long">
        <Wrap>
          <ContextBadge kind="item" label="Folding ladder" />
          <ContextBadge kind="request" label="Need a stud finder" />
          <ContextBadge kind="circle" label="Elm Street neighbors" />
        </Wrap>
        <ContextBadge
          kind="item"
          label="A very long item name that has to be cut off at the end of the line"
        />
      </GalleryExample>

      <GalleryExample label="DueBadge">
        <Wrap>
          {DUE_STATES.map((state, index) => (
            <DueBadge key={index} loan={{ ...baseLoan, ...state }} />
          ))}
        </Wrap>
      </GalleryExample>

      <GalleryExample label="StatusBadge pending, approved, other">
        <Wrap>
          <StatusBadge status="pending" />
          <StatusBadge status="approved" />
          <StatusBadge status="denied" />
          <StatusBadge status="canceled" />
        </Wrap>
      </GalleryExample>
    </GallerySection>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[8],
  },
  photos: { flexDirection: 'row', gap: spacing[12] },
  photo: {
    flex: 1,
    height: 110,
    borderWidth: outline,
    borderColor: colors.ink,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  photoDark: { backgroundColor: colors.tealDeep },
  photoLight: { backgroundColor: colors.tangerineWash },
});
