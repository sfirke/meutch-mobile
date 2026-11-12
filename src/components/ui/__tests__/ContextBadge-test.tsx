import { render, screen } from '@testing-library/react-native';

import { ContextBadge, contextBadgeFor } from '../ContextBadge';

describe('<ContextBadge />', () => {
  test.each([
    ['item', 'Item: Folding ladder'],
    ['request', 'Request: Folding ladder'],
    ['circle', 'Circle: Folding ladder'],
  ] as const)('labels a %s badge', (kind, a11y) => {
    render(<ContextBadge kind={kind} label="Folding ladder" />);
    expect(screen.getByText('Folding ladder')).toBeTruthy();
    expect(screen.getByLabelText(a11y)).toBeTruthy();
  });
});

describe('contextBadgeFor', () => {
  test('maps each conversation context', () => {
    expect(
      contextBadgeFor({
        kind: 'item',
        item: { id: 'i1', name: 'Ladder', image_url: null },
      }),
    ).toEqual({ kind: 'item', label: 'Ladder' });
    expect(
      contextBadgeFor({
        kind: 'request',
        request: {
          id: 'r1',
          title: 'Need a drill',
          status: 'open',
          visibility: 'circles',
          expires_at: null,
        },
      }),
    ).toEqual({ kind: 'request', label: 'Need a drill' });
    expect(
      contextBadgeFor({
        kind: 'circle',
        circle: {
          id: 'c1',
          name: 'Elm Street',
          circle_type: 'open',
          image_url: null,
        },
      }),
    ).toEqual({ kind: 'circle', label: 'Elm Street' });
    expect(contextBadgeFor({ kind: 'none' })).toBeNull();
  });
});
