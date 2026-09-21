import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import type { ItemImage } from '../../lib/items';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { ImageCarousel } from '../ImageCarousel';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

function buildImage(overrides: Partial<ItemImage> & { id: string }): ItemImage {
  return {
    url: `https://images.example.test/${overrides.id}.jpg`,
    position: 0,
    created_at: '2026-05-26T18:30:00+00:00',
    ...overrides,
  };
}

const threeImages: ItemImage[] = [
  buildImage({ id: 'img-2', position: 2 }),
  buildImage({ id: 'img-0', position: 0 }),
  buildImage({ id: 'img-1', position: 1 }),
].sort((first, second) => first.position - second.position);

describe('<ImageCarousel />', () => {
  test('renders every photo in position order', () => {
    render(<ImageCarousel images={threeImages} itemName="Cordless drill" />);

    const images = screen.getAllByTestId('item-carousel-image');

    expect(images.map((image) => image.props.source)).toEqual([
      [{ uri: 'https://images.example.test/img-0.jpg' }],
      [{ uri: 'https://images.example.test/img-1.jpg' }],
      [{ uri: 'https://images.example.test/img-2.jpg' }],
    ]);
    expect(images[0].props.contentFit).toBe('cover');
  });

  test('labels each photo with its place in the set', () => {
    render(<ImageCarousel images={threeImages} itemName="Cordless drill" />);

    expect(
      screen.getByLabelText('Photo 1 of 3 of Cordless drill'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Photo 3 of 3 of Cordless drill'),
    ).toBeTruthy();
  });

  test('shows the page indicator and advances it on paging', () => {
    render(<ImageCarousel images={threeImages} itemName="Cordless drill" />);

    expect(screen.getByTestId('item-carousel-counter')).toHaveTextContent(
      '1 / 3',
    );

    const { width } = Dimensions.get('window');

    fireEvent(screen.getByTestId('item-carousel'), 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: width * 2, y: 0 },
      },
    });

    expect(screen.getByTestId('item-carousel-counter')).toHaveTextContent(
      '3 / 3',
    );
  });

  test('hides the page indicator for a single photo', () => {
    render(
      <ImageCarousel
        images={[buildImage({ id: 'img-0' })]}
        itemName="Cordless drill"
      />,
    );

    expect(screen.queryByTestId('item-carousel-indicator')).toBeNull();
    expect(screen.getByLabelText('Photo of Cordless drill')).toBeTruthy();
  });

  test('skips photos whose url did not normalize', () => {
    render(
      <ImageCarousel
        images={[
          buildImage({ id: 'img-0', position: 0, url: null }),
          buildImage({ id: 'img-1', position: 1 }),
        ]}
        itemName="Cordless drill"
      />,
    );

    const images = screen.getAllByTestId('item-carousel-image');

    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual([
      { uri: 'https://images.example.test/img-1.jpg' },
    ]);
  });

  test('falls back to the placeholder when no photo has a url', () => {
    render(
      <ImageCarousel
        images={[buildImage({ id: 'img-0', url: null })]}
        itemName="Cordless drill"
      />,
    );

    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('item-carousel-image')).toBeNull();
  });

  test('falls back to the placeholder when there are no photos', () => {
    render(<ImageCarousel images={[]} itemName="Cordless drill" />);

    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
  });
});
