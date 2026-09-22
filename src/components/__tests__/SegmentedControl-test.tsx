import { fireEvent, render, screen } from '@testing-library/react-native';

import { SegmentedControl } from '../SegmentedControl';

const options = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'archived', label: 'Archived' },
] as const;

describe('<SegmentedControl />', () => {
  test('renders every option label', () => {
    render(
      <SegmentedControl
        accessibilityLabel="Inbox filter"
        onChange={jest.fn()}
        options={[...options]}
        value="inbox"
      />,
    );

    expect(screen.getByText('Inbox')).toBeTruthy();
    expect(screen.getByText('Archived')).toBeTruthy();
  });

  test('marks the selected segment as selected', () => {
    render(
      <SegmentedControl
        accessibilityLabel="Inbox filter"
        onChange={jest.fn()}
        options={[...options]}
        value="archived"
      />,
    );

    expect(
      screen.getByRole('tab', { name: 'Archived', selected: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'Inbox', selected: false }),
    ).toBeTruthy();
  });

  test('calls onChange with the pressed segment', () => {
    const onChange = jest.fn();

    render(
      <SegmentedControl
        accessibilityLabel="Inbox filter"
        onChange={onChange}
        options={[...options]}
        value="inbox"
      />,
    );

    fireEvent.press(screen.getByText('Archived'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('archived');
  });

  test('does not call onChange when the selected segment is pressed', () => {
    const onChange = jest.fn();

    render(
      <SegmentedControl
        accessibilityLabel="Inbox filter"
        onChange={onChange}
        options={[...options]}
        value="inbox"
      />,
    );

    fireEvent.press(screen.getByText('Inbox'));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('exposes the accessibility label on the container', () => {
    render(
      <SegmentedControl
        accessibilityLabel="Inbox filter"
        onChange={jest.fn()}
        options={[...options]}
        value="inbox"
      />,
    );

    expect(screen.getByLabelText('Inbox filter')).toBeTruthy();
  });
});
