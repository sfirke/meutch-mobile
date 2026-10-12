import { fireEvent, render, screen } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  filterTagSuggestions,
  normalizeTag,
  splitTagDraft,
  TagInput,
} from '../TagInput';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const known = [
  { id: '1', name: 'garden' },
  { id: '2', name: 'gardening' },
  { id: '3', name: 'games' },
  { id: '4', name: 'tools' },
];

function renderInput(props: Partial<Parameters<typeof TagInput>[0]> = {}) {
  const onChange = jest.fn();
  render(<TagInput onChange={onChange} value={[]} {...props} />);
  return { onChange, input: screen.getByTestId('tag-input-field') };
}

describe('normalizeTag', () => {
  test('trims, lowercases, and caps at 50 characters', () => {
    expect(normalizeTag('  Power Drill ')).toBe('power drill');
    expect(normalizeTag('x'.repeat(60))).toHaveLength(50);
    expect(normalizeTag('   ')).toBe('');
  });
});

describe('splitTagDraft', () => {
  test('splits on commas, drops empties, and dedupes', () => {
    expect(splitTagDraft('a, B ,, b, c,')).toEqual(['a', 'b', 'c']);
    expect(splitTagDraft('')).toEqual([]);
  });
});

describe('filterTagSuggestions', () => {
  test('matches by prefix, case-insensitively', () => {
    expect(filterTagSuggestions(known, 'GAR', []).map((s) => s.name)).toEqual([
      'garden',
      'gardening',
    ]);
  });

  test('excludes committed tags and empty drafts', () => {
    expect(
      filterTagSuggestions(known, 'g', ['Garden']).map((s) => s.name),
    ).toEqual(['gardening', 'games']);
    expect(filterTagSuggestions(known, ' ', [])).toEqual([]);
  });

  test('caps the number of results', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `tag${i}`,
    }));
    expect(filterTagSuggestions(many, 'tag', [])).toHaveLength(6);
    expect(filterTagSuggestions(many, 'tag', [], 2)).toHaveLength(2);
  });
});

describe('<TagInput />', () => {
  test('renders committed tags as chips with remove buttons', () => {
    renderInput({ value: ['drill', 'saw'] });

    expect(screen.getByTestId('tag-input')).toBeTruthy();
    expect(screen.getByText('drill')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove saw' })).toBeTruthy();
    expect(screen.getByLabelText('Tags')).toBeTruthy();
    expect(screen.getByPlaceholderText('Add a tag')).toBeTruthy();
  });

  test('removing a chip calls onChange without that tag', () => {
    const { onChange } = renderInput({ value: ['drill', 'saw'] });

    fireEvent.press(screen.getByRole('button', { name: 'Remove drill' }));

    expect(onChange).toHaveBeenCalledWith(['saw']);
  });

  test('typing a comma commits the draft and clears it', () => {
    const { onChange, input } = renderInput({ value: ['saw'] });

    fireEvent.changeText(input, 'drill');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.changeText(input, 'drill,');

    expect(onChange).toHaveBeenCalledWith(['saw', 'drill']);
    expect(input.props.value).toBe('');
  });

  test('submit commits the draft', () => {
    const { onChange, input } = renderInput();

    fireEvent.changeText(input, 'ladder');
    fireEvent(input, 'submitEditing');

    expect(onChange).toHaveBeenCalledWith(['ladder']);
    expect(input.props.value).toBe('');
  });

  test('blur commits the draft', () => {
    const { onChange, input } = renderInput();

    fireEvent.changeText(input, 'ladder');
    fireEvent(input, 'blur');

    expect(onChange).toHaveBeenCalledWith(['ladder']);
  });

  test('normalizes, dedupes, and caps the committed tag', () => {
    const { onChange, input } = renderInput({ value: ['saw'] });

    fireEvent.changeText(input, '  Power Drill  ');
    fireEvent(input, 'submitEditing');
    expect(onChange).toHaveBeenLastCalledWith(['saw', 'power drill']);

    onChange.mockClear();
    fireEvent.changeText(input, 'SAW');
    fireEvent(input, 'submitEditing');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.props.value).toBe('');

    fireEvent.changeText(input, '   ');
    fireEvent(input, 'submitEditing');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.changeText(input, 'x'.repeat(70));
    fireEvent(input, 'submitEditing');
    expect(onChange).toHaveBeenLastCalledWith(['saw', 'x'.repeat(50)]);
  });

  test('a pasted comma-separated draft commits every tag', () => {
    const { onChange, input } = renderInput({ value: ['b'] });

    fireEvent.changeText(input, 'a, b, c');

    expect(onChange).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(input.props.value).toBe('');
  });

  test('backspace on an empty draft removes the last chip', () => {
    const { onChange, input } = renderInput({ value: ['drill', 'saw'] });

    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(onChange).toHaveBeenCalledWith(['drill']);

    onChange.mockClear();
    fireEvent.changeText(input, 'x');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('shows prefix suggestions that are not committed, and tapping commits', () => {
    const { onChange, input } = renderInput({
      value: ['garden'],
      suggestions: known,
    });

    expect(screen.queryByRole('button', { name: /^Add / })).toBeNull();
    fireEvent.changeText(input, 'Gar');

    expect(screen.getByRole('button', { name: 'Add gardening' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add garden' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add games' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Add gardening' }));

    expect(onChange).toHaveBeenCalledWith(['garden', 'gardening']);
    expect(input.props.value).toBe('');
    expect(screen.queryByRole('button', { name: /^Add / })).toBeNull();
  });

  test('caps suggestions at six', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `tag${i}`,
    }));
    const { input } = renderInput({ suggestions: many });

    fireEvent.changeText(input, 'tag');

    expect(screen.getAllByRole('button', { name: /^Add / })).toHaveLength(6);
  });

  test('disabled state disables the input, removes, and suggestions', () => {
    const onChange = jest.fn();
    const props = { onChange, suggestions: known, value: ['drill'] };
    const { rerender } = render(<TagInput {...props} />);
    fireEvent.changeText(screen.getByTestId('tag-input-field'), 'g');
    rerender(<TagInput {...props} disabled />);

    expect(screen.getByTestId('tag-input-field').props.editable).toBe(false);
    const remove = screen.getByRole('button', { name: 'Remove drill' });
    expect(remove).toBeDisabled();
    fireEvent.press(remove);

    const suggestion = screen.getByRole('button', { name: 'Add garden' });
    expect(suggestion).toBeDisabled();
    fireEvent.press(suggestion);

    expect(onChange).not.toHaveBeenCalled();
  });

  test('accepts a custom label and testID', () => {
    renderInput({ accessibilityLabel: 'Item tags', testID: 'item-tags' });

    expect(screen.getByTestId('item-tags')).toBeTruthy();
    expect(screen.getByLabelText('Item tags')).toBeTruthy();
  });
});
