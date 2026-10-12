import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
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

// A form field that picks a calendar date: a native spinner sheet on iOS, the
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
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === 'set' && date) {
            commit(date);
          }
        },
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
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={open}
        style={[styles.box, disabled && styles.dim]}
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
                testID={`date-done-${field}`}
              >
                <Text style={styles.doneLabel}>Done</Text>
              </Pressable>
            </View>
            {draft ? (
              <DateTimePicker
                display="spinner"
                minimumDate={minimum}
                mode="date"
                onChange={(_event, date) => {
                  if (date) {
                    setDraft(date);
                  }
                }}
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  box: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
  },
  dim: {
    opacity: 0.6,
  },
  doneLabel: {
    color: colors.primaryDark,
    ...typography.buttonSmall,
  },
  label: {
    color: colors.secondary,
    ...typography.label,
  },
  placeholder: {
    color: colors.inputPlaceholder,
    ...typography.body,
  },
  root: {
    gap: spacing[8],
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
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
    color: colors.secondary,
    ...typography.label,
  },
  value: {
    color: colors.text,
    ...typography.body,
  },
});
