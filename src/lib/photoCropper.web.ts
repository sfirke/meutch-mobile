import type { PickedPhoto } from './photoPicker';

// The cropper is a native module with no web build.
export const photoEditingAvailable = false;

export async function editPhoto(_uri: string): Promise<PickedPhoto | null> {
  return null;
}
