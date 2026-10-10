import { fireEvent, render, screen } from '@testing-library/react-native';

import type { CircleSummary } from '../../lib/circles';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { CircleCard } from '../CircleCard';
import { ICON_GLYPHS } from '../Icon';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

// Icons are decorative (hidden from the a11y tree), so finding them needs
// includeHiddenElements.
const HIDDEN = { includeHiddenElements: true };

function buildCircle(overrides: Partial<CircleSummary> = {}): CircleSummary {
  return {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Oak Street Tool Library',
    description: 'Shared tools for the block.',
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-15T09:00:00+00:00',
    image_url: 'https://images.example.test/oak-street.jpg',
    requires_join_approval: false,
    member_count: 12,
    is_member: false,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance: null,
    ...overrides,
  };
}

describe('<CircleCard />', () => {
  test('renders the circle name', () => {
    render(<CircleCard circle={buildCircle()} />);

    expect(screen.getByText('Oak Street Tool Library')).toBeTruthy();
  });

  test('shows the singular member count', () => {
    render(<CircleCard circle={buildCircle({ member_count: 1 })} />);

    expect(screen.getByText('1 member')).toBeTruthy();
  });

  test('shows the plural member count', () => {
    render(<CircleCard circle={buildCircle({ member_count: 12 })} />);

    expect(screen.getByText('12 members')).toBeTruthy();
  });

  test('shows the Open type chip', () => {
    render(<CircleCard circle={buildCircle({ circle_type: 'open' })} />);

    expect(screen.getByText('Open')).toBeTruthy();
    expect(
      screen.getByTestId(`icon-${ICON_GLYPHS.members}`, HIDDEN),
    ).toBeTruthy();
  });

  test('shows the Closed type chip with a lock icon', () => {
    render(<CircleCard circle={buildCircle({ circle_type: 'closed' })} />);

    expect(screen.getByText('Closed')).toBeTruthy();
    expect(screen.getByTestId(`icon-${ICON_GLYPHS.lock}`, HIDDEN)).toBeTruthy();
  });

  test('shows the Secret type chip with a lock icon', () => {
    render(<CircleCard circle={buildCircle({ circle_type: 'secret' })} />);

    expect(screen.getByText('Secret')).toBeTruthy();
    expect(screen.getByTestId(`icon-${ICON_GLYPHS.lock}`, HIDDEN)).toBeTruthy();
  });

  test('hides the type chip when circle_type is null', () => {
    render(<CircleCard circle={buildCircle({ circle_type: null })} />);

    expect(screen.queryByText('Open')).toBeNull();
    expect(screen.queryByText('Closed')).toBeNull();
    expect(screen.queryByText('Secret')).toBeNull();
  });

  test('renders distance verbatim when present', () => {
    render(<CircleCard circle={buildCircle({ distance: '2-5 mi' })} />);

    expect(screen.getByText('2-5 mi')).toBeTruthy();
  });

  test('omits distance when null', () => {
    render(<CircleCard circle={buildCircle({ distance: null })} />);

    expect(screen.queryByText(/\bmi\b/)).toBeNull();
  });

  test('shows the Admin status chip when is_admin is true, ahead of member', () => {
    render(
      <CircleCard circle={buildCircle({ is_admin: true, is_member: true })} />,
    );

    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.queryByText('Member')).toBeNull();
    expect(
      screen.getByTestId(`icon-${ICON_GLYPHS.admin}`, HIDDEN),
    ).toBeTruthy();
  });

  test('shows the Member status chip when is_member is true and not admin', () => {
    render(
      <CircleCard
        circle={buildCircle({
          is_admin: false,
          is_member: true,
          has_pending_join_request: true,
        })}
      />,
    );

    expect(screen.getByText('Member')).toBeTruthy();
    expect(screen.queryByText('Request pending')).toBeNull();
  });

  test('shows the Request pending status chip when a join request is pending', () => {
    render(
      <CircleCard
        circle={buildCircle({
          is_admin: false,
          is_member: false,
          has_pending_join_request: true,
        })}
      />,
    );

    expect(screen.getByText('Request pending')).toBeTruthy();
    expect(
      screen.getByTestId(`icon-${ICON_GLYPHS.pending}`, HIDDEN),
    ).toBeTruthy();
  });

  test('shows no status chip when none apply', () => {
    render(
      <CircleCard
        circle={buildCircle({
          is_admin: false,
          is_member: false,
          has_pending_join_request: false,
        })}
      />,
    );

    expect(screen.queryByText('Admin')).toBeNull();
    expect(screen.queryByText('Member')).toBeNull();
    expect(screen.queryByText('Request pending')).toBeNull();
  });

  test('renders the photo when image_url is set', () => {
    render(<CircleCard circle={buildCircle()} />);

    expect(screen.getByTestId('circle-card-image')).toBeTruthy();
    expect(screen.queryByTestId('image-placeholder')).toBeNull();
  });

  test('renders the placeholder when image_url is null', () => {
    render(<CircleCard circle={buildCircle({ image_url: null })} />);

    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('circle-card-image')).toBeNull();
  });

  test('renders the description, truncated to two lines', () => {
    render(<CircleCard circle={buildCircle()} />);

    const description = screen.getByText('Shared tools for the block.');

    expect(description.props.numberOfLines).toBe(2);
  });

  test('calls onPress with the circle when pressed', () => {
    const onPress = jest.fn();
    const circle = buildCircle();

    render(<CircleCard circle={circle} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledWith(circle);
  });

  test('exposes accessibilityRole button and label even without onPress', () => {
    render(<CircleCard circle={buildCircle()} />);

    const button = screen.getByRole('button');

    expect(button.props.accessibilityLabel).toBe('Oak Street Tool Library');
  });
});
