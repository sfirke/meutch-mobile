import {
  buildItemFormData,
  hasPhotoChanges,
  type PhotoChanges,
  type PhotoDraft,
} from '../itemPhotos';
import type { ItemWriteInput } from '../items';

const ID_A = 'a1111111-1111-4111-8111-111111111111';
const ID_B = 'b2222222-2222-4222-8222-222222222222';
const ID_C = 'c3333333-3333-4333-8333-333333333333';
const CATEGORY_ID = 'd4444444-4444-4444-8444-444444444444';

const input: ItemWriteInput = {
  name: 'Cordless drill',
  description: 'Charger included.',
  category_id: CATEGORY_ID,
  tags: ['power', 'tools'],
  is_giveaway: true,
  giveaway_visibility: 'public',
};

const existingA: PhotoDraft = { kind: 'existing', id: ID_A, url: null };
const existingB: PhotoDraft = {
  kind: 'existing',
  id: ID_B,
  url: 'https://cdn.example.test/b.jpg',
};
const newOne: PhotoDraft = {
  kind: 'new',
  key: 'k1',
  uri: 'file:///cache/one.jpg',
};
const newTwo: PhotoDraft = {
  kind: 'new',
  key: 'k2',
  uri: 'file:///cache/two.jpg',
};

function file(uri: string, index: number) {
  return { uri, name: `photo-${index}.jpg`, type: 'image/jpeg' };
}

// jest-expo stringifies RN file descriptors in `entries()`, so record the
// exact `append` calls instead.
function appendedParts(build: () => FormData): unknown[][] {
  const spy = jest.spyOn(FormData.prototype, 'append');

  try {
    build();

    return spy.mock.calls.map((call) => [...call]);
  } finally {
    spy.mockRestore();
  }
}

describe('hasPhotoChanges', () => {
  const initial = [ID_A, ID_B];

  test('is false when nothing changed', () => {
    expect(
      hasPhotoChanges({ photos: [existingA, existingB], deletedImageIds: [] }, [
        ...initial,
      ]),
    ).toBe(false);
    expect(hasPhotoChanges({ photos: [], deletedImageIds: [] }, [])).toBe(
      false,
    );
  });

  test('is true when a new photo is added', () => {
    expect(
      hasPhotoChanges(
        { photos: [existingA, existingB, newOne], deletedImageIds: [] },
        initial,
      ),
    ).toBe(true);
  });

  test('is true when an image is deleted', () => {
    expect(
      hasPhotoChanges(
        { photos: [existingA], deletedImageIds: [ID_B] },
        initial,
      ),
    ).toBe(true);
  });

  test('is true when existing photos are reordered', () => {
    expect(
      hasPhotoChanges(
        { photos: [existingB, existingA], deletedImageIds: [] },
        initial,
      ),
    ).toBe(true);
  });
});

describe('buildItemFormData', () => {
  test('create with two photos sends scalars, token, and files in order', () => {
    const changes: PhotoChanges = {
      photos: [newOne, newTwo],
      deletedImageIds: [],
    };

    expect(
      appendedParts(() =>
        buildItemFormData(input, changes, { creationToken: 'token-1' }),
      ),
    ).toEqual([
      ['name', 'Cordless drill'],
      ['description', 'Charger included.'],
      ['category_id', CATEGORY_ID],
      ['tags', 'power'],
      ['tags', 'tools'],
      ['is_giveaway', 'true'],
      ['giveaway_visibility', 'public'],
      ['creation_token', 'token-1'],
      ['images', file('file:///cache/one.jpg', 0)],
      ['images', file('file:///cache/two.jpg', 1)],
    ]);
  });

  test('edit with delete, add, and reorder sends image_order and deletions', () => {
    const changes: PhotoChanges = {
      photos: [existingB, newOne, existingA, newTwo],
      deletedImageIds: [ID_C],
    };

    expect(appendedParts(() => buildItemFormData(input, changes))).toEqual([
      ['name', 'Cordless drill'],
      ['description', 'Charger included.'],
      ['category_id', CATEGORY_ID],
      ['tags', 'power'],
      ['tags', 'tools'],
      ['is_giveaway', 'true'],
      ['giveaway_visibility', 'public'],
      ['images', file('file:///cache/one.jpg', 0)],
      ['images', file('file:///cache/two.jpg', 1)],
      ['image_order', ID_B],
      ['image_order', 'new-0'],
      ['image_order', ID_A],
      ['image_order', 'new-1'],
      ['delete_image_ids', ID_C],
    ]);
  });

  test('deleting every image sends only the deletion', () => {
    const changes: PhotoChanges = { photos: [], deletedImageIds: [ID_A] };

    expect(
      appendedParts(() => buildItemFormData(input, changes)).filter(
        ([name]) => name === 'image_order' || name === 'delete_image_ids',
      ),
    ).toEqual([['delete_image_ids', ID_A]]);
  });

  test('omits tags, description, and visibility when empty or null', () => {
    const lending: ItemWriteInput = {
      ...input,
      description: null,
      tags: [],
      is_giveaway: false,
      giveaway_visibility: null,
    };

    expect(
      appendedParts(() =>
        buildItemFormData(lending, { photos: [newOne], deletedImageIds: [] }),
      ),
    ).toEqual([
      ['name', 'Cordless drill'],
      ['category_id', CATEGORY_ID],
      ['is_giveaway', 'false'],
      ['images', file('file:///cache/one.jpg', 0)],
    ]);
  });
});
