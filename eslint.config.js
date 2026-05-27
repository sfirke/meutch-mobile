const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores(['.expo/*', 'dist/*', 'web-build/*']),
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*-test.{ts,tsx}'],
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
