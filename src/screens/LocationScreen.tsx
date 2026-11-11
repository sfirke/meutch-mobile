import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormTextField } from '../components/FormTextField';
import { Icon } from '../components/Icon';
import { QueryStateView } from '../components/QueryStateView';
import { RequestTimeoutError } from '../lib/api';
import { readDeviceCoordinates } from '../lib/deviceLocation';
import { describeError } from '../lib/errorCopy';
import {
  ADDRESS_FIELD_LABELS,
  ADDRESS_FIELDS,
  describeLocationResult,
  type AddressField,
  type AddressInput,
  type LocationResultTone,
} from '../lib/location';
import { type UserProfile } from '../lib/profile';
import { buildGeneralMessage, readValidationErrors } from '../lib/validation';
import { useProfileQuery } from '../query/useProfileQuery';
import {
  useUpdateLocationMutation,
  type LocationMutationInput,
} from '../query/useUpdateLocationMutation';
import { colors, radii, spacing, typography } from '../theme';

const PRIVACY_NOTE =
  'Meutch stores only a point on the map, never your address. Your exact location is never shown to other members. They only see approximate distances.';

const RATE_NOTE = 'Location updates are limited to once per day.';

const ADDRESS_HINT =
  "Meutch uses the address once to find your point on the map and doesn't keep it.";

const DEVICE_ERRORS = {
  denied:
    "Meutch doesn't have permission to use your location. Allow it in your device settings, or enter an address below.",
  unavailable:
    "We couldn't get your current location. Check that location services are on, or enter an address below.",
};

const EMPTY_ADDRESS: AddressInput = {
  street: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
};

const INPUT_PROPS: Record<AddressField, TextInputProps> = {
  street: {
    autoComplete: 'street-address',
    textContentType: 'fullStreetAddress',
  },
  city: {
    autoComplete: 'postal-address-locality',
    textContentType: 'addressCity',
  },
  state: {
    autoComplete: 'postal-address-region',
    textContentType: 'addressState',
  },
  zip_code: { autoComplete: 'postal-code', textContentType: 'postalCode' },
  country: { autoComplete: 'country', textContentType: 'countryName' },
};

function describeLocation(profile: UserProfile): string {
  if (profile.has_location) {
    return 'Location set';
  }

  if (profile.geocoding_failed) {
    return "We couldn't determine your location";
  }

  return 'No location set';
}

const TONE_STYLES: Record<
  LocationResultTone,
  { border: string; text: string; background?: string }
> = {
  success: { border: colors.success, text: colors.success },
  warning: {
    border: colors.warning,
    text: colors.errorText,
    background: colors.errorSurface,
  },
  error: { border: colors.danger, text: colors.danger },
};

type LocationFormProps = {
  profile: UserProfile;
  refetchProfile: () => void;
};

function LocationForm({ profile, refetchProfile }: LocationFormProps) {
  const updateLocation = useUpdateLocationMutation();
  const [address, setAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [missing, setMissing] = useState<AddressField[]>([]);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [locating, setLocating] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const { data, error, isPending, variables } = updateLocation;
  const removing = variables === 'remove';
  const fromDevice = typeof variables === 'object' && 'latitude' in variables;
  const busy = isPending || locating;
  const hasBlank = ADDRESS_FIELDS.some((field) => address[field] === '');
  const saveDisabled = busy || hasBlank;

  const submit = (input: LocationMutationInput) => {
    updateLocation.mutate(input, {
      onSuccess: (result) => {
        if (input === 'remove') {
          setConfirmingRemove(false);
        } else if (result.status === 'success') {
          setAddress(EMPTY_ADDRESS);
        }
      },
      onError: (failure) => {
        // The update may have landed server-side before the client gave up.
        if (failure instanceof RequestTimeoutError) {
          refetchProfile();
        }
      },
    });
  };

  const handleUseDevice = async () => {
    updateLocation.reset();
    setDeviceError(null);
    setLocating(true);

    const located = await readDeviceCoordinates();

    setLocating(false);

    if (located.kind === 'located') {
      submit(located.coordinates);
    } else {
      setDeviceError(DEVICE_ERRORS[located.kind]);
    }
  };

  const handleSave = () => {
    const blank = ADDRESS_FIELDS.filter((field) => !address[field].trim());

    setDeviceError(null);
    setMissing(blank);

    if (blank.length === 0) {
      submit(address);
    }
  };

  const handleChange = (field: AddressField, value: string) => {
    if (data || error) {
      updateLocation.reset();
    }

    setMissing((current) => current.filter((name) => name !== field));
    setAddress((current) => ({ ...current, [field]: value }));
  };

  const validation = readValidationErrors(error, ADDRESS_FIELDS);
  const generalMessage = removing
    ? null
    : buildGeneralMessage(error, validation);
  const result = data ? describeLocationResult(data.status) : null;
  const tone = result ? TONE_STYLES[result.tone] : null;
  const outcome = (
    <>
      {result && tone ? (
        <View
          style={[
            styles.result,
            {
              borderColor: tone.border,
              backgroundColor: tone.background,
            },
          ]}
          testID="location-result"
        >
          <Icon
            color={tone.text}
            name={result.tone === 'success' ? 'check' : 'warning'}
          />
          <Text style={[styles.resultText, { color: tone.text }]}>
            {result.message}
          </Text>
        </View>
      ) : null}
      {generalMessage ? (
        <Text style={styles.errorText} testID="location-error">
          {generalMessage}
        </Text>
      ) : null}
    </>
  );

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing[16]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="location-scroll"
    >
      <View style={styles.locationRow}>
        <Icon color={colors.secondary} name="location" />
        <Text style={styles.locationText} testID="location-status">
          {describeLocation(profile)}
        </Text>
      </View>
      <Text style={styles.note}>{PRIVACY_NOTE}</Text>
      <Text style={styles.note}>{RATE_NOTE}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => {
          void handleUseDevice();
        }}
        style={({ pressed }) => [
          styles.saveButton,
          (busy || pressed) && styles.disabled,
        ]}
      >
        <Text style={styles.saveLabel}>
          {locating || (isPending && fromDevice)
            ? 'Finding your location...'
            : 'Use my current location'}
        </Text>
      </Pressable>
      {deviceError ? (
        <Text style={styles.errorText} testID="location-device-error">
          {deviceError}
        </Text>
      ) : null}
      {fromDevice ? outcome : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Or enter an address</Text>
        <Text style={styles.note}>{ADDRESS_HINT}</Text>
        {ADDRESS_FIELDS.map((field) => (
          <FormTextField
            autoCorrect={false}
            {...INPUT_PROPS[field]}
            error={
              missing.includes(field) ? 'Required' : validation.fields[field]
            }
            field={field}
            key={field}
            label={ADDRESS_FIELD_LABELS[field]}
            onChangeText={(value) => handleChange(field, value)}
            value={address[field]}
          />
        ))}
      </View>

      {fromDevice ? null : outcome}

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
          {isPending && !removing && !fromDevice
            ? 'Finding your location...'
            : 'Save location'}
        </Text>
      </Pressable>

      {profile.has_location ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            updateLocation.reset();
            setDeviceError(null);
            setConfirmingRemove(true);
          }}
          style={({ pressed }) => [
            styles.removeButton,
            (busy || pressed) && styles.disabled,
          ]}
        >
          <Text style={styles.removeLabel}>Remove location</Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        confirmLabel="Remove"
        destructive
        error={removing && error ? describeError(error).message : null}
        message="Items you list will no longer show a distance to other members."
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={() => submit('remove')}
        pending={isPending && removing}
        pendingLabel="Removing..."
        title="Remove your location?"
        visible={confirmingRemove}
      />
    </KeyboardAwareScrollView>
  );
}

export function LocationScreen() {
  const { data, error, isPending, isFetching, refetch } = useProfileQuery();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Location' }} />

      <QueryStateView
        error={error}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading profile"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <LocationForm
            profile={data}
            refetchProfile={() => {
              void refetch();
            }}
          />
        ) : null}
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
  errorText: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  locationText: {
    color: colors.text,
    ...typography.body,
  },
  note: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  removeButton: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  removeLabel: {
    color: colors.danger,
    ...typography.buttonLarge,
  },
  result: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  resultText: {
    flex: 1,
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
