import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CircleSummary, CircleType } from '../lib/circles';
import { colors, radii, shadows, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';
import { ImagePlaceholder } from './ImagePlaceholder';

export type CircleCardProps = {
  circle: CircleSummary;
  onPress?: (circle: CircleSummary) => void;
};

type TypeChipMeta = {
  label: string;
  icon: IconName;
};

const TYPE_CHIP_META: Record<CircleType, TypeChipMeta> = {
  open: { label: 'Open', icon: 'members' },
  closed: { label: 'Closed', icon: 'lock' },
  secret: { label: 'Secret', icon: 'lock' },
};

/** Coarse distance copy; never sort by the underlying number. */
export function describeDistance(miles: number): string {
  if (miles < 1) {
    return 'less than a mile away';
  }

  const rounded = Math.round(miles * 10) / 10;
  const formatted = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);

  return `about ${formatted} mi away`;
}

function getMemberCountLabel(memberCount: number): string {
  return `${memberCount} member${memberCount === 1 ? '' : 's'}`;
}

type StatusChipMeta = {
  label: string;
  icon: IconName | null;
  backgroundColor: string;
  textColor: string;
};

function getStatusChip(circle: CircleSummary): StatusChipMeta | null {
  if (circle.is_admin) {
    return {
      label: 'Admin',
      icon: 'admin',
      backgroundColor: colors.primaryDark,
      textColor: colors.onPrimaryText,
    };
  }

  if (circle.is_member) {
    return {
      label: 'Member',
      icon: null,
      backgroundColor: colors.success,
      textColor: colors.onPrimaryText,
    };
  }

  if (circle.has_pending_join_request) {
    return {
      label: 'Request pending',
      icon: 'pending',
      backgroundColor: colors.warning,
      textColor: colors.text,
    };
  }

  return null;
}

export function CircleCard({ circle, onPress }: CircleCardProps) {
  const typeChip = circle.circle_type
    ? TYPE_CHIP_META[circle.circle_type]
    : null;
  const statusChip = getStatusChip(circle);
  const description = circle.description?.trim() || null;

  return (
    <Pressable
      accessibilityLabel={circle.name}
      accessibilityRole="button"
      onPress={onPress ? () => onPress(circle) : undefined}
      style={styles.card}
    >
      <View style={styles.imageBox}>
        {circle.image_url ? (
          <Image
            accessibilityLabel={circle.name}
            contentFit="cover"
            recyclingKey={circle.id}
            source={{ uri: circle.image_url }}
            style={styles.image}
            testID="circle-card-image"
            transition={150}
          />
        ) : (
          <ImagePlaceholder />
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{circle.name}</Text>

        <View style={styles.chipRow}>
          {typeChip ? (
            <View style={styles.chip}>
              <Icon color={colors.secondary} name={typeChip.icon} size={11} />
              <Text style={styles.chipText}>{typeChip.label}</Text>
            </View>
          ) : null}

          {statusChip ? (
            <View
              style={[
                styles.chip,
                { backgroundColor: statusChip.backgroundColor },
              ]}
            >
              {statusChip.icon ? (
                <Icon
                  color={statusChip.textColor}
                  name={statusChip.icon}
                  size={11}
                />
              ) : null}
              <Text style={[styles.chipText, { color: statusChip.textColor }]}>
                {statusChip.label}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.meta}>
          {getMemberCountLabel(circle.member_count)}
        </Text>

        {circle.distance_miles !== null ? (
          <Text style={styles.meta}>
            {describeDistance(circle.distance_miles)}
          </Text>
        ) : null}

        {description ? (
          <Text numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing[4],
  },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[12],
    ...shadows.card,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[4],
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
    ...typography.label,
    fontSize: 11,
  },
  description: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageBox: {
    borderRadius: radii.sm,
    height: 64,
    overflow: 'hidden',
    width: 64,
  },
  meta: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  name: {
    color: colors.text,
    ...typography.itemName,
  },
});
