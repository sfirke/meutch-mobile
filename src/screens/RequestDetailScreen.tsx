import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Avatar } from '../components/Avatar';
import { ErrorState } from '../components/ErrorState';
import { Icon, type IconName } from '../components/Icon';
import { QueryStateView } from '../components/QueryStateView';
import {
  describeError,
  readFieldError,
  type ErrorCopyOverrides,
} from '../lib/errorCopy';
import { formatRelativeTime } from '../lib/relativeTime';
import {
  formatRequestDate,
  isRequestExpired,
  type RequestConversation,
  type RequestSeeking,
  type RequestSummary,
  type RequestVisibility,
} from '../lib/requests';
import { webOnlyNote } from '../lib/webOnly';
import {
  isRequestId,
  useRequestDetailQuery,
} from '../query/useRequestDetailQuery';
import { useStartConversationMutation } from '../query/useStartConversationMutation';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

const DEFAULT_TITLE = 'Request';

const MISSING_REQUEST_COPY = {
  title: 'This request is gone',
  message: 'It may have been deleted.',
};

/** The backend 404s a deleted request and 403s one the viewer cannot see. */
const ERROR_OVERRIDES: ErrorCopyOverrides = {
  FORBIDDEN: {
    title: "You can't see this request",
    message: "It's shared with circles you're not part of.",
    canRetry: false,
  },
  NOT_FOUND: {
    ...MISSING_REQUEST_COPY,
    canRetry: false,
  },
};

const MAX_BODY_LENGTH = 1000;

const SEEKING_LABELS: Record<RequestSeeking, string> = {
  loan: 'Seeking a loan',
  giveaway: 'Seeking a giveaway',
  either: 'Loan or giveaway',
};

const VISIBILITY_LABELS: Record<RequestVisibility, string> = {
  public: 'Public',
  circles: 'Circles only',
};

type StatusBanner = {
  label: string;
  color: string;
  icon: IconName;
  detail: string | null;
};

function buildStatusBanner(
  request: RequestSummary,
  isExpired: boolean,
): StatusBanner {
  if (request.status === 'fulfilled') {
    const date = request.fulfilled_at
      ? formatRequestDate(request.fulfilled_at)
      : null;

    return {
      label: 'Fulfilled',
      color: colors.success,
      icon: 'check',
      detail: date ? `Fulfilled on ${date}.` : null,
    };
  }

  const date = formatRequestDate(request.expires_at);

  if (isExpired) {
    return {
      label: 'Expired',
      color: colors.secondary,
      icon: 'pending',
      detail: date ? `Expired on ${date}.` : null,
    };
  }

  if (request.status === 'open') {
    return {
      label: 'Open',
      color: colors.warning,
      icon: 'request',
      detail: date ? `Expires ${date}.` : null,
    };
  }

  // An unrecognised status is never open; say so rather than promising a date.
  return {
    label: 'Closed',
    color: colors.secondary,
    icon: 'pending',
    detail: null,
  };
}

type MessageComposerProps = {
  recipientName: string;
  requestId: string;
  onSent: (messageId: string) => void;
};

function MessageComposer({
  recipientName,
  requestId,
  onSent,
}: MessageComposerProps) {
  const subject = useMemo(() => ({ requestId }), [requestId]);
  const send = useStartConversationMutation(subject);
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !send.isPending;
  const failure = send.error ? describeError(send.error) : null;
  const failureMessage = readFieldError(send.error, 'body') ?? failure?.message;

  const handleSend = () => {
    const body = draft.trim();

    if (body.length === 0) {
      return;
    }

    send.mutate(body, {
      onSuccess: (message) => {
        setDraft('');
        onSent(message.id);
      },
    });
  };

  return (
    <View style={styles.composer} testID="request-composer">
      <Text style={styles.sectionLabel}>Message {recipientName}</Text>

      {failure ? (
        <View style={styles.sendError} testID="request-send-error">
          <Text style={styles.sendErrorTitle}>{failure.title}</Text>
          <Text style={styles.sendErrorMessage}>{failureMessage}</Text>
        </View>
      ) : null}

      <TextInput
        accessibilityLabel="Message"
        maxLength={MAX_BODY_LENGTH}
        multiline
        onChangeText={setDraft}
        placeholder="Offer help or ask a question"
        placeholderTextColor={colors.inputPlaceholder}
        style={styles.input}
        value={draft}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={handleSend}
        style={({ pressed }) => [
          styles.sendButton,
          !canSend && styles.sendButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Icon color={colors.onPrimaryText} name="send" size={14} />
        <Text style={styles.sendButtonLabel}>
          {send.isPending ? 'Sending…' : 'Send message'}
        </Text>
      </Pressable>
    </View>
  );
}

type ConversationListProps = {
  conversations: RequestConversation[];
  now: Date;
  onPress: (messageId: string) => void;
};

function ConversationList({
  conversations,
  now,
  onPress,
}: ConversationListProps) {
  return (
    <View style={styles.section} testID="request-conversations">
      <Text style={styles.sectionLabel}>Conversations</Text>
      {conversations.length === 0 ? (
        <Text style={styles.note}>No one has messaged you about this yet.</Text>
      ) : (
        conversations.map(({ latest_message: message, other_user: user }) => (
          <Pressable
            accessibilityLabel={`Conversation with ${user.full_name}`}
            accessibilityRole="button"
            key={message.id}
            onPress={() => onPress(message.id)}
            style={({ pressed }) => [
              styles.conversationRow,
              pressed && styles.pressed,
            ]}
          >
            <Avatar size={40} user={user} />
            <View style={styles.conversationBody}>
              <View style={styles.conversationHeader}>
                <Text numberOfLines={1} style={styles.conversationName}>
                  {user.full_name}
                </Text>
                <Text style={styles.conversationTime}>
                  {formatRelativeTime(message.timestamp, now)}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.note}>
                {message.body}
              </Text>
            </View>
            <Icon color={colors.secondary} name="chevron" size={12} />
          </Pressable>
        ))
      )}
    </View>
  );
}

type RequestDetailBodyProps = {
  request: RequestSummary;
  conversations: RequestConversation[];
  isOwner: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenThread: (messageId: string) => void;
};

function RequestDetailBody({
  request,
  conversations,
  isOwner,
  isRefreshing,
  onRefresh,
  onOpenThread,
}: RequestDetailBodyProps) {
  const now = useMemo(() => new Date(), []);
  const isExpired = isRequestExpired(request, now);
  const isOpen = request.status === 'open' && !isExpired;
  const banner = buildStatusBanner(request, isExpired);
  const description = request.description?.trim() || null;

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
      testID="request-detail-scroll"
    >
      <View style={styles.section}>
        <View style={styles.typeChip}>
          <Icon color={colors.text} name="request" size={11} />
          <Text style={styles.typeChipText}>REQUEST</Text>
        </View>

        <Text style={styles.title}>{request.title}</Text>

        <View
          style={[styles.banner, { borderColor: banner.color }]}
          testID="request-status-banner"
        >
          <Icon color={banner.color} name={banner.icon} size={18} />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerLabel}>{banner.label}</Text>
            {banner.detail ? (
              <Text style={styles.note}>{banner.detail}</Text>
            ) : null}
          </View>
        </View>

        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}

        <View style={styles.chipRow}>
          {request.seeking ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {SEEKING_LABELS[request.seeking]}
              </Text>
            </View>
          ) : null}
          {request.visibility ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {VISIBILITY_LABELS[request.visibility]}
              </Text>
            </View>
          ) : null}
          {/* A coarse bucket from the API; render verbatim. */}
          {request.distance && !isOwner ? (
            <View style={styles.chip}>
              <Icon color={colors.secondary} name="location" size={11} />
              <Text style={styles.chipText}>{request.distance}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Requested by</Text>
        <View style={styles.ownerRow}>
          <Avatar testID="request-owner-avatar" user={request.user} />
          <Text style={styles.ownerName}>
            {isOwner ? 'You' : request.user.full_name}
          </Text>
        </View>
      </View>

      {isOwner ? (
        <>
          <ConversationList
            conversations={conversations}
            now={now}
            onPress={onOpenThread}
          />
          <View style={styles.actionCard}>
            <Text style={styles.note}>
              {webOnlyNote('Edit, fulfill, or delete this request')}
            </Text>
          </View>
        </>
      ) : isOpen ? (
        <View style={styles.actionCard}>
          <MessageComposer
            onSent={onOpenThread}
            recipientName={request.user.first_name}
            requestId={request.id}
          />
          <Text style={styles.note}>
            {webOnlyNote('Offer one of your items')}
          </Text>
        </View>
      ) : (
        <View style={styles.actionCard}>
          <Text style={styles.note}>
            {`This request is ${banner.label.toLowerCase()}, so it's no longer taking messages.`}
          </Text>
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}

export function RequestDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useSession();
  const { data, error, isPending, isFetching, isRefetching, refetch } =
    useRequestDetailQuery(rawId);

  const handleOpenThread = useCallback(
    (messageId: string) => {
      router.push(`/message/${messageId}`);
    },
    [router],
  );

  if (!isRequestId(rawId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: DEFAULT_TITLE }} />
        <ErrorState {...MISSING_REQUEST_COPY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: DEFAULT_TITLE }} />

      <QueryStateView
        error={error}
        errorOverrides={ERROR_OVERRIDES}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading request"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <RequestDetailBody
            conversations={data.conversations}
            isOwner={user !== null && data.request.user.id === user.id}
            isRefreshing={isRefetching}
            onOpenThread={handleOpenThread}
            onRefresh={() => {
              void refetch();
            }}
            request={data.request}
          />
        ) : null}
      </QueryStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[12],
    marginHorizontal: spacing[16],
    marginTop: spacing[16],
    padding: spacing[16],
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
  composer: {
    gap: spacing[8],
  },
  content: {
    paddingBottom: spacing[24],
  },
  conversationBody: {
    flex: 1,
    gap: spacing[4],
  },
  conversationHeader: {
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'space-between',
  },
  conversationName: {
    color: colors.text,
    flexShrink: 1,
    ...typography.label,
  },
  conversationRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[12],
  },
  conversationTime: {
    color: colors.secondary,
    ...typography.itemMeta,
    fontSize: 12,
  },
  description: {
    color: colors.text,
    ...typography.body,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    maxHeight: 160,
    minHeight: 88,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
    textAlignVertical: 'top',
  },
  note: {
    color: colors.secondary,
    ...typography.itemMeta,
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
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  sendError: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing[4],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  sendErrorMessage: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  sendErrorTitle: {
    color: colors.errorLabel,
    ...typography.label,
  },
  title: {
    color: colors.text,
    ...typography.value,
  },
  typeChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.warning,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  typeChipText: {
    color: colors.text,
    ...typography.label,
    fontSize: 11,
  },
});
