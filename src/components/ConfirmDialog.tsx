import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// Centred confirmation card. Built on Modal (not Alert.alert) so it works on web.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  pending = false,
  pendingLabel,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancel = () => {
    if (!pending) {
      onCancel();
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={cancel}
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={cancel}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card} testID="confirm-dialog">
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.error}
              testID="confirm-dialog-error"
            >
              {error}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pending && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
                pending && styles.disabled,
                pressed && styles.pressed,
              ]}
              testID="confirm-dialog-confirm"
            >
              {pending ? (
                <ActivityIndicator color={colors.onPrimaryText} size="small" />
              ) : null}
              <Text style={styles.confirmLabel}>
                {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing[24],
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    gap: spacing[12],
    maxWidth: 420,
    padding: spacing[20],
    width: '100%',
  },
  title: {
    color: colors.text,
    ...typography.value,
  },
  message: {
    color: colors.text,
    ...typography.body,
  },
  error: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.errorText,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
    ...typography.itemMeta,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'flex-end',
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  confirmButton: {
    backgroundColor: colors.primaryDark,
  },
  destructiveButton: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
  cancelLabel: {
    color: colors.text,
    ...typography.buttonLarge,
  },
  confirmLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
});
