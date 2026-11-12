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

import { colors, outline, radii, spacing, typography } from '../theme';
import { Button } from './ui/Button';
import { useSheetAnimation } from './ui/useSheetAnimation';

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
        <View
          style={[styles.sheet, { maxHeight: height * 0.8 }]}
          testID="filter-sheet"
        >
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <ScrollView style={styles.body}>{children}</ScrollView>
          <View style={styles.footer}>
            <Button
              label="Reset"
              onPress={onReset}
              testID="filter-sheet-reset"
              variant="link"
            />
            <Button
              disabled={applyDisabled}
              label="Apply"
              onPress={onApply}
              testID="filter-sheet-apply"
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 0,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[16],
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    height: 5,
    marginBottom: spacing[12],
    width: 44,
  },
  root: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
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
