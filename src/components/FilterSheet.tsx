import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

export type FilterSheetProps = {
  visible: boolean;
  title: string;
  /** Backdrop tap or Android back. */
  onClose: () => void;
  /** Footer "Reset". Does not close the sheet. */
  onReset: () => void;
  /** Footer "Apply". The parent closes the sheet itself after applying. */
  onApply: () => void;
  applyDisabled?: boolean;
  children: ReactNode;
};

// Bottom sheet that holds a draft of filter controls until Apply.
export function FilterSheet({
  visible,
  title,
  onClose,
  onReset,
  onApply,
  applyDisabled = false,
  children,
}: FilterSheetProps) {
  const { height } = useWindowDimensions();

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
        <View
          style={[styles.sheet, { maxHeight: height * 0.8 }]}
          testID="filter-sheet"
        >
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <ScrollView style={styles.body}>{children}</ScrollView>
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              hitSlop={spacing[8]}
              onPress={onReset}
              style={({ pressed }) => pressed && styles.pressed}
              testID="filter-sheet-reset"
            >
              <Text style={styles.reset}>Reset</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: applyDisabled }}
              disabled={applyDisabled}
              onPress={onApply}
              style={({ pressed }) => [
                styles.apply,
                pressed && styles.pressed,
                applyDisabled && styles.disabled,
              ]}
              testID="filter-sheet-apply"
            >
              <Text style={styles.applyLabel}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  apply: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  applyLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  body: {
    flexGrow: 0,
  },
  disabled: {
    opacity: 0.4,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[16],
  },
  pressed: {
    opacity: 0.7,
  },
  reset: {
    color: colors.primaryDark,
    ...typography.buttonSmall,
  },
  root: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
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
