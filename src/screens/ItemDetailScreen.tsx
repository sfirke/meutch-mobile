import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { Icon, type IconName } from '../components/Icon';
import { ImageCarousel } from '../components/ImageCarousel';
import {
  getAvailabilityBadge,
  type AvailabilityBadgeTone,
} from '../components/itemBadge';
import { LinkedText } from '../components/LinkedText';
import { MemberPressable } from '../components/MemberPressable';
import { MessageComposer } from '../components/MessageComposer';
import { QueryStateView } from '../components/QueryStateView';
import { formatCalendarDate } from '../lib/dates';
import { describeError, type ErrorCopyOverrides } from '../lib/errorCopy';
import type { ItemDetail, ItemViewerState } from '../lib/items';
import { DELETED_USER_NAME } from '../lib/parse';
import { WEB_SITE } from '../lib/webOnly';
import { useDeleteItemMutation } from '../query/useDeleteItemMutation';
import { isItemId, useItemDetailQuery } from '../query/useItemDetailQuery';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

const DEFAULT_TITLE = 'Item';

const MISSING_ITEM_COPY = {
  title: 'This item is gone',
  message: 'It may have been given away or removed.',
};

/**
 * The backend answers 404 for a claimed giveaway the viewer is not party to and
 * 403 for every other denial, so the two need copy a member can act on.
 */
const ERROR_OVERRIDES: ErrorCopyOverrides = {
  FORBIDDEN: {
    title: "You can't see this item",
    message: "It's shared with circles you're not part of.",
    canRetry: false,
  },
  NOT_FOUND: {
    ...MISSING_ITEM_COPY,
    canRetry: false,
  },
};

const badgeToneColors: Record<AvailabilityBadgeTone, string> = {
  success: colors.success,
  warning: colors.warning,
};

type StatusBanner = {
  label: string;
  tone: AvailabilityBadgeTone;
  detail: string | null;
  icon: IconName | null;
};

type Affordance = {
  /** Rendered disabled: borrow requests still live on the website. */
  actionLabel: string | null;
  notes: string[];
};

const WEB_ONLY_NOTE = 'For now, use meutch.com.';

const GIVEAWAY_PLACEHOLDER =
  "Hi! I'm interested in this item. When could I pick it up?";
const LOAN_PLACEHOLDER =
  'What do you want to know about the item or lending it?';
const GIVEAWAY_HINT =
  'Ask a question or express your interest. The owner can pick anyone who sends them a message.';

/**
 * The web page shows the recipient's name to the owner only, and the borrower's
 * name to nobody, so neither identity is rendered outside those cases here.
 */
function buildStatusBanner(
  item: ItemDetail,
  viewer: ItemViewerState,
  isRecipient: boolean,
): StatusBanner {
  const badge = getAvailabilityBadge(item);

  if (!badge) {
    return { label: 'Available', tone: 'success', detail: null, icon: null };
  }

  if (badge.label === 'Borrowed') {
    const dueDate = item.current_loan
      ? formatCalendarDate(item.current_loan.end_date)
      : null;

    if (viewer.is_active_borrower) {
      return {
        ...badge,
        detail: dueDate
          ? `You're borrowing this until ${dueDate}.`
          : "You're borrowing this item.",
      };
    }

    return { ...badge, detail: dueDate ? `Due back ${dueDate}.` : null };
  }

  if (badge.label === 'Pending Pickup') {
    if (viewer.is_owner) {
      return {
        ...badge,
        detail: item.claimed_by
          ? `Going to ${item.claimed_by.full_name}.`
          : 'Waiting on handoff.',
      };
    }

    return {
      ...badge,
      detail: isRecipient
        ? "You've been selected for this giveaway."
        : 'Pending pickup by another member.',
    };
  }

  if (viewer.is_owner) {
    return {
      ...badge,
      detail: item.claimed_by
        ? `Given to ${item.claimed_by.full_name}.`
        : 'Marked as rehomed.',
    };
  }

  return {
    ...badge,
    detail: isRecipient
      ? 'You received this giveaway.'
      : 'This giveaway has found a new home.',
  };
}

/** Owner-only: the API nulls `interested_count` for everyone else. */
function describeInterest(count: number): string {
  if (count === 0) {
    return 'No one has expressed interest yet.';
  }

  return count === 1
    ? '1 member has expressed interest.'
    : `${count} members have expressed interest.`;
}

/**
 * Mirrors which primary action the web page offers. Messaging the owner is
 * rendered separately; expressing interest on a giveaway happens through it.
 */
function describeAffordance(
  item: ItemDetail,
  viewer: ItemViewerState,
  isRecipient: boolean,
): Affordance {
  if (viewer.is_owner) {
    const notes: string[] = [];

    if (item.is_giveaway && item.interested_count !== null) {
      notes.push(describeInterest(item.interested_count));
    }

    return { actionLabel: null, notes };
  }

  if (viewer.is_active_borrower) {
    return {
      actionLabel: null,
      notes: [`Returns are on ${WEB_SITE} for now.`],
    };
  }

  if (!item.is_giveaway && !viewer.shares_circle_with_owner) {
    return {
      actionLabel: null,
      notes: [
        "You don't share a circle with this owner.",
        'Requests go through people who share a circle.',
      ],
    };
  }

  if (item.is_giveaway) {
    if (isRecipient) {
      return {
        actionLabel: null,
        notes: ['The owner will arrange pickup with you.'],
      };
    }

    if (!item.available) {
      return {
        actionLabel: null,
        notes: ['This giveaway is no longer open.'],
      };
    }

    if (item.viewer_interest_status === 'active') {
      return {
        actionLabel: null,
        notes: ["You've expressed interest. The owner picks who receives it."],
      };
    }

    return { actionLabel: null, notes: [] };
  }

  if (!item.available) {
    return {
      actionLabel: null,
      notes: ['This item is out on loan right now.'],
    };
  }

  return {
    actionLabel: 'Request to Borrow',
    notes: [`Borrow requests are coming to the app soon. ${WEB_ONLY_NOTE}`],
  };
}

function OwnerActions({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const deleteItem = useDeleteItemMutation();

  const close = () => {
    setConfirming(false);
    deleteItem.reset();
  };

  const confirm = () => {
    deleteItem.mutate(
      { id: itemId },
      {
        onSuccess: () => {
          setConfirming(false);

          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        },
      },
    );
  };

  return (
    <View style={styles.ownerActions}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/item/${itemId}/edit`)}
        style={styles.ownerButton}
        testID="item-edit"
      >
        <Icon color={colors.text} name="pen" size={14} />
        <Text style={styles.ownerButtonLabel}>Edit</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => setConfirming(true)}
        style={[styles.ownerButton, styles.deleteButton]}
        testID="item-delete"
      >
        <Icon color={colors.danger} name="trash" size={14} />
        <Text style={[styles.ownerButtonLabel, styles.deleteLabel]}>
          Delete
        </Text>
      </Pressable>
      <ConfirmDialog
        confirmLabel="Delete"
        destructive
        error={
          deleteItem.isError ? describeError(deleteItem.error).message : null
        }
        message="This can't be undone."
        onCancel={close}
        onConfirm={confirm}
        pending={deleteItem.isPending}
        pendingLabel="Deleting..."
        title="Delete this item?"
        visible={confirming}
      />
    </View>
  );
}

type ItemDetailBodyProps = {
  item: ItemDetail;
  viewer: ItemViewerState;
  isRecipient: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenThread: (messageId: string) => void;
};

function ItemDetailBody({
  item,
  viewer,
  isRecipient,
  isRefreshing,
  onRefresh,
  onOpenThread,
}: ItemDetailBodyProps) {
  const banner = buildStatusBanner(item, viewer, isRecipient);
  const affordance = describeAffordance(item, viewer, isRecipient);
  const description = item.description?.trim() || null;
  const subject = useMemo(() => ({ itemId: item.id }), [item.id]);
  // Availability and circles are left to the server, which 400s or 403s.
  const recipient = viewer.is_owner ? null : item.owner;

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
      testID="item-detail-scroll"
    >
      <ImageCarousel images={item.images} itemName={item.name} />

      <View style={styles.section}>
        {item.is_giveaway ? (
          <View style={styles.giveawayChip}>
            <Text style={styles.giveawayText}>GIVEAWAY</Text>
          </View>
        ) : null}

        <Text style={styles.name}>{item.name}</Text>

        <View
          style={[styles.banner, { borderColor: badgeToneColors[banner.tone] }]}
          testID="item-status-banner"
        >
          {banner.icon ? (
            <Icon
              color={badgeToneColors[banner.tone]}
              name={banner.icon}
              size={18}
            />
          ) : (
            <View
              style={[
                styles.bannerDot,
                { backgroundColor: badgeToneColors[banner.tone] },
              ]}
            />
          )}
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerLabel}>{banner.label}</Text>
            {banner.detail ? (
              <Text style={styles.bannerDetail}>{banner.detail}</Text>
            ) : null}
          </View>
        </View>

        {description ? (
          <LinkedText style={styles.description} text={description} />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Shared by</Text>
        {item.owner ? (
          <MemberPressable user={item.owner}>
            <View style={styles.ownerRow}>
              <Avatar testID="item-owner-avatar" user={item.owner} />
              <Text style={styles.ownerName}>{item.owner.full_name}</Text>
            </View>
          </MemberPressable>
        ) : (
          <View style={styles.ownerRow}>
            <Avatar testID="item-owner-avatar" user={item.owner} />
            <Text style={styles.ownerName}>{DELETED_USER_NAME}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Icon color={colors.secondary} name="category" size={12} />
            <Text style={styles.chipText}>{item.category.name}</Text>
          </View>
        </View>
      </View>

      {item.tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.chipRow}>
            {item.tags.map((tag) => (
              <View key={tag.id} style={styles.chip}>
                <Text style={styles.chipText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {recipient ||
      viewer.is_owner ||
      affordance.actionLabel ||
      affordance.notes.length > 0 ? (
        <View style={styles.actionCard} testID="item-affordance">
          {recipient ? (
            <MessageComposer
              errorTestID="item-send-error"
              hint={item.is_giveaway ? GIVEAWAY_HINT : undefined}
              onSent={onOpenThread}
              placeholder={
                item.is_giveaway ? GIVEAWAY_PLACEHOLDER : LOAN_PLACEHOLDER
              }
              recipientName={recipient.first_name}
              subject={subject}
              testID="item-composer"
            />
          ) : null}

          {affordance.actionLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              disabled
              style={styles.actionButton}
              testID="item-primary-action"
            >
              <Text style={styles.actionButtonLabel}>
                {affordance.actionLabel}
              </Text>
            </Pressable>
          ) : null}

          {affordance.notes.map((note) => (
            <Text key={note} style={styles.actionNote}>
              {note}
            </Text>
          ))}

          {viewer.is_owner ? <OwnerActions itemId={item.id} /> : null}
        </View>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

export function ItemDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useSession();
  const { data, error, isPending, isFetching, isRefetching, refetch } =
    useItemDetailQuery(rawId);

  const handleOpenThread = useCallback(
    (messageId: string) => {
      router.push(`/message/${messageId}`);
    },
    [router],
  );

  if (!isItemId(rawId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: DEFAULT_TITLE }} />
        <ErrorState {...MISSING_ITEM_COPY} />
      </View>
    );
  }

  // Mirrors the web's `claimed_by_id == current_user.id`; the interest status
  // is the viewer's own row, so neither check exposes anyone else.
  const isRecipient =
    data !== undefined &&
    !data.viewer.is_owner &&
    (data.item.viewer_interest_status === 'selected' ||
      (user !== null && data.item.claimed_by?.id === user.id));

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: data?.item.name ?? DEFAULT_TITLE }} />

      <QueryStateView
        error={error}
        errorOverrides={ERROR_OVERRIDES}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading item"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <ItemDetailBody
            isRecipient={isRecipient}
            isRefreshing={isRefetching}
            item={data.item}
            onOpenThread={handleOpenThread}
            onRefresh={() => {
              void refetch();
            }}
            viewer={data.viewer}
          />
        ) : null}
      </QueryStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radii.sm,
    opacity: 0.6,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  actionButtonLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[8],
    marginHorizontal: spacing[16],
    marginTop: spacing[8],
    padding: spacing[16],
  },
  actionNote: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[12],
  },
  bannerCopy: {
    flex: 1,
    gap: spacing[4],
  },
  bannerDetail: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  bannerDot: {
    borderRadius: spacing[4],
    height: spacing[8],
    width: spacing[8],
  },
  bannerLabel: {
    color: colors.text,
    ...typography.label,
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
  deleteButton: {
    borderColor: colors.danger,
  },
  deleteLabel: {
    color: colors.danger,
  },
  description: {
    color: colors.text,
    ...typography.body,
  },
  giveawayChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  giveawayText: {
    color: colors.onPrimaryText,
    ...typography.label,
    fontSize: 11,
  },
  name: {
    color: colors.text,
    ...typography.value,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  ownerButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  ownerButtonLabel: {
    color: colors.text,
    ...typography.label,
  },
  ownerName: {
    color: colors.text,
    ...typography.body,
  },
  ownerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
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
