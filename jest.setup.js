// The native module isn't available under Jest; use the library's mock.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);

// expo-crypto's native randomUUID is unavailable under Jest; return distinct v4-shaped ids.
let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  },
}));

// Native picker/manipulator modules are unavailable under Jest.
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: true,
    assets: null,
  })),
}));

jest.mock('expo-image-manipulator', () => {
  const SaveFormat = { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' };
  const manipulateAsync = jest.fn(async (uri) => ({
    uri,
    width: 1600,
    height: 1200,
  }));
  const manipulate = jest.fn((uri) => {
    const ctx = {
      resize: jest.fn(() => ctx),
      renderAsync: jest.fn(async () => ({
        saveAsync: jest.fn(async () => ({ uri, width: 1600, height: 1200 })),
      })),
    };
    return ctx;
  });
  return { SaveFormat, manipulateAsync, ImageManipulator: { manipulate } };
});
