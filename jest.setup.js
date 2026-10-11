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
  // The source is a uri, or an image returned by an earlier renderAsync.
  const manipulate = jest.fn((source) => {
    const uri = typeof source === 'string' ? source : source.uri;
    const ctx = {
      resize: jest.fn(() => ctx),
      rotate: jest.fn(() => ctx),
      crop: jest.fn(() => ctx),
      renderAsync: jest.fn(async () => ({
        uri,
        width: 1600,
        height: 1200,
        saveAsync: jest.fn(async () => ({ uri, width: 1600, height: 1200 })),
      })),
    };
    return ctx;
  });
  return { SaveFormat, manipulateAsync, ImageManipulator: { manipulate } };
});

// expo-file-system's native File is unavailable under Jest; this stand-in is
// the Blob-like shape Expo's fetch reads an upload part from.
jest.mock('expo-file-system', () => ({
  File: class MockFile {
    constructor(uri) {
      this.uri = uri;
    }

    get name() {
      return this.uri.slice(this.uri.lastIndexOf('/') + 1);
    }

    get type() {
      return 'image/jpeg';
    }

    async bytes() {
      return new Uint8Array([0xff, 0xd8, 0xff]);
    }
  },
}));

// Gesture handler, worklets, and reanimated have no native runtime under
// Jest; use their official mocks.
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () =>
  jest.requireActual('react-native-worklets/src/mock'),
);
jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  const { useRef } = require('react');

  // The mock makes a new shared value on every render; keep the first, as the
  // real hook does.
  const useSharedValue = (init) => {
    const fresh = mock.useSharedValue(init);
    const ref = useRef(fresh);

    return ref.current;
  };

  return { ...mock, useSharedValue };
});
