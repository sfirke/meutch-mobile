import { openCropper } from 'react-native-image-crop-picker';

import {
  PHOTO_MAX_DIMENSION,
  preparePhoto,
  type PickedPhoto,
} from './photoPicker';

export const photoEditingAvailable = true;

function isCancel(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'E_PICKER_CANCELLED';
}

/**
 * Opens the native crop and rotate screen on a local or remote photo.
 * Resolves null when the member cancels.
 */
export async function editPhoto(uri: string): Promise<PickedPhoto | null> {
  let cropped;
  try {
    cropped = await openCropper({
      path: uri,
      mediaType: 'photo',
      // The crop box starts at this shape, and iOS fits the result inside it.
      width: PHOTO_MAX_DIMENSION,
      height: PHOTO_MAX_DIMENSION,
      freeStyleCropEnabled: true,
      enableRotationGesture: true,
      cropperToolbarTitle: 'Edit photo',
      // preparePhoto does the one lossy save.
      compressImageQuality: 1,
    });
  } catch (error) {
    if (isCancel(error)) return null;
    throw error;
  }

  // iOS returns a bare path.
  const path = cropped.path.startsWith('/')
    ? `file://${cropped.path}`
    : cropped.path;

  return preparePhoto({
    uri: path,
    width: cropped.width,
    height: cropped.height,
  });
}
