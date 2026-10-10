import type { ItemWriteInput } from './items';

/** A photo on the item form: one already on the server, or one picked locally. */
export type PhotoDraft =
  | { kind: 'existing'; id: string; url: string | null }
  | { kind: 'new'; key: string; uri: string };

/** The backend rejects more than this many images per item. */
export const MAX_ITEM_PHOTOS = 8;

export type PhotoChanges = { photos: PhotoDraft[]; deletedImageIds: string[] };

/** React Native's FormData file part; `uri` is a local file, sent untouched. */
type FilePart = { uri: string; name: string; type: string };

export function hasPhotoChanges(
  changes: PhotoChanges,
  initialExistingIds: string[],
): boolean {
  if (changes.deletedImageIds.length > 0) {
    return true;
  }

  if (changes.photos.some((photo) => photo.kind === 'new')) {
    return true;
  }

  const existingIds = changes.photos.flatMap((photo) =>
    photo.kind === 'existing' ? [photo.id] : [],
  );

  return (
    existingIds.length !== initialExistingIds.length ||
    existingIds.some((id, index) => id !== initialExistingIds[index])
  );
}

/** Multipart body for item create and update (meutch#557). */
export function buildItemFormData(
  input: ItemWriteInput,
  changes: PhotoChanges,
  extra?: { creationToken?: string },
): FormData {
  const formData = new FormData();

  formData.append('name', input.name);

  if (input.description !== null) {
    formData.append('description', input.description);
  }

  formData.append('category_id', input.category_id);
  input.tags.forEach((tag) => formData.append('tags', tag));
  formData.append('is_giveaway', input.is_giveaway ? 'true' : 'false');

  if (input.giveaway_visibility !== null) {
    formData.append('giveaway_visibility', input.giveaway_visibility);
  }

  if (extra?.creationToken !== undefined) {
    formData.append('creation_token', extra.creationToken);
  }

  const imageOrder: string[] = [];
  let newCount = 0;

  changes.photos.forEach((photo) => {
    if (photo.kind === 'existing') {
      imageOrder.push(photo.id);

      return;
    }

    const part: FilePart = {
      uri: photo.uri,
      name: `photo-${newCount}.jpg`,
      type: 'image/jpeg',
    };

    formData.append('images', part as unknown as Blob);
    imageOrder.push(`new-${newCount}`);
    newCount += 1;
  });

  // Create has no existing images, and its schema rejects these fields.
  if (newCount < imageOrder.length || changes.deletedImageIds.length > 0) {
    imageOrder.forEach((entry) => formData.append('image_order', entry));
    changes.deletedImageIds.forEach((id) =>
      formData.append('delete_image_ids', id),
    );
  }

  return formData;
}
