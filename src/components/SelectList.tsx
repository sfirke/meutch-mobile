import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, outline, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';

export type SelectListOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  /** Small secondary text under the label, e.g. why the option is disabled. */
  hint?: string;
};

export type SelectListProps<T extends string> = {
  options: SelectListOption<T>[];
  /** Selected values. In single-select mode this has zero or one entry. */
  value: T[];
  onChange: (value: T[]) => void;
  /** Default false: picking a row replaces the selection. */
  multiple?: boolean;
  accessibilityLabel?: string;
};

// Check-mark rows for picking one or several options inside a sheet.
export function SelectList<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  accessibilityLabel,
}: SelectListProps<T>) {
  function handlePress(optionValue: T, checked: boolean) {
    if (multiple) {
      onChange(
        checked
          ? value.filter((selected) => selected !== optionValue)
          : [...value, optionValue],
      );
    } else if (!checked) {
      onChange([optionValue]);
    }
  }

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="list">
      {options.map((option) => {
        const checked = value.includes(option.value);
        const disabled = option.disabled === true;

        return (
          <Pressable
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked, disabled }}
            disabled={disabled}
            key={option.value}
            onPress={() => handlePress(option.value, checked)}
            style={styles.row}
            testID={`select-${option.value}`}
          >
            <View style={[styles.body, disabled && styles.disabled]}>
              <Text style={[styles.label, checked && styles.labelChecked]}>
                {option.label}
              </Text>
              {option.hint ? (
                <Text style={styles.hint}>{option.hint}</Text>
              ) : null}
            </View>
            <View
              style={[
                styles.mark,
                multiple ? styles.box : styles.circle,
                checked && styles.markChecked,
                disabled && styles.disabled,
              ]}
            >
              {checked ? (
                <Icon color={colors.white} name="check" size={12} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
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
    color: colors.muted,
    ...typography.meta,
  },
  label: {
    color: colors.ink,
    ...typography.body,
  },
  labelChecked: {
    fontFamily: fonts.body[700],
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: outline,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  box: {
    borderRadius: radii.tag,
  },
  circle: {
    borderRadius: radii.pill,
  },
  markChecked: {
    backgroundColor: colors.ink,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[14],
  },
});
