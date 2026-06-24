// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// CRITICAL FIX: Enable ESM package exports resolution (SDK 54 default)
// Required for react-native-worklets/plugin to resolve correctly
// See: https://docs.expo.dev/guides/customizing-metro/#package-exports-support
config.resolver.unstable_enablePackageExports = true;

// --- SVG support via react-native-svg-transformer ---
// Remove 'svg' from assetExts so Metro processes SVGs through the transformer
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

// Ensure TTF fonts are processed as assets
if (!config.resolver.assetExts.includes('ttf')) {
  config.resolver.assetExts.push('ttf');
}

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
