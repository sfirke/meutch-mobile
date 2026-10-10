import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import type { GiveawayVisibility, ItemWriteInput } from '../lib/items';
import { buildGeneralMessage, readValidationErrors } from '../lib/validation';
import { useCategoriesQuery } from '../query/useCategoriesQuery';
import { useProfileQuery } from '../query/useProfileQuery';
import { useTagsQuery } from '../query/useTagsQuery';
import { colors, radii, spacing, typography } from '../theme';
import { FieldError } from './FieldError';
import { Icon } from './Icon';
import { OptionSheet } from './OptionSheet';
import { SegmentedControl } from './SegmentedControl';
import { TagInput } from './TagInput';

export const ITEM_NAME_LIMIT = 100;
export const ITEM_DESCRIPTION_LIMIT = 500;

export const ITEM_FIELDS = [
  'name',
  'description',
  'category_id',
  'tags',
  'is_giveaway',
  'giveaway_visibility',
] as const;

export const PUBLIC_LOCATION_HINT =
  'Public giveaways need a location on your profile so nearby members can find them. Add one on meutch.com.';

export type ItemFormValues = ItemWriteInput;

export type ItemFormProps = {
  /** Edit prefills; create omits. */
  initialValues?: Partial<ItemFormValues>;
  onSubmit: (input: ItemWriteInput) => void;
  pending: boolean;
  error: unknown;
  /** Called when the user edits after an error. */
  onClearError?: () => void;
  submitLabel: string;
  onDirtyChange?: (dirty: boolean) => void;
  testID?: string;
};

type ItemType = 'lend' | 'give';

const TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'lend', label: 'Lend' },
  { value: 'give', label: 'Give away' },
];

const VISIBILITY_OPTIONS: { value: GiveawayVisibility; label: string }[] = [
  { value: 'default', label: 'My circles' },
  { value: 'public', label: 'Public' },
];

type FormState = {
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
  isGiveaway: boolean;
  visibility: GiveawayVisibility;
};

function toFormState(values?: Partial<ItemFormValues>): FormState {
  return {
    name: values?.name ?? '',
    description: values?.description ?? '',
    categoryId: values?.category_id ?? '',
    tags: values?.tags ?? [],
    isGiveaway: values?.is_giveaway ?? false,
    visibility: values?.giveaway_visibility ?? 'default',
  };
}

function toInput(form: FormState): ItemWriteInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    category_id: form.categoryId,
    tags: form.tags,
    is_giveaway: form.isGiveaway,
    giveaway_visibility: form.isGiveaway ? form.visibility : null,
  };
}

function isSameInput(a: ItemWriteInput, b: ItemWriteInput): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.category_id === b.category_id &&
    a.is_giveaway === b.is_giveaway &&
    a.giveaway_visibility === b.giveaway_visibility &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag, index) => tag === b.tags[index])
  );
}

type DisableOverlayProps = {
  disabled: boolean;
  children: ReactNode;
};

// SegmentedControl has no disabled prop, so block touches and dim it.
function DisableOverlay({ disabled, children }: DisableOverlayProps) {
  return (
    <View
      accessibilityState={disabled ? { disabled: true } : undefined}
      pointerEvents={disabled ? 'none' : 'auto'}
      style={disabled ? styles.disabled : undefined}
    >
      {children}
    </View>
  );
}

type CategoryFieldProps = {
  categoryId: string;
  disabled: boolean;
  onChange: (categoryId: string) => void;
};

function CategoryField({ categoryId, disabled, onChange }: CategoryFieldProps) {
  const categories = useCategoriesQuery();
  const [open, setOpen] = useState(false);

  if (categories.error && !categories.data) {
    return (
      <View style={styles.inlineErrorRow} testID="item-category-error">
        <Text style={styles.errorText}>{"Couldn't load categories."}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={categories.isFetching}
          onPress={() => {
            void categories.refetch();
          }}
          style={({ pressed }) => pressed && styles.dim}
        >
          <Text style={styles.linkLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const options = [...(categories.data ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((category) => ({
      value: category.id,
      label: category.name,
    }));
  const loading = !categories.data;
  const chosen = options.find((option) => option.value === categoryId);
  const rowDisabled = disabled || loading;
  const label = loading
    ? 'Loading categories...'
    : (chosen?.label ?? 'Choose a category');

  return (
    <>
      <Pressable
        accessibilityLabel={`Category: ${label}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: rowDisabled }}
        disabled={rowDisabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.pickerRow,
          (rowDisabled || pressed) && styles.dim,
        ]}
        testID="item-category"
      >
        <Text style={chosen ? styles.pickerValue : styles.pickerPlaceholder}>
          {label}
        </Text>
        <Icon color={colors.secondary} name="chevron" size={12} />
      </Pressable>
      <OptionSheet
        onClose={() => setOpen(false)}
        onSelect={onChange}
        options={options}
        title="Category"
        value={categoryId}
        visible={open}
      />
    </>
  );
}

export function ItemForm({
  initialValues,
  onSubmit,
  pending,
  error,
  onClearError,
  submitLabel,
  onDirtyChange,
  testID = 'item-form',
}: ItemFormProps) {
  const [initial] = useState(() => toInput(toFormState(initialValues)));
  const [form, setForm] = useState(() => toFormState(initialValues));
  const tags = useTagsQuery();
  const profile = useProfileQuery();

  const input = toInput(form);
  const dirty = !isSameInput(input, initial);

  const reportedDirty = useRef(false);
  useEffect(() => {
    if (dirty !== reportedDirty.current) {
      reportedDirty.current = dirty;
      onDirtyChange?.(dirty);
    }
  }, [dirty, onDirtyChange]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (error) {
      onClearError?.();
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validation = readValidationErrors(error, ITEM_FIELDS);
  const generalMessage = buildGeneralMessage(error, validation);
  const submittable = input.name !== '' && input.category_id !== '';
  const submitDisabled = pending || !submittable;
  const showLocationHint =
    form.isGiveaway &&
    form.visibility === 'public' &&
    profile.data?.has_location === false;

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing[16]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Name</Text>
        <TextInput
          accessibilityLabel="Name"
          editable={!pending}
          maxLength={ITEM_NAME_LIMIT}
          onChangeText={(value) => update('name', value)}
          placeholder="What are you sharing?"
          placeholderTextColor={colors.inputPlaceholder}
          style={[styles.input, pending && styles.dim]}
          testID="item-name"
          value={form.name}
        />
        <FieldError field="name" message={validation.fields.name} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          accessibilityLabel="Description"
          editable={!pending}
          maxLength={ITEM_DESCRIPTION_LIMIT}
          multiline
          onChangeText={(value) => update('description', value)}
          placeholder="Condition, size, anything worth knowing"
          placeholderTextColor={colors.inputPlaceholder}
          style={[styles.input, styles.multiline, pending && styles.dim]}
          testID="item-description"
          value={form.description}
        />
        <Text style={styles.counter} testID="item-description-counter">
          {form.description.length}/{ITEM_DESCRIPTION_LIMIT}
        </Text>
        <FieldError
          field="description"
          message={validation.fields.description}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category</Text>
        <CategoryField
          categoryId={form.categoryId}
          disabled={pending}
          onChange={(value) => update('categoryId', value)}
        />
        <FieldError
          field="category_id"
          message={validation.fields.category_id}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tags</Text>
        <TagInput
          disabled={pending}
          onChange={(value) => update('tags', value)}
          suggestions={tags.data ?? []}
          value={form.tags}
        />
        <FieldError field="tags" message={validation.fields.tags} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Type</Text>
        <DisableOverlay disabled={pending}>
          <SegmentedControl
            accessibilityLabel="Item type"
            onChange={(value) => update('isGiveaway', value === 'give')}
            options={TYPE_OPTIONS}
            value={form.isGiveaway ? 'give' : 'lend'}
          />
        </DisableOverlay>
        <FieldError
          field="is_giveaway"
          message={validation.fields.is_giveaway}
        />
      </View>

      {form.isGiveaway ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Who can see it</Text>
          <DisableOverlay disabled={pending}>
            <SegmentedControl
              accessibilityLabel="Who can see it"
              onChange={(value) => update('visibility', value)}
              options={VISIBILITY_OPTIONS}
              value={form.visibility}
            />
          </DisableOverlay>
          {showLocationHint ? (
            <Text style={styles.note} testID="item-location-hint">
              {PUBLIC_LOCATION_HINT}
            </Text>
          ) : null}
          <FieldError
            field="giveaway_visibility"
            message={validation.fields.giveaway_visibility}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        {generalMessage ? (
          <Text style={styles.errorText} testID="item-form-error">
            {generalMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitDisabled }}
          disabled={submitDisabled}
          onPress={() => onSubmit(input)}
          style={({ pressed }) => [
            styles.submitButton,
            (submitDisabled || pressed) && styles.disabled,
          ]}
          testID="item-submit"
        >
          <Text style={styles.submitLabel}>
            {pending ? 'Saving...' : submitLabel}
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[8],
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  counter: {
    color: colors.secondary,
    textAlign: 'right',
    ...typography.itemMeta,
  },
  dim: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  inlineErrorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    ...typography.body,
  },
  linkLabel: {
    color: colors.primaryDark,
    ...typography.label,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  note: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  pickerPlaceholder: {
    color: colors.inputPlaceholder,
    ...typography.body,
  },
  pickerRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
  },
  pickerValue: {
    color: colors.text,
    ...typography.body,
  },
  section: {
    gap: spacing[8],
    paddingTop: spacing[12],
  },
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  submitLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
});
