import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export const PHOTO_MAX_DIMENSION = 1600;
export const PHOTO_JPEG_QUALITY = 0.8;

export type PickedPhoto = { uri: string; width: number; height: number };

export type PickResult =
  | { kind: 'picked'; photos: PickedPhoto[] }
  | { kind: 'cancelled' }
  | { kind: 'denied'; source: 'camera' | 'library' };

type PickerAsset = {
  uri: string;
  width?: number | null;
  height?: number | null;
};

// Downscale so the longest side is at most PHOTO_MAX_DIMENSION and re-encode
// as JPEG, which also converts HEIC (the server rejects it).
export async function preparePhoto(asset: PickerAsset): Promise<PickedPhoto> {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const context = ImageManipulator.manipulate(asset.uri);

  if (Math.max(width, height) > PHOTO_MAX_DIMENSION) {
    context.resize(
      width >= height
        ? { width: PHOTO_MAX_DIMENSION }
        : { height: PHOTO_MAX_DIMENSION },
    );
  }

  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: PHOTO_JPEG_QUALITY,
  });

  return { uri: saved.uri, width: saved.width, height: saved.height };
}

async function prepareAll(
  assets: PickerAsset[] | null | undefined,
  limit: number,
): Promise<PickResult> {
  const chosen = (assets ?? []).slice(0, Math.max(0, limit));

  if (chosen.length === 0) return { kind: 'cancelled' };

  const photos: PickedPhoto[] = [];
  for (const asset of chosen) photos.push(await preparePhoto(asset));

  return { kind: 'picked', photos };
}

export async function pickFromLibrary(remaining: number): Promise<PickResult> {
  if (remaining <= 0) return { kind: 'cancelled' };

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted === false) {
    return { kind: 'denied', source: 'library' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,
  });
  if (result.canceled) return { kind: 'cancelled' };

  return prepareAll(result.assets, remaining);
}

export async function takePhoto(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.granted === false) return { kind: 'denied', source: 'camera' };

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (result.canceled) return { kind: 'cancelled' };

  return prepareAll(result.assets, 1);
}
