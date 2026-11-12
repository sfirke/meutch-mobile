import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors, fonts, outline, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { useSheetAnimation } from './ui/useSheetAnimation';

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
  /** Omit for an action menu: no row is then marked selected. */
  value?: T;
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
  const { height } = useWindowDimensions();
  const animationType = useSheetAnimation();

  return (
    <Modal
      animationType={animationType}
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
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: height * 0.6 }}
          >
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
                    <Icon color={colors.ink} name="check" size={16} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
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
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    height: 5,
    marginBottom: spacing[12],
    width: 44,
  },
  hint: {
    color: colors.muted,
    ...typography.meta,
  },
  label: {
    color: colors.ink,
    ...typography.body,
  },
  labelSelected: {
    fontFamily: fonts.body[700],
  },
  root: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing[14],
  },
  sheet: {
    backgroundColor: colors.paper,
    borderColor: colors.ink,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: outline,
    borderBottomWidth: 0,
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[20],
    paddingTop: spacing[12],
  },
  title: {
    color: colors.ink,
    marginBottom: spacing[8],
    ...typography.h3,
  },
});
