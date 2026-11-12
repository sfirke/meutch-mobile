import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { FilterSheet } from '../../components/FilterSheet';
import { OptionSheet } from '../../components/OptionSheet';
import { PagingFooter } from '../../components/PagingFooter';
import { QueryStateView } from '../../components/QueryStateView';
import { SelectList } from '../../components/SelectList';
import { Banner, type BannerTone } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme';
import { GalleryExample, GallerySection } from './GallerySection';

type Open = 'confirm' | 'delete' | 'option' | 'filter' | null;

const TONES: BannerTone[] = ['success', 'info', 'warning', 'danger'];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'near', label: 'Closest', hint: 'Needs your location' },
];

export function OverlaysSection() {
  const [open, setOpen] = useState<Open>(null);
  const [sort, setSort] = useState('newest');
  const [kinds, setKinds] = useState(['lend']);
  const close = () => setOpen(null);

  return (
    <View testID="overlays-section">
      <GallerySection title="Overlays">
        <GalleryExample label="Dialogs and sheets (open to see)">
          <View style={styles.row}>
            <Button
              label="Open confirm dialog"
              onPress={() => setOpen('confirm')}
              variant="outline"
            />
            <Button
              label="Open delete dialog"
              onPress={() => setOpen('delete')}
              variant="outline"
            />
            <Button
              label="Open option sheet"
              onPress={() => setOpen('option')}
              variant="outline"
            />
            <Button
              label="Open filter sheet"
              onPress={() => setOpen('filter')}
              variant="outline"
            />
          </View>
        </GalleryExample>

        <ConfirmDialog
          cancelLabel="Not now"
          confirmLabel="Send request"
          message="We will let the owner know you want to borrow this."
          onCancel={close}
          onConfirm={close}
          title="Ask to borrow this?"
          visible={open === 'confirm'}
        />
        <ConfirmDialog
          confirmLabel="Delete"
          destructive
          error="Item has an active loan."
          message="This will permanently delete the item. This can't be undone."
          onCancel={close}
          onConfirm={close}
          title="Delete this item?"
          visible={open === 'delete'}
        />
        <OptionSheet
          onClose={close}
          onSelect={setSort}
          options={SORTS}
          title="Sort by"
          value={sort}
          visible={open === 'option'}
        />
        <FilterSheet
          onApply={close}
          onClose={close}
          onReset={() => setKinds([])}
          title="Filters"
          visible={open === 'filter'}
        >
          <SelectList
            multiple
            onChange={setKinds}
            options={[
              { value: 'lend', label: 'Lending' },
              { value: 'give', label: 'Up for grabs' },
              { value: 'want', label: 'Wanted' },
            ]}
            value={kinds}
          />
        </FilterSheet>

        <GalleryExample label="EmptyState, one action">
          <View style={styles.inline}>
            <EmptyState
              actionLabel="Browse items"
              message="When neighbors post something, it shows up here."
              onAction={() => {}}
              title="Nothing here yet"
            />
          </View>
        </GalleryExample>
        <GalleryExample label="EmptyState, two actions">
          <View style={styles.inline}>
            <EmptyState
              actionLabel="Post an item"
              icon="circle"
              message="Join a circle to see what people nearby are sharing."
              onAction={() => {}}
              onSecondaryAction={() => {}}
              secondaryActionLabel="Find circles"
              title="No circles yet"
            />
          </View>
        </GalleryExample>
        <GalleryExample label="ErrorState with retry">
          <View style={styles.inline}>
            <ErrorState
              message="Check your connection and try again."
              onRetry={() => {}}
              title="We couldn't load this"
            />
          </View>
        </GalleryExample>
        <GalleryExample label="ErrorState retrying">
          <View style={styles.inline}>
            <ErrorState
              isRetrying
              message="Check your connection and try again."
              onRetry={() => {}}
              title="We couldn't load this"
            />
          </View>
        </GalleryExample>
        <GalleryExample label="QueryStateView loading">
          <View style={styles.short}>
            <QueryStateView error={null} isEmpty={false} isPending>
              {null}
            </QueryStateView>
          </View>
        </GalleryExample>
        <GalleryExample label="PagingFooter: idle (renders nothing), loading, failed">
          <PagingFooter
            hasError={false}
            isFetchingNextPage={false}
            onRetry={() => {}}
          />
          <PagingFooter
            hasError={false}
            isFetchingNextPage
            onRetry={() => {}}
          />
          <PagingFooter
            hasError
            isFetchingNextPage={false}
            onRetry={() => {}}
          />
        </GalleryExample>

        <GalleryExample label="Banner, without title">
          <View style={styles.stack}>
            {TONES.map((tone) => (
              <Banner key={tone} tone={tone}>
                {`Message in the ${tone} tone.`}
              </Banner>
            ))}
          </View>
        </GalleryExample>
        <GalleryExample label="Banner, with title, icon, action and dismiss">
          <View style={styles.stack}>
            {TONES.map((tone) => (
              <Banner
                action={{ label: 'Take a look', onPress: () => {} }}
                icon={tone === 'danger' ? 'warning' : 'check'}
                key={tone}
                onDismiss={() => {}}
                title={`Title, ${tone} tone`}
                tone={tone}
              >
                {`Message in the ${tone} tone, with a bit more to say.`}
              </Banner>
            ))}
          </View>
        </GalleryExample>
      </GallerySection>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { minHeight: 240 },
  row: { alignItems: 'flex-start', gap: spacing[8] },
  short: { height: 100 },
  stack: { gap: spacing[12] },
});
