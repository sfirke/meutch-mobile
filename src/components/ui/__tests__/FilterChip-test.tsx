import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterChip } from '../FilterChip';

describe('<FilterChip />', () => {
  test('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<FilterChip label="Lending" onPress={onPress} selected={false} />);
    fireEvent.press(screen.getByRole('checkbox', { name: 'Lending' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('exposes the selected state as checked', () => {
    render(<FilterChip label="Lending" onPress={jest.fn()} selected />);
    expect(
      screen.getByRole('checkbox', { name: 'Lending', checked: true }),
    ).toBeTruthy();
  });

  test('can act as a radio', () => {
    render(
      <FilterChip
        label="Nearby"
        onPress={jest.fn()}
        role="radio"
        selected={false}
      />,
    );
    expect(
      screen.getByRole('radio', { name: 'Nearby', checked: false }),
    ).toBeTruthy();
  });

  test('does not fire when disabled', () => {
    const onPress = jest.fn();
    render(
      <FilterChip
        disabled
        label="Lending"
        onPress={onPress}
        selected={false}
      />,
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Lending' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
