import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../theme';

type FieldErrorProps = {
  field: string;
  message?: string;
};

export function FieldError({ field, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <Text
      accessibilityLiveRegion="polite"
      style={styles.errorText}
      testID={`field-error-${field}`}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: colors.danger,
    marginTop: spacing[4],
    ...typography.meta,
  },
});
