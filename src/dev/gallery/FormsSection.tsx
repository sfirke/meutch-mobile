import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateField } from '../../components/DateField';
import { FormTextField } from '../../components/FormTextField';
import { RadiusInput } from '../../components/RadiusInput';
import { SearchField } from '../../components/SearchField';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SelectList } from '../../components/SelectList';
import { SwitchRow } from '../../components/SwitchRow';
import { TagInput } from '../../components/TagInput';
import { UploadTile } from '../../components/ui/UploadTile';
import { spacing } from '../../theme';
import { GalleryExample, GallerySection } from './GallerySection';

const noop = () => undefined;

const TWO = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'archived', label: 'Archived' },
];
const THREE = [
  { value: 'all', label: 'All items' },
  { value: 'loans', label: 'Loans' },
  { value: 'giveaways', label: 'Giveaways' },
];
const OPTIONS = [
  { value: 'a', label: 'My circles' },
  { value: 'b', label: 'Public' },
  { value: 'c', label: 'Only me', disabled: true, hint: 'Not available yet' },
];

export function FormsSection() {
  const [text, setText] = useState('Cordless drill');
  const [two, setTwo] = useState('inbox');
  const [three, setThree] = useState('all');
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [single, setSingle] = useState(['a']);
  const [multi, setMulti] = useState(['a', 'b']);
  const [tags, setTags] = useState(['tools', 'garden']);
  const [query, setQuery] = useState('ladder');
  const [radius, setRadius] = useState(10);
  const [date, setDate] = useState<string | null>('2026-12-01');

  return (
    <GallerySection title="Forms">
      <View style={styles.stack}>
        <GalleryExample label="Text field: empty">
          <FormTextField
            field="g1"
            label="Title"
            onChangeText={noop}
            placeholder="What is it?"
            value=""
          />
        </GalleryExample>
        <GalleryExample label="Text field: filled with help text">
          <FormTextField
            field="g2"
            hint="A short name people will search for."
            label="Title"
            onChangeText={setText}
            value={text}
          />
        </GalleryExample>
        <GalleryExample label="Text field: error">
          <FormTextField
            error="Title is required."
            field="g3"
            label="Title"
            onChangeText={noop}
            value=""
          />
        </GalleryExample>
        <GalleryExample label="Text field: disabled">
          <FormTextField
            editable={false}
            field="g4"
            label="Title"
            onChangeText={noop}
            value="Locked"
          />
        </GalleryExample>
        <GalleryExample label="Text field: focused (tap it)">
          <FormTextField
            field="g5"
            label="Focus me"
            onChangeText={noop}
            placeholder="Tap here"
            value=""
          />
        </GalleryExample>
        <GalleryExample label="Search: empty">
          <SearchField
            onChangeText={noop}
            onClear={noop}
            placeholder="Search items"
            value=""
          />
        </GalleryExample>
        <GalleryExample label="Search: with text">
          <SearchField
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Search items"
            value={query}
          />
        </GalleryExample>
        <GalleryExample label="Radius input">
          <RadiusInput onChange={setRadius} value={radius} />
        </GalleryExample>
        <GalleryExample label="Radius input: disabled">
          <RadiusInput disabled onChange={noop} value={10} />
        </GalleryExample>
        <GalleryExample label="Date field">
          <DateField
            field="when"
            label="Needed by"
            onChange={setDate}
            value={date}
          />
        </GalleryExample>
        <GalleryExample label="Date field: error">
          <DateField
            error="Pick a date in the future."
            field="when2"
            label="Needed by"
            onChange={noop}
            value={null}
          />
        </GalleryExample>
        <GalleryExample label="Segmented control: 2 segments">
          <SegmentedControl
            accessibilityLabel="Folder"
            onChange={setTwo}
            options={TWO}
            value={two}
          />
        </GalleryExample>
        <GalleryExample label="Segmented control: 3 segments">
          <SegmentedControl
            accessibilityLabel="Kind"
            onChange={setThree}
            options={THREE}
            value={three}
          />
        </GalleryExample>
        <GalleryExample label="Switch row: on, off, disabled">
          <View>
            <SwitchRow
              description="Weekly summary of nearby items."
              label="Email digest"
              onValueChange={setOn}
              value={on}
            />
            <SwitchRow
              label="Loan reminders"
              onValueChange={setOff}
              value={off}
            />
            <SwitchRow
              disabled
              label="Locked setting"
              onValueChange={noop}
              value
            />
          </View>
        </GalleryExample>
        <GalleryExample label="Select list: single">
          <SelectList
            accessibilityLabel="Visibility"
            onChange={setSingle}
            options={OPTIONS}
            value={single}
          />
        </GalleryExample>
        <GalleryExample label="Select list: multiple">
          <SelectList
            accessibilityLabel="Audience"
            multiple
            onChange={setMulti}
            options={OPTIONS}
            value={multi}
          />
        </GalleryExample>
        <GalleryExample label="Tag input with chips">
          <TagInput
            onChange={setTags}
            suggestions={[
              { id: '1', name: 'tools' },
              { id: '2', name: 'toys' },
            ]}
            testID="gallery-tags"
            value={tags}
          />
        </GalleryExample>
        <GalleryExample label="Tag input: disabled">
          <TagInput
            disabled
            onChange={noop}
            testID="gallery-tags-off"
            value={['tools']}
          />
        </GalleryExample>
        <GalleryExample label="Upload tile: empty, has file, disabled">
          <View style={styles.tiles}>
            <UploadTile
              accessibilityLabel="Add photo"
              onPress={noop}
              size={80}
            />
            <UploadTile
              accessibilityLabel="Replace photo"
              hasFile
              onPress={noop}
              size={80}
            />
            <UploadTile
              accessibilityLabel="Add photo"
              disabled
              onPress={noop}
              size={80}
            />
          </View>
        </GalleryExample>
      </View>
    </GallerySection>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[20] },
  tiles: { flexDirection: 'row', gap: spacing[12] },
});
