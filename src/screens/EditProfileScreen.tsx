import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormTextField } from '../components/FormTextField';
import { ProfilePhotoPicker } from '../components/ProfilePhotoPicker';
import { QueryStateView } from '../components/QueryStateView';
import {
  hasLinkChanges,
  toLinkDrafts,
  toLinkInputs,
  WebLinksEditor,
  type LinkDraft,
} from '../components/WebLinksEditor';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { UPLOAD_ERROR_OVERRIDES } from '../lib/errorCopy';
import {
  NAME_MAX_LENGTH,
  readLinkErrors,
  type LinkFieldErrors,
  type ProfilePhotoChange,
  type ProfileUpdate,
  type UserProfile,
} from '../lib/profile';
import { buildGeneralMessage, readValidationErrors } from '../lib/validation';
import { useProfileQuery } from '../query/useProfileQuery';
import { useUpdateProfileMutation } from '../query/useUpdateProfileMutation';
import { colors, radii, spacing, typography } from '../theme';

const NAME_FIELDS = ['first_name', 'last_name'] as const;

type NameField = (typeof NAME_FIELDS)[number];

const PHOTO_FAILED_FEEDBACK =
  'Your other changes were saved, but the photo could not be uploaded. Please try again.';

type EditProfileFormProps = {
  profile: UserProfile;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
};

function EditProfileForm({
  profile,
  onDirtyChange,
  onSaved,
}: EditProfileFormProps) {
  const updateProfile = useUpdateProfileMutation();
  const [prevProfile, setPrevProfile] = useState(profile);
  const [loaded, setLoaded] = useState(profile);
  const [photo, setPhoto] = useState<ProfilePhotoChange | null>(null);
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [links, setLinks] = useState<LinkDraft[]>(() =>
    toLinkDrafts(profile.web_links),
  );
  const [nameErrors, setNameErrors] = useState<
    Partial<Record<NameField, string>>
  >({});
  // Row keys of the last submission's links, by the index sent.
  const [sentLinkKeys, setSentLinkKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isDirty =
    photo !== null ||
    firstName.trim() !== loaded.first_name ||
    lastName.trim() !== loaded.last_name ||
    hasLinkChanges(links, loaded.web_links);

  const rebase = (next: UserProfile) => {
    setLoaded(next);
    setFirstName(next.first_name);
    setLastName(next.last_name);
    setLinks(toLinkDrafts(next.web_links));
  };

  // A refetch that lands while nothing is edited adopts the fresh values
  // (React's adjust-state-in-render pattern).
  if (profile !== prevProfile) {
    setPrevProfile(profile);

    if (!isDirty) {
      rebase(profile);
    }
  }

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const clearErrors = () => {
    setFeedback(null);
    setNameErrors({});
    updateProfile.reset();
  };

  const handleSave = () => {
    const first = firstName.trim();
    const last = lastName.trim();
    const blank: Partial<Record<NameField, string>> = {};

    if (first === '') blank.first_name = 'Enter your first name';
    if (last === '') blank.last_name = 'Enter your last name';

    clearErrors();
    if (Object.keys(blank).length > 0) {
      setNameErrors(blank);
      return;
    }

    const update: ProfileUpdate = {};

    if (first !== loaded.first_name) update.first_name = first;
    if (last !== loaded.last_name) update.last_name = last;
    if (hasLinkChanges(links, loaded.web_links)) {
      const { inputs, keysBySentIndex } = toLinkInputs(links);

      update.links = inputs;
      setSentLinkKeys(keysBySentIndex);
    }
    if (photo !== null) update.photo = photo;

    updateProfile.mutate(update, {
      onSuccess: (result) => {
        if (result.imageUploadFailed) {
          // The photo stays pending so the member can retry it.
          rebase(result.user);
          setFeedback(PHOTO_FAILED_FEEDBACK);
          return;
        }

        onSaved();
      },
    });
  };

  const { error, isPending, variables } = updateProfile;
  const validation = readValidationErrors(error, NAME_FIELDS);
  const linkErrors = readLinkErrors(error);
  const rowErrors: Record<string, LinkFieldErrors> = {};

  Object.entries(linkErrors.rows).forEach(([index, errors]) => {
    const key = sentLinkKeys[Number(index)];

    if (key !== undefined) rowErrors[key] = errors;
  });

  // Row errors render on their rows, so they need no general fallback copy.
  const showsOnlyRowErrors =
    Object.keys(rowErrors).length > 0 && validation.unknownFields.length === 0;
  const generalMessage =
    linkErrors.general ??
    (showsOnlyRowErrors
      ? null
      : buildGeneralMessage(
          error,
          validation,
          variables?.photo !== undefined ? UPLOAD_ERROR_OVERRIDES : undefined,
        ));
  const saveDisabled = !isDirty || isPending;

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing[16]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="edit-profile-scroll"
    >
      <ProfilePhotoPicker
        change={photo}
        disabled={isPending}
        onChange={(change) => {
          clearErrors();
          setPhoto(change);
        }}
        user={loaded}
      />

      <FormTextField
        autoComplete="given-name"
        editable={!isPending}
        error={nameErrors.first_name ?? validation.fields.first_name}
        field="first_name"
        label="First name"
        maxLength={NAME_MAX_LENGTH}
        onChangeText={(value) => {
          clearErrors();
          setFirstName(value);
        }}
        textContentType="givenName"
        value={firstName}
      />

      <FormTextField
        autoComplete="family-name"
        editable={!isPending}
        error={nameErrors.last_name ?? validation.fields.last_name}
        field="last_name"
        label="Last name"
        maxLength={NAME_MAX_LENGTH}
        onChangeText={(value) => {
          clearErrors();
          setLastName(value);
        }}
        textContentType="familyName"
        value={lastName}
      />

      <WebLinksEditor
        disabled={isPending}
        errors={rowErrors}
        links={links}
        onChange={(next) => {
          clearErrors();
          setLinks(next);
        }}
      />

      {generalMessage ? (
        <Text style={styles.errorText} testID="edit-profile-error">
          {generalMessage}
        </Text>
      ) : null}
      {feedback ? (
        <Text style={styles.feedback} testID="edit-profile-feedback">
          {feedback}
        </Text>
      ) : null}

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
        <Text style={styles.saveLabel}>{isPending ? 'Saving...' : 'Save'}</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

export function EditProfileScreen() {
  const router = useRouter();
  const guard = useDiscardGuard();
  const { data, error, isPending, isFetching, refetch } = useProfileQuery();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Edit profile' }} />

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
          <EditProfileForm
            onDirtyChange={guard.onDirtyChange}
            onSaved={() => {
              guard.allowLeave();
              router.back();
            }}
            profile={data}
          />
        ) : null}
      </QueryStateView>

      <ConfirmDialog
        {...guard.dialog}
        confirmLabel="Discard"
        destructive
        message="Your edits haven't been saved."
        title="Discard changes?"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[16],
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
  feedback: {
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
});
