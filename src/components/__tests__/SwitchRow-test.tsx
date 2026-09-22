import { fireEvent, render, screen } from '@testing-library/react-native';

import { SwitchRow } from '../SwitchRow';

describe('<SwitchRow />', () => {
  test('renders the label and description', () => {
    render(
      <SwitchRow
        description="Pause digest emails while you're away."
        label="Vacation mode"
        onValueChange={jest.fn()}
        value={false}
      />,
    );

    expect(screen.getByText('Vacation mode')).toBeTruthy();
    expect(
      screen.getByText("Pause digest emails while you're away."),
    ).toBeTruthy();
  });

  test('omits the description line when none is given', () => {
    render(
      <SwitchRow
        label="Vacation mode"
        onValueChange={jest.fn()}
        value={false}
      />,
    );

    expect(screen.queryByText(/digest emails/)).toBeNull();
  });

  test('toggling calls onValueChange with the new value', () => {
    const onValueChange = jest.fn();

    render(
      <SwitchRow
        label="Vacation mode"
        onValueChange={onValueChange}
        value={false}
      />,
    );

    fireEvent(screen.getByRole('switch'), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test('exposes the label as the switch accessibility label', () => {
    render(
      <SwitchRow
        label="Vacation mode"
        onValueChange={jest.fn()}
        value={true}
      />,
    );

    expect(screen.getByLabelText('Vacation mode')).toBeTruthy();
  });

  test('disabled sets accessibilityState and disables the switch', () => {
    render(
      <SwitchRow
        disabled
        label="Vacation mode"
        onValueChange={jest.fn()}
        value={false}
      />,
    );

    const switchElement = screen.getByRole('switch');

    expect(switchElement.props.accessibilityState.disabled).toBe(true);
    expect(switchElement.props.disabled).toBe(true);
  });
});
