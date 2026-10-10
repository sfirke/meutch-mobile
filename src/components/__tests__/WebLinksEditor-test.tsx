import { fireEvent, render, screen } from '@testing-library/react-native';

import type { WebLink } from '../../lib/profile';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  hasLinkChanges,
  newLinkDraft,
  toLinkDrafts,
  toLinkInputs,
  WebLinksEditor,
  type LinkDraft,
} from '../WebLinksEditor';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const savedLinks: WebLink[] = [
  {
    id: 'l1',
    platform_type: 'website',
    platform_name: null,
    display_name: 'Website',
    url: 'https://example.com',
    display_order: 0,
  },
  {
    id: 'l2',
    platform_type: 'other',
    platform_name: 'Fake Club',
    display_name: 'Fake Club',
    url: 'https://example.com/club',
    display_order: 1,
  },
];

const drafts = toLinkDrafts(savedLinks);

function draft(key: string, overrides: Partial<LinkDraft> = {}): LinkDraft {
  return {
    key,
    platform: 'website',
    custom_name: '',
    url: `https://example.com/${key}`,
    ...overrides,
  };
}

function renderEditor(
  props: Partial<Parameters<typeof WebLinksEditor>[0]> = {},
) {
  const onChange = jest.fn();

  render(<WebLinksEditor links={drafts} onChange={onChange} {...props} />);

  return { onChange };
}

describe('toLinkDrafts', () => {
  test('maps the read shape, keeping names only for other', () => {
    expect(drafts).toEqual([
      {
        key: 'saved-l1',
        platform: 'website',
        custom_name: '',
        url: 'https://example.com',
      },
      {
        key: 'saved-l2',
        platform: 'other',
        custom_name: 'Fake Club',
        url: 'https://example.com/club',
      },
    ]);
  });
});

describe('newLinkDraft', () => {
  test('starts as an empty website link with a unique key', () => {
    const first = newLinkDraft();
    const second = newLinkDraft();

    expect(first).toMatchObject({
      platform: 'website',
      custom_name: '',
      url: '',
    });
    expect(first.key).not.toBe(second.key);
  });
});

describe('toLinkInputs', () => {
  test('skips blank urls and maps sent indexes back to row keys', () => {
    const result = toLinkInputs([
      draft('a', { url: '   ' }),
      draft('b', { url: ' example.com/b ', custom_name: 'ignored' }),
      draft('c', { platform: 'other', custom_name: ' Fake Club ' }),
    ]);

    expect(result.inputs).toEqual([
      { platform: 'website', custom_name: null, url: 'https://example.com/b' },
      {
        platform: 'other',
        custom_name: 'Fake Club',
        url: 'https://example.com/c',
      },
    ]);
    expect(result.keysBySentIndex).toEqual(['b', 'c']);
  });
});

describe('hasLinkChanges', () => {
  test('is false for untouched drafts', () => {
    expect(hasLinkChanges(drafts, savedLinks)).toBe(false);
  });

  test('ignores a new blank row', () => {
    expect(hasLinkChanges([...drafts, newLinkDraft()], savedLinks)).toBe(false);
  });

  test('is true after a url edit, a removal, or a reorder', () => {
    expect(
      hasLinkChanges(
        [{ ...drafts[0], url: 'https://example.com/new' }, drafts[1]],
        savedLinks,
      ),
    ).toBe(true);
    expect(hasLinkChanges([drafts[1]], savedLinks)).toBe(true);
    expect(hasLinkChanges([drafts[1], drafts[0]], savedLinks)).toBe(true);
  });
});

describe('<WebLinksEditor />', () => {
  test('renders one row per draft with the Name field only for other', () => {
    renderEditor();

    expect(screen.getByText('Links')).toBeOnTheScreen();
    expect(screen.getByLabelText('Platform: Website')).toBeOnTheScreen();
    expect(screen.getByLabelText('Platform: Other')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('URL')).toHaveLength(2);
    expect(screen.queryByTestId('field-link-saved-l1-name')).toBeNull();
    expect(screen.getByTestId('field-link-saved-l2-name')).toHaveProp(
      'value',
      'Fake Club',
    );
    expect(screen.getByTestId('link-count')).toHaveTextContent('2 of 5 links');
  });

  test('changes the platform from the sheet', () => {
    const { onChange } = renderEditor();

    fireEvent.press(screen.getByLabelText('Platform: Website'));
    fireEvent.press(screen.getByTestId('option-other'));

    const next = onChange.mock.calls[0][0] as LinkDraft[];
    expect(next[0]).toEqual({ ...drafts[0], platform: 'other' });
    expect(next[1]).toBe(drafts[1]);
    expect(screen.queryByTestId('option-sheet')).toBeNull();

    screen.rerender(<WebLinksEditor links={next} onChange={onChange} />);
    expect(screen.getByTestId('field-link-saved-l1-name')).toBeOnTheScreen();
  });

  test('edits the url', () => {
    const { onChange } = renderEditor();

    fireEvent.changeText(
      screen.getByTestId('field-link-saved-l1-url'),
      'example.org',
    );

    expect(onChange).toHaveBeenCalledWith([
      { ...drafts[0], url: 'example.org' },
      drafts[1],
    ]);
  });

  test('edits the custom name', () => {
    const { onChange } = renderEditor();

    fireEvent.changeText(
      screen.getByTestId('field-link-saved-l2-name'),
      'Fake Group',
    );

    expect(onChange).toHaveBeenCalledWith([
      drafts[0],
      { ...drafts[1], custom_name: 'Fake Group' },
    ]);
  });

  test('removes a row', () => {
    const { onChange } = renderEditor();

    fireEvent.press(screen.getAllByLabelText('Remove link')[0]);

    expect(onChange).toHaveBeenCalledWith([drafts[1]]);
  });

  test('appends a blank draft and hides Add link at five', () => {
    const { onChange } = renderEditor();

    fireEvent.press(screen.getByText('Add link'));

    const next = onChange.mock.calls[0][0] as LinkDraft[];
    expect(next).toHaveLength(3);
    expect(next.slice(0, 2)).toEqual(drafts);
    expect(next[2]).toMatchObject({ platform: 'website', url: '' });

    const five = ['a', 'b', 'c', 'd', 'e'].map((key) => draft(key));
    screen.rerender(<WebLinksEditor links={five} onChange={onChange} />);
    expect(screen.queryByText('Add link')).toBeNull();
    expect(screen.getByTestId('link-count')).toHaveTextContent('5 of 5 links');
  });

  test('shows errors beside the matching row', () => {
    renderEditor({
      errors: {
        'saved-l2': {
          platform: 'Choose a platform.',
          custom_name: 'Name is required.',
          url: 'Enter a valid URL.',
        },
      },
    });

    expect(
      screen.getByTestId('field-error-link-saved-l2-platform'),
    ).toHaveTextContent('Choose a platform.');
    expect(
      screen.getByTestId('field-error-link-saved-l2-name'),
    ).toHaveTextContent('Name is required.');
    expect(
      screen.getByTestId('field-error-link-saved-l2-url'),
    ).toHaveTextContent('Enter a valid URL.');
    expect(screen.queryByTestId('field-error-link-saved-l1-url')).toBeNull();
  });

  test('disables every control when disabled', () => {
    const { onChange } = renderEditor({ disabled: true });

    expect(screen.getByRole('button', { name: 'Add link' })).toBeDisabled();
    expect(screen.getByLabelText('Platform: Website')).toBeDisabled();
    expect(screen.getAllByLabelText('Remove link')[0]).toBeDisabled();
    expect(screen.getByTestId('field-link-saved-l1-url')).toBeDisabled();
    expect(screen.getByTestId('field-link-saved-l2-name')).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Platform: Website'));
    fireEvent.press(screen.getAllByLabelText('Remove link')[0]);
    expect(screen.queryByTestId('option-sheet')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
