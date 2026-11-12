import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  calendarDateFromLocalDate,
  formatCalendarDate,
  localDateFromCalendarDate,
} from '../lib/dates';
import { colors, radii, spacing, typography } from '../theme';
import { inputStyles } from './ui/inputStyles';
import { FieldError } from './FieldError';

export type DateFieldProps = {
  label: string;
  /** `YYYY-MM-DD`, or null when nothing is chosen yet. */
  value: string | null;
  onChange: (value: string) => void;
  /** `YYYY-MM-DD`; the picker will not offer earlier days. */
  minimumDate?: string;
  /** Shown under the field, from the server's 422 or a local rule. */
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  /** Key for FieldError's testID (`field-error-<field>`) and the field's own `date-field-<field>`. */
  field: string;
};

// A form field that picks a calendar date: an inline calendar sheet on iOS, the
// system dialog on Android. Values in and out are `YYYY-MM-DD` strings.
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  error,
  disabled = false,
  placeholder = 'Choose a date',
  field,
}: DateFieldProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Date | null>(null);

  const minimum = minimumDate
    ? (localDateFromCalendarDate(minimumDate) ?? undefined)
    : undefined;
  const display = value ? formatCalendarDate(value) : null;

  function initialPickerDate(): Date {
    return (
      (value ? localDateFromCalendarDate(value) : null) ?? minimum ?? new Date()
    );
  }

  function commit(date: Date) {
    onChange(calendarDateFromLocalDate(date));
  }

  function open() {
    if (disabled) {
      return;
    }

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialPickerDate(),
        minimumDate: minimum,
        mode: 'date',
        onValueChange: (_event, date) => commit(date),
      });
      return;
    }

    setDraft(initialPickerDate());
    setSheetOpen(true);
  }

  function close() {
    setSheetOpen(false);
    setDraft(null);
  }

  function done() {
    if (draft) {
      commit(draft);
    }
    close();
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={open}
        style={[
          inputStyles.input,
          disabled && inputStyles.disabled,
          error ? inputStyles.error : null,
        ]}
        testID={`date-field-${field}`}
      >
        <Text style={display ? styles.value : styles.placeholder}>
          {display ?? placeholder}
        </Text>
      </Pressable>
      <FieldError field={field} message={error ?? undefined} />

      <Modal
        animationType="fade"
        onRequestClose={close}
        transparent
        visible={sheetOpen}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheet} testID={`date-sheet-${field}`}>
            <View style={styles.sheetHeader}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                {label}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={done}
                style={styles.doneButton}
                testID={`date-done-${field}`}
              >
                <Text style={styles.doneLabel}>Done</Text>
              </Pressable>
            </View>
            {draft ? (
              <DateTimePicker
                accentColor={colors.tealDeep}
                display="inline"
                minimumDate={minimum}
                mode="date"
                onValueChange={(_event, date) => setDraft(date)}
                value={draft}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  doneButton: {
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: spacing[12],
  },
  doneLabel: {
    color: colors.tealDeep,
    ...typography.buttonSmall,
  },
  label: {
    ...inputStyles.label,
    marginBottom: spacing[8],
  },
  placeholder: {
    color: colors.muted,
    ...typography.body,
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingBottom: spacing[24],
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },
  sheetTitle: {
    color: colors.ink,
    ...typography.label,
  },
  value: {
    color: colors.ink,
    ...typography.body,
  },
});
