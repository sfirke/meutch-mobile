import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';

export type SelectionAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
};

export type SelectionBarProps = {
  count: number;
  onClose: () => void;
  actions: SelectionAction[];
};

// Bottom bar shown while selecting conversations: exit, count, and actions.
export function SelectionBar({ count, onClose, actions }: SelectionBarProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.bar}>
        <Pressable
          accessibilityLabel="Exit selection"
          accessibilityRole="button"
          hitSlop={spacing[8]}
          onPress={onClose}
          testID="selection-close"
        >
          <Icon color={colors.text} name="clear" size={20} />
        </Pressable>
        <Text style={styles.count}>{`${count} selected`}</Text>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              accessibilityLabel={action.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!action.disabled }}
              disabled={action.disabled}
              key={action.key}
              onPress={action.onPress}
              style={[styles.action, action.disabled && styles.disabled]}
              testID={`selection-action-${action.key}`}
            >
              <Icon color={colors.text} name={action.icon} size={18} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    gap: spacing[4],
    minWidth: 56,
  },
  actionLabel: {
    color: colors.text,
    ...typography.itemMeta,
    fontSize: 12,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    marginLeft: 'auto',
  },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  container: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  count: {
    color: colors.text,
    ...typography.body,
  },
  disabled: {
    opacity: 0.4,
  },
});
