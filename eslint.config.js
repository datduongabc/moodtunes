// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/**'],
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: {
      'expo/no-env-var-destructuring': 'off',
    },
  },
]);
