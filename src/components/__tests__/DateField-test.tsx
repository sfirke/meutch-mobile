import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

// The import resolver maps `../DateField` onto the `.web` platform file.
/* eslint-disable import/no-duplicates */
import { DateField } from '../DateField';
import { DateField as DateFieldWeb } from '../DateField.web';
/* eslint-enable import/no-duplicates */

const openAndroid = jest.mocked(DateTimePickerAndroid.open);

function setEvent(date: Date) {
  return {
    type: 'set',
    nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
  } as const;
}

beforeEach(() => {
  openAndroid.mockClear();
});

// jest.replaceProperty(Platform, 'OS', ...) persists until restored.
afterEach(() => {
  jest.restoreAllMocks();
});

describe('DateField', () => {
  test('shows the placeholder when nothing is chosen', () => {
    render(
      <DateField field="due" label="Due" onChange={jest.fn()} value={null} />,
    );

    expect(screen.getByText('Choose a date')).toBeTruthy();
  });

  test('shows the formatted value', () => {
    render(
      <DateField
        field="due"
        label="Due"
        onChange={jest.fn()}
        value="2026-06-03"
      />,
    );

    expect(screen.getByText('Jun 3, 2026')).toBeTruthy();
    expect(screen.queryByText('Choose a date')).toBeNull();
  });

  test('shows the error through FieldError', () => {
    render(
      <DateField
        error="Pick a later day"
        field="due"
        label="Due"
        onChange={jest.fn()}
        value={null}
      />,
    );

    expect(screen.getByTestId('field-error-due')).toHaveTextContent(
      'Pick a later day',
    );
  });

  test('does nothing when disabled', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(
      <DateField
        disabled
        field="due"
        label="Due"
        onChange={jest.fn()}
        value={null}
      />,
    );

    fireEvent.press(screen.getByTestId('date-field-due'));

    expect(openAndroid).not.toHaveBeenCalled();
    expect(screen.queryByTestId('date-sheet-due')).toBeNull();
  });

  describe('on iOS', () => {
    test('opens a sheet whose picker starts at the value and minimum', () => {
      render(
        <DateField
          field="due"
          label="Due"
          minimumDate="2026-06-01"
          onChange={jest.fn()}
          value="2026-06-03"
        />,
      );

      expect(screen.queryByTestId('date-sheet-due')).toBeNull();
      fireEvent.press(screen.getByTestId('date-field-due'));

      const picker = screen.getByTestId('date-time-picker');

      expect(picker.props.value).toEqual(new Date(2026, 5, 3));
      expect(picker.props.minimumDate).toEqual(new Date(2026, 5, 1));
    });

    test('starts at the minimum date when nothing is chosen', () => {
      render(
        <DateField
          field="due"
          label="Due"
          minimumDate="2026-06-01"
          onChange={jest.fn()}
          value={null}
        />,
      );

      fireEvent.press(screen.getByTestId('date-field-due'));

      expect(screen.getByTestId('date-time-picker').props.value).toEqual(
        new Date(2026, 5, 1),
      );
    });

    test('commits the spun date on Done as YYYY-MM-DD', () => {
      const onChange = jest.fn();
      render(
        <DateField field="due" label="Due" onChange={onChange} value={null} />,
      );

      fireEvent.press(screen.getByTestId('date-field-due'));
      const picked = new Date(2026, 6, 9);
      fireEvent(
        screen.getByTestId('date-time-picker'),
        'change',
        setEvent(picked),
        picked,
      );
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.press(screen.getByTestId('date-done-due'));

      expect(onChange).toHaveBeenCalledWith('2026-07-09');
      expect(screen.queryByTestId('date-sheet-due')).toBeNull();
    });

    test('cancelling closes without a change', () => {
      const onChange = jest.fn();
      render(
        <DateField field="due" label="Due" onChange={onChange} value={null} />,
      );

      fireEvent.press(screen.getByTestId('date-field-due'));
      const picked = new Date(2026, 6, 9);
      fireEvent(
        screen.getByTestId('date-time-picker'),
        'change',
        setEvent(picked),
        picked,
      );
      fireEvent.press(screen.getByLabelText('Cancel'));

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByTestId('date-sheet-due')).toBeNull();
    });
  });

  describe('on Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    test('opens the system dialog with the value and minimum', () => {
      render(
        <DateField
          field="due"
          label="Due"
          minimumDate="2026-06-01"
          onChange={jest.fn()}
          value="2026-06-03"
        />,
      );

      fireEvent.press(screen.getByTestId('date-field-due'));

      expect(openAndroid).toHaveBeenCalledTimes(1);
      expect(openAndroid.mock.calls[0][0]).toMatchObject({
        mode: 'date',
        value: new Date(2026, 5, 3),
        minimumDate: new Date(2026, 5, 1),
      });
      expect(screen.queryByTestId('date-sheet-due')).toBeNull();
    });

    test('commits a set event and ignores a dismissal', () => {
      const onChange = jest.fn();
      render(
        <DateField field="due" label="Due" onChange={onChange} value={null} />,
      );

      fireEvent.press(screen.getByTestId('date-field-due'));
      const { onChange: pickerOnChange } = openAndroid.mock.calls[0][0];
      const picked = new Date(2026, 6, 9);

      pickerOnChange?.(
        { type: 'dismissed', nativeEvent: { timestamp: 0, utcOffset: 0 } },
        undefined,
      );
      expect(onChange).not.toHaveBeenCalled();

      pickerOnChange?.(setEvent(picked), picked);
      expect(onChange).toHaveBeenCalledWith('2026-07-09');
    });
  });
});

describe('DateField.web', () => {
  test('commits only once the text parses', () => {
    const onChange = jest.fn();
    render(
      <DateFieldWeb field="due" label="Due" onChange={onChange} value={null} />,
    );

    const input = screen.getByTestId('date-field-due');
    fireEvent.changeText(input, '2026-06');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.props.value).toBe('2026-06');

    fireEvent.changeText(input, '2026-06-03');
    expect(onChange).toHaveBeenCalledWith('2026-06-03');
  });

  test('shows the error through FieldError', () => {
    render(
      <DateFieldWeb
        error="Pick a later day"
        field="due"
        label="Due"
        onChange={jest.fn()}
        value="2026-06-03"
      />,
    );

    expect(screen.getByTestId('date-field-due').props.value).toBe('2026-06-03');
    expect(screen.getByTestId('field-error-due')).toHaveTextContent(
      'Pick a later day',
    );
  });
});
