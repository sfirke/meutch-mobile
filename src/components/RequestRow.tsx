import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  SEEKING_LABELS,
  VISIBILITY_LABELS,
  describeRequestStatus,
  formatRequestDate,
  type RequestSummary,
} from '../lib/requests';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';

export type RequestRowProps = {
  request: RequestSummary;
  now: Date;
  onPress?: (request: RequestSummary) => void;
};

function getDateLine(request: RequestSummary, now: Date): string | null {
  const status = describeRequestStatus(request, now);

  if (status === 'fulfilled') {
    const fulfilledDate = request.fulfilled_at
      ? formatRequestDate(request.fulfilled_at)
      : null;

    return fulfilledDate ? `Fulfilled ${fulfilledDate}` : null;
  }

  const date = formatRequestDate(request.expires_at);

  if (!date) {
    return null;
  }

  return status === 'expired' ? `Expired ${date}` : `Expires ${date}`;
}

// "My requests" list row: title, seeking/visibility chips, and a status date.
export function RequestRow({ request, now, onPress }: RequestRowProps) {
  const chips = [
    request.seeking ? SEEKING_LABELS[request.seeking] : null,
    request.visibility ? VISIBILITY_LABELS[request.visibility] : null,
  ].filter((label): label is string => label !== null);
  const dateLine = getDateLine(request, now);

  const content = (
    <>
      <Icon color={colors.secondary} name="request" size={20} />
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {request.title}
        </Text>
        {chips.length > 0 ? (
          <View style={styles.chipRow}>
            {chips.map((label) => (
              <View key={label} style={styles.chip}>
                <Text numberOfLines={1} style={styles.chipText}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {dateLine ? <Text style={styles.date}>{dateLine}</Text> : null}
      </View>
      <Icon color={colors.secondary} name="chevron" size={14} />
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={
          dateLine ? `${request.title}, ${dateLine}` : request.title
        }
        accessibilityRole="button"
        onPress={() => onPress(request)}
        style={styles.row}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing[4],
  },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    paddingHorizontal: spacing[10],
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
    fontSize: 12,
  },
  date: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  title: {
    color: colors.text,
    ...typography.body,
  },
});
