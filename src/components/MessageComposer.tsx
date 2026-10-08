import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { describeError, readFieldError } from '../lib/errorCopy';
import type { ConversationSubject } from '../lib/messages';
import { useStartConversationMutation } from '../query/useStartConversationMutation';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';

const MAX_BODY_LENGTH = 1000;

type MessageComposerProps = {
  /** Memoise it: the mutation captures the subject it is given. */
  subject: ConversationSubject;
  recipientName: string;
  placeholder: string;
  hint?: string;
  testID: string;
  errorTestID: string;
  onSent: (messageId: string) => void;
};

/** Starts, or continues, a conversation about an item or request. */
export function MessageComposer({
  subject,
  recipientName,
  placeholder,
  hint,
  testID,
  errorTestID,
  onSent,
}: MessageComposerProps) {
  const send = useStartConversationMutation(subject);
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !send.isPending;
  const failure = send.error ? describeError(send.error) : null;
  const failureMessage = readFieldError(send.error, 'body') ?? failure?.message;

  const handleSend = () => {
    const body = draft.trim();

    if (body.length === 0) {
      return;
    }

    send.mutate(body, {
      onSuccess: (message) => {
        setDraft('');
        onSent(message.id);
      },
    });
  };

  return (
    <View style={styles.composer} testID={testID}>
      <Text style={styles.label}>Message {recipientName}</Text>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {failure ? (
        <View style={styles.sendError} testID={errorTestID}>
          <Text style={styles.sendErrorTitle}>{failure.title}</Text>
          <Text style={styles.sendErrorMessage}>{failureMessage}</Text>
        </View>
      ) : null}

      <TextInput
        accessibilityLabel="Message"
        maxLength={MAX_BODY_LENGTH}
        multiline
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        style={styles.input}
        value={draft}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={handleSend}
        style={({ pressed }) => [
          styles.sendButton,
          !canSend && styles.sendButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Icon color={colors.onPrimaryText} name="send" size={14} />
        <Text style={styles.sendButtonLabel}>
          {send.isPending ? 'Sending…' : 'Send message'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    gap: spacing[8],
  },
  hint: {
    color: colors.secondary,
    ...typography.itemMeta,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    maxHeight: 160,
    minHeight: 88,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
    textAlignVertical: 'top',
  },
  label: {
    color: colors.secondary,
    ...typography.label,
  },
  pressed: {
    opacity: 0.75,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonLabel: {
    color: colors.onPrimaryText,
    ...typography.buttonLarge,
  },
  sendError: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing[4],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  sendErrorMessage: {
    color: colors.errorText,
    ...typography.itemMeta,
  },
  sendErrorTitle: {
    color: colors.errorLabel,
    ...typography.label,
  },
});
