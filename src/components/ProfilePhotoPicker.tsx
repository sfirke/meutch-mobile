import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  pickFromLibrary,
  takePhoto,
  type PickResult,
} from '../lib/photoPicker';
import type { ProfilePhotoChange } from '../lib/profile';
import { colors, radii, spacing, typography } from '../theme';
import { Avatar, type AvatarUser } from './Avatar';
import { OptionSheet, type OptionSheetOption } from './OptionSheet';

export type ProfilePhotoPickerProps = {
  user: AvatarUser;
  /** `null` means unchanged. */
  change: ProfilePhotoChange | null;
  onChange: (change: ProfilePhotoChange | null) => void;
  disabled?: boolean;
};

type Source = 'camera' | 'library';
type SheetValue = Source | 'remove' | 'none';

const AVATAR_SIZE = 96;
// iOS can't present the picker while the sheet's modal is still dismissing.
const PICKER_DELAY_MS = Platform.OS === 'ios' ? 350 : 0;

const SOURCE_OPTIONS: OptionSheetOption<SheetValue>[] = [
  { value: 'camera', label: 'Take photo' },
  { value: 'library', label: 'Choose from library' },
];
const REMOVE_OPTION: OptionSheetOption<SheetValue> = {
  value: 'remove',
  label: 'Remove photo',
};

function displayedUser(
  user: AvatarUser,
  change: ProfilePhotoChange | null,
): AvatarUser {
  if (change?.kind === 'new') return { ...user, profile_image_url: change.uri };
  if (change?.kind === 'remove') return { ...user, profile_image_url: null };
  return user;
}

/** Controlled profile photo field: pick a new photo or remove the saved one. */
export function ProfilePhotoPicker({
  user,
  change,
  onChange,
  disabled = false,
}: ProfilePhotoPickerProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState<Source | null>(null);

  const hasSaved = Boolean(user.profile_image_url);
  const canRemove =
    change?.kind === 'new' || (hasSaved && change?.kind !== 'remove');
  const options = canRemove
    ? [...SOURCE_OPTIONS, REMOVE_OPTION]
    : SOURCE_OPTIONS;

  const pick = async (source: Source) => {
    setDenied(null);
    setBusy(true);
    try {
      const result: PickResult =
        source === 'camera' ? await takePhoto() : await pickFromLibrary(1);

      if (result.kind === 'denied') {
        setDenied(result.source);
      } else if (result.kind === 'picked' && result.photos.length > 0) {
        onChange({ kind: 'new', uri: result.photos[0].uri });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = (value: SheetValue) => {
    if (value === 'none') return;
    if (value === 'remove') {
      setDenied(null);
      // Dropping a pending photo with nothing saved leaves the profile as is.
      onChange(hasSaved ? { kind: 'remove' } : null);
      return;
    }
    setTimeout(() => {
      void pick(value);
    }, PICKER_DELAY_MS);
  };

  const inactive = disabled || busy;

  return (
    <View style={styles.root} testID="profile-photo-picker">
      <View style={styles.avatar}>
        <Avatar
          size={AVATAR_SIZE}
          testID="profile-photo-avatar"
          user={displayedUser(user, change)}
        />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator
              color={colors.primaryDark}
              testID="profile-photo-busy"
            />
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy }}
        disabled={inactive}
        hitSlop={6}
        onPress={() => setSheetVisible(true)}
        style={({ pressed }) => (inactive || pressed) && styles.dimmed}
        testID="profile-photo-change"
      >
        <Text style={styles.changeText}>Change photo</Text>
      </Pressable>

      {denied ? (
        <View style={styles.denied} testID="profile-photo-permission-denied">
          <Text style={styles.deniedText}>
            {denied === 'camera'
              ? 'Meutch needs camera access to take photos.'
              : 'Meutch needs photo library access to choose a photo.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Linking.openSettings();
            }}
            testID="profile-photo-open-settings"
          >
            <Text style={styles.settingsLink}>Open settings</Text>
          </Pressable>
        </View>
      ) : null}

      <OptionSheet<SheetValue>
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelect}
        options={options}
        title="Profile photo"
        value="none"
        visible={sheetVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing[8],
  },
  avatar: {
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  busy: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    ...StyleSheet.absoluteFill,
  },
  changeText: {
    ...typography.buttonSmall,
    color: colors.primaryDark,
  },
  dimmed: {
    opacity: 0.5,
  },
  denied: {
    alignSelf: 'stretch',
    backgroundColor: colors.errorSurface,
    borderRadius: radii.sm,
    gap: spacing[4],
    padding: spacing[12],
  },
  deniedText: {
    color: colors.errorText,
    ...typography.meta,
  },
  settingsLink: {
    ...typography.meta,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
