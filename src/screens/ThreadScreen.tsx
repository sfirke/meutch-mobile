import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
  type ScrollViewProps,
} from 'react-native';
import {
  KeyboardChatScrollView,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { LoanBanner } from '../components/LoanBanner';
import { MessageBubble } from '../components/MessageBubble';
import { QueryStateView } from '../components/QueryStateView';
import { ThreadContextCard } from '../components/ThreadContextCard';
import { isApiError } from '../lib/api';
import { describeError, type ErrorCopyOverrides } from '../lib/errorCopy';
import type { MessageSummary, MessageThread } from '../lib/messages';
import { isUuid } from '../lib/parse';
import { messageKeys } from '../lib/queryKeys';
import { useMarkThreadReadMutation } from '../query/useMarkThreadReadMutation';
import { useRefreshOnFocus } from '../query/useRefreshOnFocus';
import { useReplyMutation } from '../query/useReplyMutation';
import { useThreadQuery } from '../query/useThreadQuery';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

const DEFAULT_TITLE = 'Conversation';

const MISSING_THREAD_COPY = {
  title: 'This conversation is gone',
  message: 'It may have been removed.',
};

/** The route 403s for a non-participant and 404s for an unknown message id. */
const ERROR_OVERRIDES: ErrorCopyOverrides = {
  FORBIDDEN: {
    title: "You're not part of this conversation",
    message: 'Only its participants can read it.',
    canRetry: false,
  },
  NOT_FOUND: {
    ...MISSING_THREAD_COPY,
    canRetry: false,
  },
};

const MAX_BODY_LENGTH = 1000;
const COUNTER_THRESHOLD = 900;

function keyExtractor(message: MessageSummary): string {
  return message.id;
}

/** A 422 puts the per-field reason in `details.body`; prefer it over the generic. */
function readBodyDetail(error: unknown): string | null {
  if (!isApiError(error)) {
    return null;
  }

  const body = error.details?.body;

  if (Array.isArray(body)) {
    const [first] = body;

    return typeof first === 'string' ? first : null;
  }

  return typeof body === 'string' ? body : null;
}

type ComposerProps = {
  bottomInset: number;
  draft: string;
  isSending: boolean;
  error: unknown;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
};

function Composer({
  bottomInset,
  draft,
  isSending,
  error,
  onChangeDraft,
  onSend,
}: ComposerProps) {
  const canSend = draft.trim().length > 0 && !isSending;
  const failure = error ? describeError(error) : null;
  const failureMessage = readBodyDetail(error) ?? failure?.message;

  return (
    <View
      style={[styles.composer, { paddingBottom: spacing[12] + bottomInset }]}
    >
      {failure ? (
        <View style={styles.replyError} testID="reply-error">
          <Text style={styles.replyErrorTitle}>{failure.title}</Text>
          <Text style={styles.replyErrorMessage}>{failureMessage}</Text>
        </View>
      ) : null}

      <View style={styles.composerRow}>
        <TextInput
          accessibilityLabel="Message"
          maxLength={MAX_BODY_LENGTH}
          multiline
          onChangeText={onChangeDraft}
          placeholder="Write a message"
          placeholderTextColor={colors.inputPlaceholder}
          style={styles.input}
          value={draft}
        />
        <Pressable
          accessibilityLabel="Send"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Icon color={colors.onPrimaryText} name="send" size={16} />
        </Pressable>
      </View>

      {draft.length > COUNTER_THRESHOLD ? (
        <Text style={styles.counter}>
          {draft.length}/{MAX_BODY_LENGTH}
        </Text>
      ) : null}
    </View>
  );
}

type ThreadListProps = {
  bottomInset: number;
  thread: MessageThread;
  currentUserId: string;
  now: Date;
  onPressItem: (itemId: string) => void;
  onPressCircle: (circleId: string) => void;
};

function ThreadList({
  bottomInset,
  thread,
  currentUserId,
  now,
  onPressItem,
  onPressCircle,
}: ThreadListProps) {
  // The API sends messages ascending; an inverted list renders newest first.
  const reversed = useMemo(
    () => [...thread.messages].reverse(),
    [thread.messages],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MessageSummary>) => (
      <MessageBubble
        isOwn={item.sender.id === currentUserId}
        message={item}
        now={now}
      />
    ),
    [currentUserId, now],
  );

  // Pads the list by the keyboard height so the newest messages stay visible
  // above the composer, which rides the keyboard in a KeyboardStickyView.
  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => (
      <KeyboardChatScrollView {...props} inverted offset={bottomInset} />
    ),
    [bottomInset],
  );

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={reversed}
      inverted
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={keyExtractor}
      // Renders above the messages: an inverted list flips its footer to the top.
      ListFooterComponent={
        <View style={styles.header}>
          <ThreadContextCard
            context={thread.context}
            onPressCircle={onPressCircle}
            onPressItem={onPressItem}
            sharedCircles={thread.shared_circles}
          />
          {thread.active_loan ? <LoanBanner loan={thread.active_loan} /> : null}
        </View>
      }
      renderItem={renderItem}
      renderScrollComponent={renderScrollComponent}
      testID="thread-list"
    />
  );
}

export function ThreadScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const anchorId = isUuid(rawId) ? rawId : '';
  const router = useRouter();
  const { user } = useSession();
  const { data, error, isPending, isFetching, refetch } = useThreadQuery(rawId);
  const reply = useReplyMutation(anchorId);
  const markRead = useMarkThreadReadMutation(anchorId);
  const threadKey = useMemo(() => messageKeys.thread(anchorId), [anchorId]);
  const [draft, setDraft] = useState('');
  const hasMarkedRead = useRef(false);
  const now = useMemo(() => new Date(), []);

  useRefreshOnFocus(threadKey);
  const { bottom: bottomInset } = useSafeAreaInsets();

  const markThreadRead = markRead.mutate;
  const isUnread = data?.has_unread_messages ?? false;

  // Once per mount, and only when something is unread. `has_unread_messages`
  // excludes messages tied to a pending loan request, so the inbox row can
  // stay unread after this fires; that matches the web app.
  useEffect(() => {
    if (hasMarkedRead.current || !isUnread) {
      return;
    }

    hasMarkedRead.current = true;
    markThreadRead();
  }, [isUnread, markThreadRead]);

  const handlePressItem = useCallback(
    (itemId: string) => {
      router.push(`/item/${itemId}`);
    },
    [router],
  );

  const handlePressCircle = useCallback(
    (circleId: string) => {
      router.push(`/circle/${circleId}`);
    },
    [router],
  );

  const sendReply = reply.mutate;

  const handleSend = useCallback(() => {
    const body = draft.trim();

    if (body.length === 0) {
      return;
    }

    sendReply(body, {
      onSuccess: () => {
        setDraft('');
      },
    });
  }, [draft, sendReply]);

  if (!isUuid(rawId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: DEFAULT_TITLE }} />
        <ErrorState {...MISSING_THREAD_COPY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: data?.other_user.full_name ?? DEFAULT_TITLE }}
      />

      <QueryStateView
        error={error}
        errorOverrides={ERROR_OVERRIDES}
        isEmpty={data === undefined}
        isPending={isPending}
        isRetrying={isFetching}
        loadingLabel="Loading conversation"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <ThreadList
            bottomInset={bottomInset}
            currentUserId={user?.id ?? ''}
            now={now}
            onPressCircle={handlePressCircle}
            onPressItem={handlePressItem}
            thread={data}
          />
        ) : null}
      </QueryStateView>

      {data ? (
        // Translates with the keyboard rather than relying on window resize,
        // which Android edge-to-edge no longer does. The opened offset drops
        // the safe-area padding the keyboard already covers.
        <KeyboardStickyView offset={{ opened: bottomInset }}>
          <Composer
            bottomInset={bottomInset}
            draft={draft}
            error={reply.error}
            isSending={reply.isPending}
            onChangeDraft={setDraft}
            onSend={handleSend}
          />
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  composerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing[8],
  },
  counter: {
    color: colors.secondary,
    textAlign: 'right',
    ...typography.itemMeta,
    fontSize: 12,
  },
  header: {
    gap: spacing[12],
    paddingBottom: spacing[12],
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: typography.body.fontSize,
    maxHeight: 120,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  listContent: {
    padding: spacing[16],
  },
  pressed: {
    opacity: 0.75,
  },
  replyError: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing[4],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  replyErrorMessage: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  replyErrorTitle: {
    color: colors.errorLabel,
    ...typography.label,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
