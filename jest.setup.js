// The native module isn't available under Jest; use the library's mock.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
