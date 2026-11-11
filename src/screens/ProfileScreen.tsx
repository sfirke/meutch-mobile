import { useRouter } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '../components/Icon';
import { LinkedText } from '../components/LinkedText';
import { NavRow } from '../components/NavRow';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileLinksSection } from '../components/ProfileLinksSection';
import { QueryStateView } from '../components/QueryStateView';
import { runtimeConfig } from '../config/env';
import { RECOVERY_ERROR_OVERRIDES } from '../lib/accountRecovery';
import { formatMonthYear } from '../lib/dates';
import { describeError } from '../lib/errorCopy';
import type { UserProfile } from '../lib/profile';
import { useProfileQuery } from '../query/useProfileQuery';
import { useResendConfirmationMutation } from '../query/useResendConfirmationMutation';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

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
  onEdit: () => void;
};

/** Read-only; About me is edited with the rest of the profile. */
function AboutMeSection({ aboutMe, onEdit }: AboutMeSectionProps) {
  const text = aboutMe?.trim();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>About me</Text>
      {text ? (
        <LinkedText style={styles.aboutText} text={text} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.prompt, pressed && styles.dim]}
        >
          <Text style={styles.textButtonLabel}>
            Add a few words about yourself
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function ResendConfirmation({ email }: { email: string }) {
  const resend = useResendConfirmationMutation();

  if (resend.isSuccess) {
    return <Text style={styles.note}>{resend.data.message}</Text>;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: resend.isPending }}
        disabled={resend.isPending}
        onPress={() => resend.mutate(email)}
        style={({ pressed }) => [
          styles.textButton,
          (resend.isPending || pressed) && styles.dim,
        ]}
      >
        <Text style={styles.textButtonLabel}>
          {resend.isPending ? 'Sending...' : 'Resend confirmation email'}
        </Text>
      </Pressable>
      {resend.error ? (
        <Text style={styles.inlineError}>
          {describeError(resend.error, RECOVERY_ERROR_OVERRIDES).message}
        </Text>
      ) : null}
    </>
  );
}

type ProfileBodyProps = {
  profile: UserProfile;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function ProfileBody({ profile, isRefreshing, onRefresh }: ProfileBodyProps) {
  const router = useRouter();
  const memberSince = formatMonthYear(profile.created_at);

  return (
    <ScrollView
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
            <>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Unconfirmed</Text>
              </View>
              <ResendConfirmation email={profile.email} />
            </>
          )}
        </View>
        {memberSince ? (
          <Text style={styles.note}>{`Member since ${memberSince}`}</Text>
        ) : null}
        <View style={styles.rowList}>
          <NavRow
            icon="pen"
            label="Edit profile"
            onPress={() => router.push('/profile/edit')}
          />
        </View>
      </ProfileHeader>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>My activity</Text>
        <View style={styles.rowList}>
          <NavRow
            icon="image"
            label="My items"
            onPress={() => router.push('/profile/items')}
          />
          <NavRow
            icon="loan"
            label="My loans"
            onPress={() => router.push('/profile/loans')}
          />
          <NavRow
            icon="request"
            label="My requests"
            onPress={() => router.push('/profile/requests')}
          />
        </View>
      </View>

      <AboutMeSection
        aboutMe={profile.about_me}
        onEdit={() => router.push('/profile/edit')}
      />

      <View style={styles.section}>
        <ProfileLinksSection links={profile.web_links} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.locationRow}>
          <Icon color={colors.secondary} name="location" />
          <Text style={styles.locationText}>{describeLocation(profile)}</Text>
        </View>
        <View style={styles.rowList}>
          <NavRow
            icon="location"
            label={profile.has_location ? 'Update location' : 'Add a location'}
            onPress={() => router.push('/profile/location')}
          />
        </View>
      </View>
    </ScrollView>
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
        <NavRow
          icon="settings"
          label="Settings"
          onPress={() => router.push('/profile/settings')}
        />

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
  prompt: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[4],
  },
  queryArea: {
    flex: 1,
  },
  rowList: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
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
