import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ItemSummary } from '../../lib/items';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { ItemCard } from '../ItemCard';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const owner = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

function buildItem(overrides?: Partial<ItemSummary>): ItemSummary {
  return {
    id: 'b2222222-2222-4222-8222-222222222222',
    name: 'Cordless drill',
    description: 'Charger included.',
    available: true,
    is_giveaway: false,
    giveaway_visibility: null,
    claim_status: null,
    created_at: '2026-05-26T18:30:00+00:00',
    image_url: 'https://images.example.test/drill.jpg',
    owner,
    category: { id: 'c3333333-3333-4333-8333-333333333333', name: 'Tools' },
    tags: [{ id: 'd4444444-4444-4444-8444-444444444444', name: 'power' }],
    ...overrides,
  };
}

describe('<ItemCard />', () => {
  test('renders the photo when image_url is set', () => {
    render(<ItemCard item={buildItem()} />);

    const image = screen.getByTestId('item-card-image');

    expect(image.props.source).toEqual([
      { uri: 'https://images.example.test/drill.jpg' },
    ]);
    expect(image.props.contentFit).toBe('cover');
    expect(screen.queryByTestId('image-placeholder')).toBeNull();
  });

  test('renders the placeholder when image_url is null', () => {
    render(<ItemCard item={buildItem({ image_url: null })} />);

    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
  });

  test('shows the giveaway ribbon when is_giveaway is true', () => {
    render(<ItemCard item={buildItem({ is_giveaway: true })} />);

    expect(screen.getByText('GIVEAWAY')).toBeTruthy();
  });

  test('shows the giveaway ribbon over the placeholder too', () => {
    render(
      <ItemCard item={buildItem({ is_giveaway: true, image_url: null })} />,
    );

    expect(screen.getByText('GIVEAWAY')).toBeTruthy();
    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
  });

  test('omits the ribbon when is_giveaway is false', () => {
    render(<ItemCard item={buildItem({ is_giveaway: false })} />);

    expect(screen.queryByText('GIVEAWAY')).toBeNull();
  });

  test('shows no availability badge when available', () => {
    render(
      <ItemCard
        item={buildItem({
          available: true,
          is_giveaway: true,
          claim_status: 'claimed',
        })}
      />,
    );

    expect(screen.queryByText('Rehomed')).toBeNull();
    expect(screen.queryByText('Pending Pickup')).toBeNull();
    expect(screen.queryByText('Borrowed')).toBeNull();
  });

  test('shows "Rehomed" for an unavailable, claimed giveaway', () => {
    render(
      <ItemCard
        item={buildItem({
          available: false,
          is_giveaway: true,
          claim_status: 'claimed',
        })}
      />,
    );

    expect(screen.getByText('Rehomed')).toBeTruthy();
  });

  test.each(['pending_pickup', 'unclaimed', null] as const)(
    'shows "Pending Pickup" for an unavailable giveaway with claim_status %s',
    (claimStatus) => {
      render(
        <ItemCard
          item={buildItem({
            available: false,
            is_giveaway: true,
            claim_status: claimStatus,
          })}
        />,
      );

      expect(screen.getByText('Pending Pickup')).toBeTruthy();
    },
  );

  test('shows "Borrowed" for an unavailable, non-giveaway item', () => {
    render(
      <ItemCard
        item={buildItem({
          available: false,
          is_giveaway: false,
          claim_status: null,
        })}
      />,
    );

    expect(screen.getByText('Borrowed')).toBeTruthy();
  });

  test('omits the description element when description is null', () => {
    render(<ItemCard item={buildItem({ description: null })} />);

    expect(screen.queryByText('Charger included.')).toBeNull();
  });

  test('omits the description element when description is empty', () => {
    render(<ItemCard item={buildItem({ description: '' })} />);

    expect(screen.queryByText('Charger included.')).toBeNull();
  });

  test('renders the category chip', () => {
    render(<ItemCard item={buildItem()} />);

    expect(screen.getByText('Tools')).toBeTruthy();
  });

  test('calls onPress with the item when pressed', () => {
    const onPress = jest.fn();
    const item = buildItem();

    render(<ItemCard item={item} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledWith(item);
  });

  test('is not announced as a button when onPress is absent', () => {
    render(<ItemCard item={buildItem()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('sets numberOfLines on the name and description so long text does not break layout', () => {
    const longName = 'A '.repeat(80).trim();
    const longDescription = 'B '.repeat(200).trim();

    render(
      <ItemCard
        item={buildItem({ name: longName, description: longDescription })}
      />,
    );

    expect(screen.getByText(longName).props.numberOfLines).toBe(2);
    expect(screen.getByText(longDescription).props.numberOfLines).toBe(3);
  });
});
