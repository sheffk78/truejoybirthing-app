const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // React Native text nodes routinely include natural punctuation; this web-focused
      // JSX rule creates noisy false positives in the app screens.
      'react/no-unescaped-entities': 'off',
      // lucide-react-native intentionally uses a namespace map for Ionicons compatibility.
      'import/namespace': 'off',
    },
  },
]);
