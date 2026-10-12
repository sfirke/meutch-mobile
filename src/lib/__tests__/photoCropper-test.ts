import { ImageManipulator } from 'expo-image-manipulator';
import * as ImageCropPicker from 'react-native-image-crop-picker';

import { editPhoto } from '../photoCropper';
import { PHOTO_MAX_DIMENSION } from '../photoPicker';

const manipulate = ImageManipulator.manipulate as jest.Mock;
const openCropper = ImageCropPicker.openCropper as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('editPhoto', () => {
  it('opens a free-form cropper on the photo and prepares the result', async () => {
    openCropper.mockResolvedValueOnce({
      path: 'file:///tmp/cropped.jpg',
      width: 800,
      height: 600,
    });

    const photo = await editPhoto('https://example.com/a.jpg');

    expect(openCropper).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'https://example.com/a.jpg',
        mediaType: 'photo',
        freeStyleCropEnabled: true,
        width: PHOTO_MAX_DIMENSION,
        height: PHOTO_MAX_DIMENSION,
      }),
    );
    expect(manipulate).toHaveBeenCalledWith('file:///tmp/cropped.jpg');
    expect(photo?.uri).toBe('file:///tmp/cropped.jpg');
  });

  it('turns a bare path from iOS into a file uri', async () => {
    openCropper.mockResolvedValueOnce({
      path: '/private/var/tmp/cropped.jpg',
      width: 800,
      height: 600,
    });

    const photo = await editPhoto('file:///a.jpg');

    expect(photo?.uri).toBe('file:///private/var/tmp/cropped.jpg');
  });

  it('resolves null when the member cancels', async () => {
    openCropper.mockRejectedValueOnce(
      Object.assign(new Error('cancelled'), { code: 'E_PICKER_CANCELLED' }),
    );

    await expect(editPhoto('file:///a.jpg')).resolves.toBeNull();
    expect(manipulate).not.toHaveBeenCalled();
  });

  it('rethrows any other failure', async () => {
    const failure = Object.assign(new Error('missing'), {
      code: 'E_CROPPER_IMAGE_NOT_FOUND',
    });
    openCropper.mockRejectedValueOnce(failure);

    await expect(editPhoto('file:///a.jpg')).rejects.toBe(failure);
  });
});
