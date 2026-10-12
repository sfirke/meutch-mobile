import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { FieldError } from '../components/FieldError';
import { QueryStateView } from '../components/QueryStateView';
import { clampRadius, RadiusInput } from '../components/RadiusInput';
import { SegmentedControl } from '../components/SegmentedControl';
import { SwitchRow } from '../components/SwitchRow';
import {
  DIGEST_FREQUENCIES,
  type DigestFrequency,
  type UserSettings,
} from '../lib/profile';
import { buildGeneralMessage, readValidationErrors } from '../lib/validation';
import { useSettingsQuery } from '../query/useSettingsQuery';
import { useUpdateSettingsMutation } from '../query/useUpdateSettingsMutation';
import { colors, radii, spacing, typography } from '../theme';

const HEADER_NOTE =
  'Digest emails are sent by meutch.com; these settings apply to your account everywhere.';

const VACATION_NOTE = "Pause borrow requests while you're away.";

/** `PATCH /me/settings` requires every one of these, so the form sends them all. */
const SETTINGS_FIELDS: readonly (keyof UserSettings)[] = [
  'vacation_mode',
  'digest_frequency',
  'digest_radius_miles',
  'digest_include_giveaways',
  'digest_include_requests',
  'digest_include_circle_joins',
  'digest_include_loans',
  'digest_giveaways_include_public',
  'digest_requests_include_public',
];

const FREQUENCY_LABELS: Record<DigestFrequency, string> = {
  none: 'None',
  daily: 'Daily',
  weekly: 'Weekly',
};

const FREQUENCY_OPTIONS = DIGEST_FREQUENCIES.map((value) => ({
  value,
  label: FREQUENCY_LABELS[value],
}));

type IncludeField =
  | 'digest_include_giveaways'
  | 'digest_include_requests'
  | 'digest_include_circle_joins'
  | 'digest_include_loans';

const INCLUDE_FIELDS: { field: IncludeField; label: string }[] = [
  { field: 'digest_include_giveaways', label: 'Giveaways' },
  { field: 'digest_include_requests', label: 'Requests' },
  { field: 'digest_include_circle_joins', label: 'Circle joins' },
  { field: 'digest_include_loans', label: 'Loans' },
];

type SourceField =
  'digest_giveaways_include_public' | 'digest_requests_include_public';

type SourceChoice = 'circles' | 'public';

const SOURCE_OPTIONS: { value: SourceChoice; label: string }[] = [
  { value: 'circles', label: 'Circles only' },
  { value: 'public', label: 'Include public nearby' },
];

const SOURCE_CONTROLS: {
  field: SourceField;
  label: string;
  accessibilityLabel: string;
  testID: string;
}[] = [
  {
    field: 'digest_giveaways_include_public',
    label: 'Giveaways from',
    accessibilityLabel: 'Giveaway sources',
    testID: 'digest-giveaway-sources',
  },
  {
    field: 'digest_requests_include_public',
    label: 'Requests from',
    accessibilityLabel: 'Request sources',
    testID: 'digest-request-sources',
  },
];

function isSameSettings(a: UserSettings, b: UserSettings): boolean {
  return SETTINGS_FIELDS.every((field) => a[field] === b[field]);
}

type DisableOverlayProps = {
  disabled: boolean;
  testID: string;
  children: ReactNode;
};

// SegmentedControl has no disabled prop, so the wrapper blocks touches and
// dims it instead of hiding the choice.
function DisableOverlay({ disabled, testID, children }: DisableOverlayProps) {
  return (
    <View
      accessibilityState={disabled ? { disabled: true } : undefined}
      pointerEvents={disabled ? 'none' : 'auto'}
      style={disabled ? styles.disabled : undefined}
      testID={testID}
    >
      {children}
    </View>
  );
}

type SettingsFormProps = {
  settings: UserSettings;
};

function SettingsForm({ settings }: SettingsFormProps) {
  const updateSettings = useUpdateSettingsMutation();
  const [prevSettings, setPrevSettings] = useState(settings);
  const [loaded, setLoaded] = useState(settings);
  const [form, setForm] = useState(settings);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isDirty = !isSameSettings(form, loaded);

  // A refetch that lands while nothing is edited adopts the fresh values;
  // an in-progress edit is left alone (React's adjust-state-in-render pattern).
  // Keyed on the prop changing, not on `loaded`: after a save, `loaded` holds
  // the response while `settings` can still be the stale cache for a render.
  if (settings !== prevSettings) {
    setPrevSettings(settings);

    if (!isDirty) {
      setLoaded(settings);
      setForm(settings);
    }
  }

  const update = <K extends keyof UserSettings>(
    field: K,
    value: UserSettings[K],
  ) => {
    setFeedback(null);
    updateSettings.reset();
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    // The backend takes an integer radius; the input can hold an out-of-range
    // number until it blurs.
    const payload: UserSettings = {
      ...form,
      digest_radius_miles: clampRadius(form.digest_radius_miles),
    };

    setForm(payload);
    updateSettings.mutate(payload, {
      onSuccess: (saved) => {
        setLoaded(saved);
        setForm(saved);
        setFeedback('Saved');
      },
    });
  };

  const validation = readValidationErrors(
    updateSettings.error,
    SETTINGS_FIELDS,
  );
  const generalMessage = buildGeneralMessage(updateSettings.error, validation);
  const digestDisabled = form.digest_frequency === 'none';
  const saveDisabled = !isDirty || updateSettings.isPending;

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing[16]}
      contentContainerStyle={styles.content}
      testID="settings-scroll"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.note}>{HEADER_NOTE}</Text>

      <View style={styles.section}>
        <SwitchRow
          description={VACATION_NOTE}
          label="Vacation mode"
          onValueChange={(value) => update('vacation_mode', value)}
          value={form.vacation_mode}
        />
        <FieldError
          field="vacation_mode"
          message={validation.fields.vacation_mode}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Digest email</Text>
        <SegmentedControl
          accessibilityLabel="Digest frequency"
          onChange={(value) => update('digest_frequency', value)}
          options={FREQUENCY_OPTIONS}
          value={form.digest_frequency}
        />
        <FieldError
          field="digest_frequency"
          message={validation.fields.digest_frequency}
        />
        <RadiusInput
          disabled={digestDisabled}
          onChange={(miles) => update('digest_radius_miles', miles)}
          value={form.digest_radius_miles}
        />
        <FieldError
          field="digest_radius_miles"
          message={validation.fields.digest_radius_miles}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Include in the digest</Text>
        {INCLUDE_FIELDS.map(({ field, label }) => (
          <View key={field}>
            <SwitchRow
              disabled={digestDisabled}
              label={label}
              onValueChange={(value) => update(field, value)}
              value={form[field]}
            />
            <FieldError field={field} message={validation.fields[field]} />
          </View>
        ))}
      </View>

      {SOURCE_CONTROLS.map((control) => (
        <View key={control.field} style={styles.section}>
          <Text style={styles.sectionLabel}>{control.label}</Text>
          <DisableOverlay disabled={digestDisabled} testID={control.testID}>
            <SegmentedControl
              accessibilityLabel={control.accessibilityLabel}
              onChange={(value) => update(control.field, value === 'public')}
              options={SOURCE_OPTIONS}
              value={form[control.field] ? 'public' : 'circles'}
            />
          </DisableOverlay>
          <FieldError
            field={control.field}
            message={validation.fields[control.field]}
          />
        </View>
      ))}

      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saveDisabled }}
          disabled={saveDisabled}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            (saveDisabled || pressed) && styles.disabled,
          ]}
        >
          <Text style={styles.saveLabel}>
            {updateSettings.isPending ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
        {feedback ? (
          <Text style={styles.feedback} testID="settings-feedback">
            {feedback}
          </Text>
        ) : null}
        {generalMessage ? (
          <Text style={styles.errorText} testID="settings-error">
            {generalMessage}
          </Text>
        ) : null}
      </View>
    </KeyboardAwareScrollView>
  );
}

export function SettingsScreen() {
  const { data, error, isPending, isFetching, refetch } = useSettingsQuery();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <QueryStateView
        error={error}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading settings"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? <SettingsForm settings={data} /> : null}
      </QueryStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[8],
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  disabled: {
    opacity: 0.5,
  },
  feedback: {
    color: colors.success,
    ...typography.itemMeta,
  },
  errorText: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  note: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  saveLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: spacing[8],
    paddingTop: spacing[12],
  },
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
  },
});
