import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import type { IconName } from '../components/Icon';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { LinkedText } from '../components/LinkedText';
import { MemberPressable } from '../components/MemberPressable';
import { MessageComposer } from '../components/MessageComposer';
import { QueryStateView } from '../components/QueryStateView';
import { Banner, type BannerTone } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ItemTag } from '../components/ui/ItemTag';
import { PhotoFrame } from '../components/ui/PhotoFrame';
import { Stitch } from '../components/ui/Stitch';
import { itemStatusTag } from '../components/ui/tags';
import { useScrollBottomPadding } from '../hooks/useScrollBottomPadding';
import { formatCalendarDate } from '../lib/dates';
import { describeError, type ErrorCopyOverrides } from '../lib/errorCopy';
import type { ItemDetail, ItemImage, ItemViewerState } from '../lib/items';
import { DELETED_USER_NAME } from '../lib/parse';
import { useDeleteItemMutation } from '../query/useDeleteItemMutation';
import { isItemId, useItemDetailQuery } from '../query/useItemDetailQuery';
import { useSession } from '../session/SessionProvider';
import { colors, fonts, radii, spacing, typography } from '../theme';

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

type StatusBanner = {
  title: string | null;
  tone: BannerTone;
  detail: string | null;
  icon: IconName | null;
};

type Affordance = {
  /** Opens the borrow request form. */
  actionLabel: string | null;
  notes: string[];
  /** The viewer's active loan, linked from a "View loan" row. */
  loanId?: string | null;
};

const GIVEAWAY_PLACEHOLDER =
  "Hi! I'm interested in this item. When could I pick it up?";
const LOAN_PLACEHOLDER =
  'What do you want to know about the item or lending it?';
const GIVEAWAY_HINT =
  'Ask a question or express your interest. The owner can pick anyone who sends them a message.';

/**
 * The web page shows the recipient's name to the owner only, and the borrower's
 * name to nobody, so neither identity is rendered outside those cases here.
 * The status tag on the photo names the state; the title is only for an item
 * with no tag.
 */
function buildStatusBanner(
  item: ItemDetail,
  viewer: ItemViewerState,
  isRecipient: boolean,
): StatusBanner {
  const tag = itemStatusTag(item);

  if (item.available || tag === null) {
    return {
      title: tag === null ? 'Available' : null,
      tone: 'success',
      detail: null,
      icon: null,
    };
  }

  if (tag === 'on_loan') {
    const dueDate = item.current_loan
      ? formatCalendarDate(item.current_loan.end_date)
      : null;
    const detail = viewer.is_active_borrower
      ? dueDate
        ? `You're borrowing this until ${dueDate}.`
        : "You're borrowing this item."
      : dueDate
        ? `Due back ${dueDate}.`
        : null;

    return { title: null, tone: 'warning', detail, icon: 'pending' };
  }

  if (tag === 'pending') {
    const detail = viewer.is_owner
      ? item.claimed_by
        ? `Going to ${item.claimed_by.full_name}.`
        : 'Waiting on handoff.'
      : isRecipient
        ? "You've been selected for this giveaway."
        : 'Pending pickup by another member.';

    return { title: null, tone: 'warning', detail, icon: 'pending' };
  }

  const detail = viewer.is_owner
    ? item.claimed_by
      ? `Given to ${item.claimed_by.full_name}.`
      : 'Marked as rehomed.'
    : isRecipient
      ? 'You received this giveaway.'
      : 'This giveaway has found a new home.';

  return { title: null, tone: 'info', detail, icon: 'rehomed' };
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
      notes: [],
      loanId: item.current_loan?.id ?? null,
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

  return { actionLabel: 'Ask to borrow this', notes: [] };
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
      <Button
        icon="pen"
        label="Edit"
        onPress={() => router.push(`/item/${itemId}/edit`)}
        style={styles.ownerButton}
        testID="item-edit"
        variant="outline"
      />
      <Button
        icon="trash"
        label="Delete"
        onPress={() => setConfirming(true)}
        style={styles.ownerButton}
        testID="item-delete"
        variant="outlineDanger"
      />
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

const PHOTO_ASPECT_RATIO = 4 / 3;

/**
 * The whole photo (never cropped) in an ink frame with a 4px lift, paged when
 * there are several. Measures its own width so the lift stays inside the
 * screen gutter.
 */
function ItemPhoto({ item }: { item: ItemDetail }) {
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const [active, setActive] = useState({ orderKey: '', index: 0 });
  const statusTag = itemStatusTag(item);

  const images = item.images.flatMap((image: ItemImage) =>
    image.url === null ? [] : [{ id: image.id, url: image.url }],
  );
  const orderKey = images.map((image) => image.id).join(',');
  const total = images.length;
  const currentIndex = Math.min(
    active.orderKey === orderKey ? active.index : 0,
    Math.max(total - 1, 0),
  );

  const width = measured || windowWidth - 2 * spacing[16];
  const frameSize = { height: width / PHOTO_ASPECT_RATIO, width };

  const onLayout = (event: LayoutChangeEvent) => {
    setMeasured(event.nativeEvent.layout.width);
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    setActive({
      orderKey,
      index: Math.round(event.nativeEvent.contentOffset.x / width),
    });
  };

  return (
    <View style={styles.photoArea}>
      <View onLayout={onLayout}>
        <PhotoFrame lifted="lg" radius={radii.card} style={frameSize}>
          <View style={styles.photoBackdrop}>
            {total === 0 ? (
              <View style={styles.photoEmpty} testID="item-carousel-empty">
                <ImagePlaceholder />
              </View>
            ) : (
              <FlatList
                data={images}
                getItemLayout={(_data, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                horizontal
                key={orderKey}
                keyExtractor={(image) => image.id}
                onMomentumScrollEnd={onMomentumScrollEnd}
                pagingEnabled
                renderItem={({ index, item: image }) => (
                  <Image
                    accessibilityLabel={
                      total > 1
                        ? `Photo ${index + 1} of ${total} of ${item.name}`
                        : `Photo of ${item.name}`
                    }
                    contentFit="contain"
                    recyclingKey={image.id}
                    source={{ uri: image.url }}
                    style={frameSize}
                    testID="item-carousel-image"
                    transition={150}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                testID="item-carousel"
              />
            )}
          </View>

          {statusTag ? <ItemTag kind={statusTag} onPhoto /> : null}

          {total > 1 ? (
            <View style={styles.counter} testID="item-carousel-indicator">
              <Text style={styles.counterText} testID="item-carousel-counter">
                {`${currentIndex + 1} / ${total}`}
              </Text>
            </View>
          ) : null}
        </PhotoFrame>
      </View>
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
  const router = useRouter();
  const banner = buildStatusBanner(item, viewer, isRecipient);
  const affordance = describeAffordance(item, viewer, isRecipient);
  const paddingBottom = useScrollBottomPadding();
  const description = item.description?.trim() || null;
  const subject = useMemo(() => ({ itemId: item.id }), [item.id]);
  // Availability and circles are left to the server, which 400s or 403s.
  const recipient = viewer.is_owner ? null : item.owner;

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing[16]}
      contentContainerStyle={{ paddingBottom }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={colors.tealDeep}
        />
      }
      testID="item-detail-scroll"
    >
      <ItemPhoto item={item} />

      <View style={styles.section}>
        <Text style={styles.name}>{item.name}</Text>

        {banner.title || banner.detail ? (
          <Banner
            icon={banner.icon ?? undefined}
            testID="item-status-banner"
            title={banner.title ?? undefined}
            tone={banner.tone}
          >
            {banner.detail}
          </Banner>
        ) : null}

        {description ? (
          <LinkedText style={styles.description} text={description} />
        ) : null}
      </View>

      <View style={styles.owner}>
        <Stitch />
        <View style={styles.ownerBlock}>
          <Text style={styles.sectionLabel}>Shared by</Text>
          {item.owner ? (
            <MemberPressable user={item.owner}>
              <View style={styles.ownerRow}>
                <Avatar
                  size={40}
                  testID="item-owner-avatar"
                  user={item.owner}
                />
                <Text style={styles.ownerName}>{item.owner.full_name}</Text>
              </View>
            </MemberPressable>
          ) : (
            <View style={styles.ownerRow}>
              <Avatar size={40} testID="item-owner-avatar" user={item.owner} />
              <Text style={styles.ownerName}>{DELETED_USER_NAME}</Text>
            </View>
          )}
        </View>
        <Stitch />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.chipRow}>
          <ItemTag label={item.category.name} tone="tealWash" />
        </View>
      </View>

      {item.tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.chipRow}>
            {item.tags.map((tag) => (
              <ItemTag key={tag.id} label={tag.name} />
            ))}
          </View>
        </View>
      ) : null}

      {recipient ||
      viewer.is_owner ||
      affordance.actionLabel ||
      affordance.loanId ||
      affordance.notes.length > 0 ? (
        <Card style={styles.actionCard} testID="item-affordance">
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
            <Button
              label={affordance.actionLabel}
              onPress={() => router.push(`/item/${item.id}/request`)}
              size="lg"
              testID="item-primary-action"
              variant="primary"
            />
          ) : null}

          {affordance.loanId ? (
            <Button
              icon="loan"
              label="View loan"
              onPress={() => router.push(`/loan/${affordance.loanId}`)}
              testID="item-view-loan"
              variant="outline"
            />
          ) : null}

          {affordance.notes.map((note) => (
            <Text key={note} style={styles.actionNote}>
              {note}
            </Text>
          ))}

          {viewer.is_owner ? <OwnerActions itemId={item.id} /> : null}
        </Card>
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
  actionCard: {
    gap: spacing[12],
    marginHorizontal: spacing[16],
    marginTop: spacing[8],
  },
  actionNote: {
    color: colors.muted,
    ...typography.body,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  counter: {
    backgroundColor: colors.ink,
    borderRadius: radii.tag,
    bottom: spacing[12],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    position: 'absolute',
    right: spacing[12],
  },
  counterText: {
    color: colors.paper,
    ...typography.micro,
  },
  description: {
    color: colors.ink,
    ...typography.body,
  },
  name: {
    color: colors.ink,
    ...typography.h1,
  },
  owner: {
    marginTop: spacing[20],
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  ownerBlock: {
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
  },
  ownerButton: {
    flex: 1,
  },
  ownerName: {
    color: colors.ink,
    ...typography.body,
    fontFamily: fonts.body[700],
  },
  ownerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
  },
  photoArea: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  photoBackdrop: {
    backgroundColor: colors.tangerineWash,
    flex: 1,
  },
  photoEmpty: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  section: {
    gap: spacing[10],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  sectionLabel: {
    color: colors.muted,
    ...typography.label,
  },
});
