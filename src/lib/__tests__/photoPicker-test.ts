import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  PHOTO_JPEG_QUALITY,
  pickFromLibrary,
  preparePhoto,
  takePhoto,
} from '../photoPicker';

const manipulate = ImageManipulator.manipulate as jest.Mock;
const requestLibrary =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const requestCamera = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const launchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const launchCamera = ImagePicker.launchCameraAsync as jest.Mock;

function lastContext() {
  return manipulate.mock.results[manipulate.mock.results.length - 1].value;
}

async function lastSave() {
  const image = await lastContext().renderAsync.mock.results[0].value;
  return image.saveAsync as jest.Mock;
}

const denied = { status: 'denied', granted: false, canAskAgain: false };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('preparePhoto', () => {
  it('resizes the width of a large landscape photo and saves JPEG', async () => {
    const photo = await preparePhoto({
      uri: 'file:///a.heic',
      width: 4000,
      height: 3000,
    });

    expect(manipulate).toHaveBeenCalledWith('file:///a.heic');
    expect(lastContext().resize).toHaveBeenCalledWith({ width: 1600 });
    expect(await lastSave()).toHaveBeenCalledWith({
      format: SaveFormat.JPEG,
      compress: PHOTO_JPEG_QUALITY,
    });
    expect(PHOTO_JPEG_QUALITY).toBe(0.8);
    expect(photo).toEqual({ uri: 'file:///a.heic', width: 1600, height: 1200 });
  });

  it('resizes the height of a large portrait photo', async () => {
    await preparePhoto({ uri: 'file:///p.jpg', width: 3000, height: 4000 });

    expect(lastContext().resize).toHaveBeenCalledWith({ height: 1600 });
  });

  it('does not resize a photo already within the limit', async () => {
    await preparePhoto({ uri: 'file:///s.jpg', width: 1600, height: 900 });

    expect(lastContext().resize).not.toHaveBeenCalled();
    expect(await lastSave()).toHaveBeenCalled();
  });

  it('does not resize when the size is unknown', async () => {
    await preparePhoto({ uri: 'file:///u.jpg', width: null });

    expect(lastContext().resize).not.toHaveBeenCalled();
  });
});

describe('pickFromLibrary', () => {
  it('reports denied permission', async () => {
    requestLibrary.mockResolvedValueOnce(denied);

    await expect(pickFromLibrary(3)).resolves.toEqual({
      kind: 'denied',
      source: 'library',
    });
    expect(launchLibrary).not.toHaveBeenCalled();
  });

  it('reports cancellation', async () => {
    await expect(pickFromLibrary(3)).resolves.toEqual({ kind: 'cancelled' });
  });

  it('prepares picked photos up to the remaining count', async () => {
    launchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///1.jpg', width: 100, height: 100 },
        { uri: 'file:///2.jpg', width: 100, height: 100 },
        { uri: 'file:///3.jpg', width: 100, height: 100 },
      ],
    });

    const result = await pickFromLibrary(2);

    expect(launchLibrary).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 2,
      quality: 1,
    });
    expect(result).toEqual({
      kind: 'picked',
      photos: [
        { uri: 'file:///1.jpg', width: 1600, height: 1200 },
        { uri: 'file:///2.jpg', width: 1600, height: 1200 },
      ],
    });
  });
});

describe('takePhoto', () => {
  it('reports denied permission', async () => {
    requestCamera.mockResolvedValueOnce(denied);

    await expect(takePhoto()).resolves.toEqual({
      kind: 'denied',
      source: 'camera',
    });
    expect(launchCamera).not.toHaveBeenCalled();
  });

  it('reports cancellation', async () => {
    await expect(takePhoto()).resolves.toEqual({ kind: 'cancelled' });
  });

  it('prepares the captured photo', async () => {
    launchCamera.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///c.jpg', width: 4032, height: 3024 }],
    });

    const result = await takePhoto();

    expect(launchCamera).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 1,
    });
    expect(lastContext().resize).toHaveBeenCalledWith({ width: 1600 });
    expect(result).toEqual({
      kind: 'picked',
      photos: [{ uri: 'file:///c.jpg', width: 1600, height: 1200 }],
    });
  });
});
