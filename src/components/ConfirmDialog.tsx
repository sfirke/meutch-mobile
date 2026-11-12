import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, outline, radii, spacing, typography } from '../theme';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import { Lifted } from './ui/Lifted';
import { useSheetAnimation } from './ui/useSheetAnimation';

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
  const animationType = useSheetAnimation();
  const cancel = () => {
    if (!pending) {
      onCancel();
    }
  };

  return (
    <Modal
      animationType={animationType}
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
        <Lifted
          offset="dialog"
          radius={radii.card}
          reserveSpace
          style={styles.lifted}
        >
          <View style={styles.card} testID="confirm-dialog">
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {error ? (
              <Banner testID="confirm-dialog-error" tone="danger">
                {error}
              </Banner>
            ) : null}
            <View style={styles.buttons}>
              <Button
                disabled={pending}
                label={cancelLabel}
                onPress={onCancel}
                variant="outline"
              />
              <Button
                label={pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
                loading={pending}
                onPress={onConfirm}
                testID="confirm-dialog-confirm"
                variant={destructive ? 'danger' : 'primary'}
              />
            </View>
          </View>
        </Lifted>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: spacing[20],
  },
  lifted: {
    maxWidth: 420,
    width: '100%',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderRadius: radii.card,
    borderWidth: outline,
    gap: spacing[12],
    padding: spacing[20],
  },
  title: {
    color: colors.ink,
    ...typography.dialogTitle,
  },
  message: {
    color: colors.ink,
    ...typography.body,
  },
  buttons: {
    columnGap: spacing[12],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    rowGap: spacing[8],
  },
});
