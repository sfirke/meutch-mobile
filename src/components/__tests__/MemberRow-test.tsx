import { render, screen } from '@testing-library/react-native';

import type { CircleMember } from '../../lib/circles';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { MemberRow } from '../MemberRow';
import { ICON_GLYPHS } from '../Icon';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

// Icons are decorative (hidden from the a11y tree), so finding them needs
// includeHiddenElements.
const HIDDEN = { includeHiddenElements: true };

function buildMember(overrides: Partial<CircleMember> = {}): CircleMember {
  return {
    user: {
      id: 'a1111111-1111-4111-8111-111111111111',
      first_name: 'Ada',
      last_name: 'Example',
      full_name: 'Ada Example',
      profile_image_url: null,
      profile_viewable: false,
    },
    joined_at: '2026-01-15T09:00:00+00:00',
    is_admin: false,
    ...overrides,
  };
}

describe('<MemberRow />', () => {
  test('renders the member name', () => {
    render(<MemberRow member={buildMember()} />);

    expect(screen.getByText('Ada Example')).toBeTruthy();
  });

  test('shows the Admin chip when is_admin is true', () => {
    render(<MemberRow member={buildMember({ is_admin: true })} />);

    expect(screen.getByText('Admin')).toBeTruthy();
    expect(
      screen.getByTestId(`icon-${ICON_GLYPHS.admin}`, HIDDEN),
    ).toBeTruthy();
  });

  test('omits the Admin chip when is_admin is false', () => {
    render(<MemberRow member={buildMember({ is_admin: false })} />);

    expect(screen.queryByText('Admin')).toBeNull();
  });

  test('shows the joined month and year', () => {
    render(
      <MemberRow
        member={buildMember({ joined_at: '2026-01-15T09:00:00+00:00' })}
      />,
    );

    expect(screen.getByText('Joined Jan 2026')).toBeTruthy();
  });

  test('omits the joined line when joined_at is unparseable', () => {
    render(<MemberRow member={buildMember({ joined_at: 'not a date' })} />);

    expect(screen.queryByText(/^Joined/)).toBeNull();
  });

  test('falls back to initials when the member has no photo', () => {
    render(<MemberRow member={buildMember()} />);

    expect(screen.getByTestId('avatar-initials')).toBeTruthy();
    expect(screen.getByText('AE')).toBeTruthy();
  });

  test('builds an accessibility label that is not color-only', () => {
    render(
      <MemberRow
        member={buildMember({
          is_admin: true,
          joined_at: '2026-01-15T09:00:00+00:00',
        })}
      />,
    );

    const [label] = screen.getAllByLabelText(
      'Ada Example, admin, joined Jan 2026',
    );

    expect(label).toBeTruthy();
  });
});
