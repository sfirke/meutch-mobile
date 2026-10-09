import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';

export type OptionSheetOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  /** Small secondary text under the label, e.g. why the option is disabled. */
  hint?: string;
};

type OptionSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: OptionSheetOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

// Minimal bottom sheet for picking one option, e.g. the inbox sort order.
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheet} testID="option-sheet">
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {options.map((option) => {
            const selected = option.value === value;
            const disabled = option.disabled === true;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={
                  disabled ? { selected, disabled: true } : { selected }
                }
                disabled={disabled}
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={styles.row}
                testID={`option-${option.value}`}
              >
                <View style={[styles.body, disabled && styles.disabled]}>
                  <Text
                    style={[styles.label, selected && styles.labelSelected]}
                  >
                    {option.label}
                  </Text>
                  {option.hint ? (
                    <Text style={styles.hint}>{option.hint}</Text>
                  ) : null}
                </View>
                {selected ? (
                  <Icon color={colors.primaryDark} name="check" size={16} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingRight: spacing[12],
  },
  disabled: {
    opacity: 0.4,
  },
  hint: {
    color: colors.secondary,
    ...typography.meta,
  },
  label: {
    color: colors.text,
    ...typography.body,
  },
  labelSelected: {
    fontWeight: '700',
  },
  root: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[14],
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
  },
  title: {
    color: colors.secondary,
    marginBottom: spacing[8],
    ...typography.label,
  },
});
