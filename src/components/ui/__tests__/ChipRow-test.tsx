import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import {
  ChipRow,
  isEverythingSelected,
  nextChipSelection,
  type ChipOption,
} from '../ChipRow';

const ALL = ['requests', 'giveaways', 'loans', 'circle_joins'] as const;
type Kind = (typeof ALL)[number];

const options: ChipOption<Kind>[] = [
  { value: 'requests', label: 'Requests' },
  { value: 'giveaways', label: 'Giveaways' },
  { value: 'loans', label: 'Lending' },
  { value: 'circle_joins', label: 'Circles' },
];

describe('nextChipSelection', () => {
  test.each<[string, Kind[], Kind | null, Kind[]]>([
    ['from Everything selects just the chip', [...ALL], 'loans', ['loans']],
    [
      'from an empty selection selects just the chip',
      [],
      'giveaways',
      ['giveaways'],
    ],
    ['adds a chip', ['loans'], 'requests', ['requests', 'loans']],
    ['removes a chip', ['requests', 'loans'], 'loans', ['requests']],
    [
      'turning off the last chip returns to Everything',
      ['loans'],
      'loans',
      [...ALL],
    ],
    [
      'turning on every chip returns to Everything',
      ['requests', 'giveaways', 'loans'],
      'circle_joins',
      [...ALL],
    ],
    ['tapping Everything resets', ['loans'], null, [...ALL]],
    ['tapping Everything while on it stays', [...ALL], null, [...ALL]],
  ])('%s', (_name, selected, tapped, expected) => {
    expect(nextChipSelection(selected, tapped, ALL)).toEqual(expected);
  });

  test('isEverythingSelected treats empty and full as Everything', () => {
    expect(isEverythingSelected([], ALL)).toBe(true);
    expect(isEverythingSelected([...ALL], ALL)).toBe(true);
    expect(isEverythingSelected(['loans'], ALL)).toBe(false);
  });
});

function MultiHarness({ onChange }: { onChange?: (next: Kind[]) => void }) {
  const [selected, setSelected] = useState<Kind[]>([...ALL]);
  return (
    <ChipRow
      accessibilityLabel="Filter by type"
      mode="multi"
      onChange={(next) => {
        setSelected(next);
        onChange?.(next);
      }}
      options={options}
      selected={selected}
    />
  );
}

describe('<ChipRow /> multi', () => {
  test('starts on Everything', () => {
    render(<MultiHarness />);
    expect(
      screen.getByRole('checkbox', { name: 'Everything', checked: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'Lending', checked: false }),
    ).toBeTruthy();
  });

  test('toggles chips and falls back to Everything', () => {
    const onChange = jest.fn();
    render(<MultiHarness onChange={onChange} />);

    fireEvent.press(screen.getByRole('checkbox', { name: 'Lending' }));
    expect(onChange).toHaveBeenLastCalledWith(['loans']);
    expect(
      screen.getByRole('checkbox', { name: 'Lending', checked: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'Everything', checked: false }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('checkbox', { name: 'Requests' }));
    expect(onChange).toHaveBeenLastCalledWith(['requests', 'loans']);

    fireEvent.press(screen.getByRole('checkbox', { name: 'Requests' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Lending' }));
    expect(onChange).toHaveBeenLastCalledWith([...ALL]);
    expect(
      screen.getByRole('checkbox', { name: 'Everything', checked: true }),
    ).toBeTruthy();
  });

  test('uses a custom Everything label', () => {
    render(
      <ChipRow
        everythingLabel="All"
        mode="multi"
        onChange={jest.fn()}
        options={options}
        selected={[]}
      />,
    );
    expect(
      screen.getByRole('checkbox', { name: 'All', checked: true }),
    ).toBeTruthy();
  });
});

describe('<ChipRow /> single', () => {
  test('selects one option as a radio', () => {
    const onChange = jest.fn();
    render(
      <ChipRow
        mode="single"
        onChange={onChange}
        options={options}
        selected="requests"
      />,
    );
    expect(screen.queryByText('Everything')).toBeNull();
    expect(
      screen.getByRole('radio', { name: 'Requests', checked: true }),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Circles' }));
    expect(onChange).toHaveBeenCalledWith('circle_joins');
  });
});
