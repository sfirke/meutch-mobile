const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

// Refresh tokens last 30 days, so a bearer credential written to unencrypted
// storage is a long-lived secret sitting in plaintext on disk, readable from a
// device backup or over adb on a rooted phone. Only expo-secure-store is an
// acceptable destination, and only from the session storage module.
const ASYNC_STORAGE_MESSAGE =
  'AsyncStorage is unencrypted. Persist session data through src/lib/sessionStorage.ts, which uses expo-secure-store.';
const SECURE_STORE_MESSAGE =
  'Import expo-secure-store only in src/lib/sessionStorage.ts so the credential boundary stays in one reviewable file.';

module.exports = defineConfig([
  globalIgnores(['.expo/*', 'dist/*', 'web-build/*']),
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    rules: {
      // Token and PII leaks into device logs are a one-line mistake; babel
      // strips console calls from production bundles as a second layer.
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@react-native-async-storage/async-storage',
              message: ASYNC_STORAGE_MESSAGE,
            },
            {
              name: 'expo-secure-store',
              message: SECURE_STORE_MESSAGE,
            },
          ],
          patterns: [
            {
              group: ['*async-storage*'],
              message: ASYNC_STORAGE_MESSAGE,
            },
          ],
        },
      ],
      // Catches AsyncStorage reached through a re-export or require() rather
      // than the banned import specifier.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='AsyncStorage'][property.name=/^(setItem|multiSet|mergeItem|multiMerge|getItem|multiGet)$/]",
          message: ASYNC_STORAGE_MESSAGE,
        },
      ],
    },
  },
  {
    // The one file allowed to touch the secure store directly.
    files: ['src/lib/sessionStorage.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@react-native-async-storage/async-storage',
              message: ASYNC_STORAGE_MESSAGE,
            },
          ],
          patterns: [
            {
              group: ['*async-storage*'],
              message: ASYNC_STORAGE_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/*-test.{ts,tsx}',
      'jest.setup.js',
    ],
    languageOptions: {
      globals: {
        afterAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
  },
]);
