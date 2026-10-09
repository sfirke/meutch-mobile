import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Avatar } from '../components/Avatar';
import { ErrorState } from '../components/ErrorState';
import { Icon, type IconName } from '../components/Icon';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { loanToneColors } from '../components/loanTone';
import { MemberPressable } from '../components/MemberPressable';
import { QueryStateView } from '../components/QueryStateView';
import { formatCalendarDate } from '../lib/dates';
import type { ErrorCopyOverrides } from '../lib/errorCopy';
import {
  describeLoanDue,
  describeLoanStatus,
  type LoanDetail,
} from '../lib/loans';
import { DELETED_USER_NAME, type LoanStatus } from '../lib/parse';
import { formatRelativeTime } from '../lib/relativeTime';
import { webOnlyNote } from '../lib/webOnly';
import { isLoanId, useLoanDetailQuery } from '../query/useLoanDetailQuery';
import { useSession } from '../session/SessionProvider';
import { colors, radii, spacing, typography } from '../theme';

const DEFAULT_TITLE = 'Loan';

const INVALID_LOAN_COPY = {
  title: "This loan isn't available.",
  message: 'It may have been removed, or the link is wrong.',
};

const UNAVAILABLE_LOAN_COPY = {
  title: "This loan isn't available.",
  message: "It may have been removed, or you're not part of it.",
  canRetry: false,
};

/** The backend 404s a missing loan and 403s one the viewer isn't part of. */
const ERROR_OVERRIDES: ErrorCopyOverrides = {
  FORBIDDEN: UNAVAILABLE_LOAN_COPY,
  NOT_FOUND: UNAVAILABLE_LOAN_COPY,
};

function statusIcon(status: LoanStatus | null): IconName {
  if (status === 'pending') {
    return 'pending';
  }

  return status === 'approved' ? 'check' : 'loan';
}

/** The website-only action for this viewer, or null when there is none. */
function webOnlyAction(
  isBorrower: boolean,
  status: LoanStatus | null,
): string | null {
  if (status === 'pending') {
    return isBorrower ? 'Cancel this request' : 'Approve or deny this request';
  }

  if (status === 'approved') {
    return isBorrower
      ? 'Ask for more time'
      : 'Mark this loan returned or change its due date';
  }

  return null;
}

type LoanDetailBodyProps = {
  loan: LoanDetail;
  isBorrower: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function LoanDetailBody({
  loan,
  isBorrower,
  isRefreshing,
  onRefresh,
}: LoanDetailBodyProps) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const status = describeLoanStatus(loan);
  const toneColor = loanToneColors[status.tone];
  const due = describeLoanDue(loan);
  const counterpart = isBorrower ? loan.owner : loan.borrower;
  const start = formatCalendarDate(loan.start_date);
  const end = formatCalendarDate(loan.end_date);
  const action = webOnlyAction(isBorrower, loan.status);
  const messageId = loan.latest_conversation_message_id;

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
      testID="loan-detail-scroll"
    >
      <View style={styles.section}>
        <View
          style={[styles.banner, { borderColor: toneColor }]}
          testID="loan-status-banner"
        >
          <Icon color={toneColor} name={statusIcon(loan.status)} size={18} />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerLabel}>{status.label}</Text>
            {due ? <Text style={styles.note}>{due}</Text> : null}
          </View>
        </View>

        <Pressable
          accessibilityLabel={loan.item.name}
          accessibilityRole="button"
          onPress={() => router.push(`/item/${loan.item.id}`)}
          style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}
        >
          <View style={styles.thumbBox}>
            {loan.item.image_url ? (
              <Image
                contentFit="cover"
                source={{ uri: loan.item.image_url }}
                style={styles.thumb}
                testID="loan-item-thumbnail"
              />
            ) : (
              <ImagePlaceholder style={styles.thumb} />
            )}
          </View>
          <Text numberOfLines={2} style={styles.itemName}>
            {loan.item.name}
          </Text>
          <Icon color={colors.secondary} name="chevron" size={14} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {isBorrower ? 'Borrowed from' : 'Lent to'}
        </Text>
        <View style={styles.memberRow}>
          {counterpart ? (
            <MemberPressable style={styles.memberRowLink} user={counterpart}>
              <Avatar testID="loan-counterpart-avatar" user={counterpart} />
              <Text style={styles.memberName}>{counterpart.full_name}</Text>
            </MemberPressable>
          ) : (
            <>
              <Avatar testID="loan-counterpart-avatar" user={null} />
              <Text style={styles.memberName}>{DELETED_USER_NAME}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Dates</Text>
        {start && end ? (
          <Text style={styles.body}>{`${start} to ${end}`}</Text>
        ) : null}
        <Text style={styles.note}>
          {`Requested ${formatRelativeTime(loan.created_at, now)}`}
        </Text>
      </View>

      {messageId ? (
        <View style={styles.section}>
          <Pressable
            accessibilityLabel="View conversation"
            accessibilityRole="button"
            onPress={() => router.push(`/message/${messageId}`)}
            style={({ pressed }) => [
              styles.conversationRow,
              pressed && styles.pressed,
            ]}
          >
            <Icon color={colors.secondary} name="inbox" size={16} />
            <Text style={styles.conversationLabel}>View conversation</Text>
            <Icon color={colors.secondary} name="chevron" size={12} />
          </Pressable>
        </View>
      ) : null}

      {action ? (
        <View style={styles.actionCard}>
          <Text style={styles.note}>{webOnlyNote(action)}</Text>
        </View>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

export function LoanDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useSession();
  const { data, error, isPending, isFetching, isRefetching, refetch } =
    useLoanDetailQuery(rawId);

  if (!isLoanId(rawId)) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: DEFAULT_TITLE }} />
        <ErrorState {...INVALID_LOAN_COPY} />
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
        loadingLabel="Loading loan"
        onRetry={() => {
          void refetch();
        }}
      >
        {data ? (
          <LoanDetailBody
            isBorrower={user !== null && data.loan.borrower?.id === user.id}
            isRefreshing={isRefetching}
            loan={data.loan}
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
  body: {
    color: colors.text,
    ...typography.body,
  },
  content: {
    paddingBottom: spacing[24],
  },
  conversationLabel: {
    color: colors.text,
    flex: 1,
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
  itemName: {
    color: colors.text,
    flex: 1,
    ...typography.body,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
  },
  memberName: {
    color: colors.text,
    ...typography.body,
  },
  memberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
  },
  memberRowLink: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[12],
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
  thumb: {
    height: '100%',
    width: '100%',
  },
  thumbBox: {
    borderRadius: radii.sm,
    height: 56,
    overflow: 'hidden',
    width: 56,
  },
});
