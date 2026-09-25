import { StyleSheet, Text, View } from 'react-native';

import type { CircleMember } from '../lib/circles';
import { formatMonthYear } from '../lib/dates';
import { colors, radii, spacing, typography } from '../theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { MemberPressable } from './MemberPressable';

export type MemberRowProps = {
  member: CircleMember;
};

function buildAccessibilityLabel(
  member: CircleMember,
  joined: string | null,
): string {
  const parts = [member.user.full_name];

  if (member.is_admin) {
    parts.push('admin');
  }

  if (joined) {
    parts.push(`joined ${joined}`);
  }

  return parts.join(', ');
}

export function MemberRow({ member }: MemberRowProps) {
  const joined = formatMonthYear(member.joined_at);
  const viewable = member.user.profile_viewable;

  return (
    <View
      // When viewable, the MemberPressable link below carries its own label;
      // otherwise this label describes the display-only row.
      accessibilityLabel={
        viewable ? undefined : buildAccessibilityLabel(member, joined)
      }
      style={styles.row}
    >
      <MemberPressable style={styles.content} user={member.user}>
        <Avatar size={40} user={member.user} />

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{member.user.full_name}</Text>

            {member.is_admin ? (
              <View style={styles.adminChip}>
                <Icon color={colors.onPrimaryText} name="admin" size={11} />
                <Text style={styles.adminChipText}>Admin</Text>
              </View>
            ) : null}
          </View>

          {joined ? <Text style={styles.joined}>Joined {joined}</Text> : null}
        </View>
      </MemberPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  adminChip: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  adminChipText: {
    color: colors.onPrimaryText,
    ...typography.label,
    fontSize: 11,
  },
  body: {
    flex: 1,
    gap: spacing[4],
  },
  content: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[12],
  },
  joined: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  name: {
    color: colors.text,
    ...typography.itemName,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
});
