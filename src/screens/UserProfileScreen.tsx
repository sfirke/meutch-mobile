import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ErrorState } from '../components/ErrorState';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileLinksSection } from '../components/ProfileLinksSection';
import { QueryStateView } from '../components/QueryStateView';
import type { ErrorCopyOverrides } from '../lib/errorCopy';
import { isUuid } from '../lib/parse';
import type {
  SharedCircle,
  UserProfile,
  UserProfileAccessReason,
} from '../lib/users';
import { useUserProfileQuery } from '../query/useUserProfileQuery';
import { colors, radii, spacing, typography } from '../theme';

const DEFAULT_TITLE = 'Profile';

const MISSING_PROFILE_COPY = {
  title: 'Profile not found',
  message: "This profile isn't available.",
};

/** The backend 404s both a denied and an unknown id, so it never confirms one exists. */
const ERROR_OVERRIDES: ErrorCopyOverrides = {
  NOT_FOUND: {
    ...MISSING_PROFILE_COPY,
    canRetry: false,
  },
};

// Matches the web page's copy for the two reasons worth explaining; self,
// admin, and circle access need no justification.
function describeAccessReason(
  reason: UserProfileAccessReason,
  firstName: string,
): string | null {
  switch (reason) {
    case 'conversation':
      return `You can view this profile because you and ${firstName} have a message thread.`;
    case 'join_request':
      return `You can view this profile because ${firstName} has asked to join a circle you administer.`;
    default:
      return null;
  }
}

type SharedCirclesSectionProps = {
  circles: SharedCircle[];
  onPress: (circleId: string) => void;
};

function SharedCirclesSection({ circles, onPress }: SharedCirclesSectionProps) {
  if (circles.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Shared circles</Text>
      {circles.map((circle) => (
        <Pressable
          accessibilityLabel={circle.name}
          accessibilityRole="button"
          key={circle.id}
          onPress={() => onPress(circle.id)}
          style={({ pressed }) => [styles.circleRow, pressed && styles.pressed]}
        >
          <View style={styles.circleThumbBox}>
            {circle.image_url ? (
              <Image
                accessibilityLabel={circle.name}
                contentFit="cover"
                source={{ uri: circle.image_url }}
                style={styles.circleThumb}
                testID="shared-circle-image"
              />
            ) : (
              <ImagePlaceholder style={styles.circleThumb} />
            )}
          </View>
          <Text style={styles.circleName}>{circle.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type UserProfileBodyProps = {
  profile: UserProfile;
  sharedCircles: SharedCircle[];
  accessReason: UserProfileAccessReason;
  isRefreshing: boolean;
  onRefresh: () => void;
  onPressCircle: (circleId: string) => void;
};

function UserProfileBody({
  profile,
  sharedCircles,
  accessReason,
  isRefreshing,
  onRefresh,
  onPressCircle,
}: UserProfileBodyProps) {
  const aboutMe = profile.about_me?.trim() || null;
  const accessNote = describeAccessReason(accessReason, profile.first_name);

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing[16]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={colors.primaryDark}
        />
      }
      testID="user-profile-scroll"
    >
      <ProfileHeader user={profile}>
        {accessNote ? <Text style={styles.note}>{accessNote}</Text> : null}
      </ProfileHeader>

      {aboutMe ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About me</Text>
          <Text style={styles.aboutText}>{aboutMe}</Text>
        </View>
      ) : null}

      {profile.web_links.length > 0 ? (
        <View style={styles.section}>
          <ProfileLinksSection links={profile.web_links} />
        </View>
      ) : null}

      <SharedCirclesSection circles={sharedCircles} onPress={onPressCircle} />
    </KeyboardAwareScrollView>
  );
}

export function UserProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { data, error, isPending, isFetching, isRefetching, refetch } =
    useUserProfileQuery(rawId);
  const title = data ? `${data.user.first_name}'s profile` : DEFAULT_TITLE;

  if (!isUuid(rawId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: DEFAULT_TITLE }} />
        <ErrorState {...MISSING_PROFILE_COPY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />

      <QueryStateView
        error={error}
        errorOverrides={ERROR_OVERRIDES}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading profile"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <UserProfileBody
            accessReason={data.access_reason}
            isRefreshing={isRefetching}
            onPressCircle={(circleId) => {
              router.push(`/circle/${circleId}`);
            }}
            onRefresh={() => {
              void refetch();
            }}
            profile={data.user}
            sharedCircles={data.shared_circles}
          />
        ) : null}
      </QueryStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  aboutText: {
    color: colors.text,
    ...typography.body,
  },
  circleName: {
    color: colors.text,
    flex: 1,
    ...typography.itemName,
  },
  circleRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[12],
  },
  circleThumb: {
    height: '100%',
    width: '100%',
  },
  circleThumbBox: {
    borderRadius: radii.sm,
    height: 44,
    overflow: 'hidden',
    width: 44,
  },
  content: {
    paddingBottom: spacing[24],
  },
  note: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  pressed: {
    opacity: 0.75,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: spacing[10],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
  },
});
