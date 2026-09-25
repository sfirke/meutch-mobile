import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '../components/Icon';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileLinksSection } from '../components/ProfileLinksSection';
import { QueryStateView } from '../components/QueryStateView';
import { runtimeConfig } from '../config/env';
import { isApiError } from '../lib/api';
import { formatMonthYear } from '../lib/dates';
import { describeError } from '../lib/errorCopy';
import type { UserProfile } from '../lib/profile';
import { webOnlyNote } from '../lib/webOnly';
import { useProfileQuery } from '../query/useProfileQuery';
import { useUpdateAboutMeMutation } from '../query/useUpdateAboutMeMutation';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

const ABOUT_ME_LIMIT = 500;
/** The counter only appears once the limit is close enough to matter. */
const COUNTER_THRESHOLD = 450;
const ABOUT_ME_PROMPT = 'Add a few words about yourself';
const LINKS_NOTE = webOnlyNote('Edit links and photo');
const LOCATION_NOTE = webOnlyNote('Update your location');

/** Photo upload and link editing stay on the web, so only `about_me` writes. */
function describeAboutMeError(error: unknown): string {
  if (isApiError(error)) {
    const messages = error.details?.about_me;

    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      return messages[0];
    }
  }

  return describeError(error).message;
}

function describeLocation(profile: UserProfile): string {
  if (profile.has_location) {
    return 'Location set';
  }

  if (profile.geocoding_failed) {
    return "We couldn't determine your location";
  }

  return 'No location set';
}

type AboutMeSectionProps = {
  aboutMe: string | null;
};

// A non-null draft means the editor is open, so one piece of state covers
// both the text and the mode.
function AboutMeSection({ aboutMe }: AboutMeSectionProps) {
  const updateAboutMe = useUpdateAboutMeMutation();
  const [draft, setDraft] = useState<string | null>(null);
  const saved = aboutMe ?? '';

  if (draft === null) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>About me</Text>
          <Pressable
            accessibilityLabel="Edit about me"
            accessibilityRole="button"
            onPress={() => {
              updateAboutMe.reset();
              setDraft(saved);
            }}
            style={({ pressed }) => [styles.textButton, pressed && styles.dim]}
          >
            <Text style={styles.textButtonLabel}>Edit</Text>
          </Pressable>
        </View>
        <Text style={saved ? styles.aboutText : styles.aboutPrompt}>
          {saved || ABOUT_ME_PROMPT}
        </Text>
      </View>
    );
  }

  const isUnchanged = draft.trim() === saved.trim();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>About me</Text>
      <TextInput
        accessibilityLabel="About me"
        maxLength={ABOUT_ME_LIMIT}
        multiline
        onChangeText={setDraft}
        placeholder={ABOUT_ME_PROMPT}
        placeholderTextColor={colors.inputPlaceholder}
        style={styles.aboutInput}
        value={draft}
      />
      {draft.length > COUNTER_THRESHOLD ? (
        <Text style={styles.counter}>
          {draft.length}/{ABOUT_ME_LIMIT}
        </Text>
      ) : null}
      {updateAboutMe.error ? (
        <Text style={styles.inlineError} testID="about-me-error">
          {describeAboutMeError(updateAboutMe.error)}
        </Text>
      ) : null}
      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: isUnchanged || updateAboutMe.isPending,
          }}
          disabled={isUnchanged || updateAboutMe.isPending}
          onPress={() => {
            updateAboutMe.mutate(draft.trim(), {
              // The cache update re-renders the saved text underneath.
              onSuccess: () => setDraft(null),
            });
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            (isUnchanged || updateAboutMe.isPending || pressed) && styles.dim,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {updateAboutMe.isPending ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            updateAboutMe.reset();
            setDraft(null);
          }}
          style={({ pressed }) => [styles.textButton, pressed && styles.dim]}
        >
          <Text style={styles.textButtonLabel}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

type ProfileBodyProps = {
  profile: UserProfile;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function ProfileBody({ profile, isRefreshing, onRefresh }: ProfileBodyProps) {
  const memberSince = formatMonthYear(profile.created_at);

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing[16]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={colors.primaryDark}
        />
      }
      testID="profile-scroll"
    >
      <ProfileHeader user={profile}>
        <View style={styles.emailRow}>
          <Text style={styles.email}>{profile.email}</Text>
          {profile.email_confirmed ? null : (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Unconfirmed</Text>
            </View>
          )}
        </View>
        {memberSince ? (
          <Text style={styles.note}>{`Member since ${memberSince}`}</Text>
        ) : null}
      </ProfileHeader>

      <AboutMeSection aboutMe={profile.about_me} />

      <View style={styles.section}>
        <ProfileLinksSection links={profile.web_links} />
        <Text style={styles.note}>{LINKS_NOTE}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.locationRow}>
          <Icon color={colors.secondary} name="location" />
          <Text style={styles.locationText}>{describeLocation(profile)}</Text>
        </View>
        <Text style={styles.note}>{LOCATION_NOTE}</Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { signOut, status } = useSession();
  const isSigningOut = status === 'signing-out';
  const { data, error, isPending, isFetching, isRefetching, refetch } =
    useProfileQuery();

  return (
    <View style={styles.screen}>
      <View style={styles.queryArea}>
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
            <ProfileBody
              isRefreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              profile={data}
            />
          ) : null}
        </QueryStateView>
      </View>

      {/* Account actions sit outside the query so a failed profile load still
          leaves a way into settings and out of the session. */}
      <View style={styles.account}>
        <Pressable
          accessibilityLabel="Settings"
          accessibilityRole="button"
          onPress={() => router.push('/profile/settings')}
          style={({ pressed }) => [styles.settingsRow, pressed && styles.dim]}
        >
          <Icon color={colors.secondary} name="settings" />
          <Text style={styles.settingsLabel}>Settings</Text>
          <Icon color={colors.secondary} name="chevron" />
        </Pressable>

        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={() => {
            void signOut();
          }}
          style={({ pressed }) => [
            styles.signOutButton,
            (isSigningOut || pressed) && styles.dim,
          ]}
        >
          <Text style={styles.signOutLabel}>
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </Text>
        </Pressable>

        {runtimeConfig.environmentName === 'production' ? null : (
          <Text style={styles.footer} testID="environment-footer">
            {`Environment: ${runtimeConfig.environmentName}`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aboutInput: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    minHeight: 96,
    padding: spacing[12],
    textAlignVertical: 'top',
    ...typography.body,
  },
  aboutPrompt: {
    color: colors.secondary,
    ...typography.body,
  },
  aboutText: {
    color: colors.text,
    ...typography.body,
  },
  account: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
  },
  chip: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  chipText: {
    color: colors.errorLabel,
    ...typography.label,
    fontSize: 11,
  },
  content: {
    paddingBottom: spacing[24],
  },
  counter: {
    color: colors.secondary,
    textAlign: 'right',
    ...typography.itemMeta,
  },
  dim: {
    opacity: 0.6,
  },
  email: {
    color: colors.secondary,
    ...typography.meta,
  },
  emailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  footer: {
    color: colors.secondary,
    textAlign: 'center',
    ...typography.itemMeta,
  },
  inlineError: {
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
  primaryButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[10],
  },
  primaryButtonLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonSmall,
  },
  queryArea: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: spacing[10],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[18],
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
  },
  settingsLabel: {
    color: colors.text,
    flex: 1,
    ...typography.body,
  },
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing[12],
  },
  signOutLabel: {
    color: colors.text,
    ...typography.buttonLarge,
  },
  textButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  textButtonLabel: {
    color: colors.primaryDark,
    ...typography.buttonSmall,
  },
});
