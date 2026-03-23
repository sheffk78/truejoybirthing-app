/**
 * Expo Config Plugin to fix react-native-iap Gradle variant ambiguity
 * 
 * react-native-iap defines two product flavors: 'amazon' and 'play'
 * This plugin adds missingDimensionStrategy to select the 'play' variant
 * for Google Play Store builds.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

function withIAPStoreVariant(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Check if missingDimensionStrategy for 'store' is already present
    if (buildGradle.includes("missingDimensionStrategy 'store'") || 
        buildGradle.includes('missingDimensionStrategy "store"')) {
      console.log('[withIAPStoreVariant] missingDimensionStrategy already present, skipping');
      return config;
    }
    
    // Find the defaultConfig block and add missingDimensionStrategy
    // The pattern looks for 'defaultConfig {' and adds the strategy inside it
    const defaultConfigPattern = /defaultConfig\s*\{/;
    
    if (defaultConfigPattern.test(buildGradle)) {
      config.modResults.contents = buildGradle.replace(
        defaultConfigPattern,
        `defaultConfig {
        // Fix react-native-iap Gradle variant ambiguity
        // Select 'play' store variant for Google Play builds
        missingDimensionStrategy 'store', 'play'`
      );
      console.log('[withIAPStoreVariant] Added missingDimensionStrategy for store=play');
    } else {
      console.warn('[withIAPStoreVariant] Could not find defaultConfig block in build.gradle');
    }
    
    return config;
  });
}

module.exports = withIAPStoreVariant;
