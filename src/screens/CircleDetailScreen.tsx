import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { describeDistance } from '../components/CircleCard';
import { ErrorState } from '../components/ErrorState';
import { Icon, type IconName } from '../components/Icon';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { MemberRow } from '../components/MemberRow';
import { QueryStateView } from '../components/QueryStateView';
import { describeMembership } from '../lib/circleMembership';
import type { CircleDetail, CircleType } from '../lib/circles';
import { describeError, type ErrorCopyOverrides } from '../lib/errorCopy';
import { isUuid } from '../lib/parse';
import { useCancelJoinRequestMutation } from '../query/useCancelJoinRequestMutation';
import { useCircleDetailQuery } from '../query/useCircleDetailQuery';
import { useJoinCircleMutation } from '../query/useJoinCircleMutation';
import { colors, radii, spacing, typography } from '../theme';

const DEFAULT_TITLE = 'Circle';

/** A secret circle answers 404 for a non-member, so this never says "deleted". */
const UNAVAILABLE_COPY = {
  title: "This circle isn't available",
  message: 'It may be private, or the link may be out of date.',
};

const ERROR_OVERRIDES: ErrorCopyOverrides = {
  NOT_FOUND: {
    ...UNAVAILABLE_COPY,
    canRetry: false,
  },
};

const HIDDEN_MEMBERS_COPY = "Join to see who's here";

const TYPE_CHIP_META: Record<CircleType, { label: string; icon: IconName }> = {
  open: { label: 'Open', icon: 'members' },
  closed: { label: 'Closed', icon: 'lock' },
  secret: { label: 'Secret', icon: 'lock' },
};

function describeMemberCount(memberCount: number): string {
  return `${memberCount} member${memberCount === 1 ? '' : 's'}`;
}

function describeRegional(radiusMiles: number | null): string {
  return radiusMiles === null
    ? 'Regional circle'
    : `Regional circle · ${radiusMiles}-mile radius`;
}

type MembershipBlockProps = {
  circle: CircleDetail;
};

function MembershipBlock({ circle }: MembershipBlockProps) {
  const membership = describeMembership(circle);
  const join = useJoinCircleMutation(circle.id);
  const cancel = useCancelJoinRequestMutation(circle.id);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [message, setMessage] = useState('');

  const isBusy = join.isPending || cancel.isPending;
  const mutationError: unknown = join.isError
    ? join.error
    : cancel.isError
      ? cancel.error
      : null;
  const confirmation = join.isSuccess
    ? join.data.membership_status === 'member'
      ? "You've joined"
      : 'Request sent'
    : cancel.isSuccess
      ? 'Request cancelled'
      : null;

  const primaryLabel =
    membership.action === 'join' && join.isPending
      ? 'Joining...'
      : membership.action === 'cancel' && cancel.isPending
        ? 'Cancelling...'
        : membership.actionLabel;

  const handlePrimaryPress = () => {
    if (membership.action === 'join') {
      join.mutate(undefined);
      return;
    }

    if (membership.action === 'request') {
      setIsSheetOpen(true);
      return;
    }

    if (membership.action === 'cancel') {
      cancel.mutate();
    }
  };

  const handleSendRequest = () => {
    join.mutate(message.trim() || undefined, {
      onSuccess: () => {
        setIsSheetOpen(false);
      },
    });
  };

  return (
    <View style={styles.membershipCard} testID="membership-block">
      <Text style={styles.membershipLabel}>{membership.label}</Text>
      {membership.note ? (
        <Text style={styles.membershipNote}>{membership.note}</Text>
      ) : null}

      {primaryLabel && !isSheetOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isBusy, disabled: isBusy }}
          disabled={isBusy}
          onPress={handlePrimaryPress}
          style={({ pressed }) => [
            styles.actionButton,
            (isBusy || pressed) && styles.pressed,
          ]}
          testID="membership-action"
        >
          <Text style={styles.actionButtonLabel}>{primaryLabel}</Text>
        </Pressable>
      ) : null}

      {isSheetOpen ? (
        <View style={styles.sheet} testID="join-request-sheet">
          <Text style={styles.sheetTitle}>
            Add a message for the admins (optional)
          </Text>
          <TextInput
            accessibilityLabel="Message to the admins"
            maxLength={500}
            multiline
            onChangeText={setMessage}
            placeholder="Tell them why you'd like to join"
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.messageInput}
            value={message}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              busy: join.isPending,
              disabled: join.isPending,
            }}
            disabled={join.isPending}
            onPress={handleSendRequest}
            style={({ pressed }) => [
              styles.actionButton,
              (join.isPending || pressed) && styles.pressed,
            ]}
          >
            <Text style={styles.actionButtonLabel}>
              {join.isPending ? 'Sending...' : 'Send request'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsSheetOpen(false);
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {mutationError ? (
        <Text style={styles.feedbackError} testID="membership-feedback">
          {describeError(mutationError).message}
        </Text>
      ) : confirmation ? (
        <Text style={styles.feedback} testID="membership-feedback">
          {confirmation}
        </Text>
      ) : null}
    </View>
  );
}

type MembersSectionProps = {
  circle: CircleDetail;
};

function MembersSection({ circle }: MembersSectionProps) {
  // Member paging is deferred, so the footer says how much is on screen.
  if (!circle.can_view_members) {
    if (circle.circle_type !== 'closed') {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Members</Text>
        <Text style={styles.hiddenMembers}>{HIDDEN_MEMBERS_COPY}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Members</Text>
      {circle.members.map((member) => (
        <MemberRow key={member.user.id} member={member} />
      ))}
      {circle.members_total > circle.members.length ? (
        <Text style={styles.membersFooter}>
          {`Showing ${circle.members.length} of ${circle.members_total} members`}
        </Text>
      ) : null}
    </View>
  );
}

type CircleDetailBodyProps = {
  circle: CircleDetail;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function CircleDetailBody({
  circle,
  isRefreshing,
  onRefresh,
}: CircleDetailBodyProps) {
  const typeChip = circle.circle_type
    ? TYPE_CHIP_META[circle.circle_type]
    : null;
  const description = circle.description?.trim() || null;

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
      testID="circle-detail-scroll"
    >
      <View style={styles.imageBox}>
        {circle.image_url ? (
          <Image
            accessibilityLabel={circle.name}
            contentFit="cover"
            source={{ uri: circle.image_url }}
            style={styles.image}
            testID="circle-detail-image"
            transition={150}
          />
        ) : (
          <ImagePlaceholder />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.name}>{circle.name}</Text>

        {typeChip ? (
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Icon color={colors.secondary} name={typeChip.icon} size={12} />
              <Text style={styles.chipText}>{typeChip.label}</Text>
            </View>
          </View>
        ) : null}

        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Icon color={colors.secondary} name="members" size={14} />
          <Text style={styles.meta}>
            {describeMemberCount(circle.member_count)}
          </Text>
        </View>

        {circle.distance_miles !== null ? (
          <View style={styles.metaRow}>
            <Icon color={colors.secondary} name="location" size={14} />
            <Text style={styles.meta}>
              {describeDistance(circle.distance_miles)}
            </Text>
          </View>
        ) : null}

        {circle.is_regional ? (
          <Text style={styles.meta}>
            {describeRegional(circle.regional_radius_miles)}
          </Text>
        ) : null}
      </View>

      <MembershipBlock circle={circle} />
      <MembersSection circle={circle} />
    </ScrollView>
  );
}

export function CircleDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, error, isPending, isFetching, isRefetching, refetch } =
    useCircleDetailQuery(rawId);

  if (!isUuid(rawId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: DEFAULT_TITLE }} />
        <ErrorState {...UNAVAILABLE_COPY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: data?.name ?? DEFAULT_TITLE }} />

      <QueryStateView
        error={error}
        errorOverrides={ERROR_OVERRIDES}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading circle"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <CircleDetailBody
            circle={data}
            isRefreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
          />
        ) : null}
      </QueryStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  actionButtonLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  chipText: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  content: {
    paddingBottom: spacing[24],
  },
  description: {
    color: colors.text,
    ...typography.body,
  },
  feedback: {
    color: colors.success,
    ...typography.itemMeta,
  },
  feedbackError: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  hiddenMembers: {
    color: colors.secondary,
    ...typography.body,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageBox: {
    backgroundColor: colors.surface,
    height: 160,
    overflow: 'hidden',
    width: '100%',
  },
  membersFooter: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  membershipCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[8],
    marginHorizontal: spacing[16],
    marginTop: spacing[16],
    padding: spacing[16],
  },
  membershipLabel: {
    color: colors.text,
    ...typography.label,
  },
  membershipNote: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  messageInput: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    minHeight: 80,
    padding: spacing[12],
    textAlignVertical: 'top',
  },
  meta: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  name: {
    color: colors.text,
    ...typography.value,
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  secondaryButtonLabel: {
    color: colors.text,
    ...typography.buttonSmall,
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
  sheet: {
    gap: spacing[8],
  },
  sheetTitle: {
    color: colors.text,
    ...typography.itemMeta,
  },
});
