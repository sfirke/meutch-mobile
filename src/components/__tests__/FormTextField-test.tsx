import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { FormTextField } from '../FormTextField';

function renderField(
  props: Partial<ComponentProps<typeof FormTextField>> = {},
) {
  return render(
    <FormTextField
      field="name"
      label="Name"
      onChangeText={jest.fn()}
      value="Ada"
      {...props}
    />,
  );
}

describe('<FormTextField />', () => {
  test('renders the label, value and placeholder', () => {
    renderField({ placeholder: 'Your name' });

    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProp('value', 'Ada');
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
    expect(screen.getByTestId('field-name')).toBeTruthy();
  });

  test('calls onChangeText with the typed value', () => {
    const onChangeText = jest.fn();
    renderField({ onChangeText });

    fireEvent.changeText(screen.getByTestId('field-name'), 'Grace');

    expect(onChangeText).toHaveBeenCalledWith('Grace');
  });

  test('shows the hint', () => {
    renderField({ hint: 'Shown to neighbors.' });

    expect(screen.getByText('Shown to neighbors.')).toBeTruthy();
  });

  test('shows the error with a field-specific testID and hides it when absent', () => {
    const { rerender } = renderField({ error: 'Name is required.' });

    expect(screen.getByTestId('field-error-name')).toHaveTextContent(
      'Name is required.',
    );

    rerender(
      <FormTextField
        field="name"
        label="Name"
        onChangeText={jest.fn()}
        value="Ada"
      />,
    );

    expect(screen.queryByTestId('field-error-name')).toBeNull();
  });

  test('forwards extra TextInput props', () => {
    renderField({ keyboardType: 'numeric', maxLength: 5 });

    const input = screen.getByTestId('field-name');
    expect(input).toHaveProp('keyboardType', 'numeric');
    expect(input).toHaveProp('maxLength', 5);
  });
});
