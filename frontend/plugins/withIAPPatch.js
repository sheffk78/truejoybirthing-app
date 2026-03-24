/**
 * Expo config plugin to patch react-native-iap for React Native 0.81+ compatibility (Android only)
 * 
 * This plugin patches RNIapModule.kt to replace deprecated `currentActivity`
 * with `reactApplicationContext.currentActivity` (required for RN 0.80+)
 * 
 * Note: iOS patching is handled by the postinstall script (scripts/patch-iap.js)
 * which runs after npm install but before expo prebuild and pod install.
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withIAPPatch(config) {
  // Apply Android patch only
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      // Path to the RNIapModule.kt file
      const iapModulePath = path.join(
        projectRoot,
        'node_modules',
        'react-native-iap',
        'android',
        'src',
        'play',
        'java',
        'com',
        'dooboolab',
        'rniap',
        'RNIapModule.kt'
      );

      if (fs.existsSync(iapModulePath)) {
        console.log('[withIAPPatch] Patching react-native-iap Android for RN 0.81+ compatibility...');
        
        let content = fs.readFileSync(iapModulePath, 'utf8');
        let patched = false;

        // Patch 1: Line ~464 - val activity = currentActivity
        if (content.includes('val activity = currentActivity')) {
          content = content.replace(
            /val activity = currentActivity(?!\w)/g,
            'val activity = reactApplicationContext.currentActivity'
          );
          patched = true;
          console.log('[withIAPPatch]   Fixed: val activity = currentActivity');
        }

        // Patch 2: Line ~540 - currentActivity as function argument
        if (content.includes(', currentActivity,') || content.includes(', currentActivity)')) {
          content = content.replace(
            /, currentActivity([,)])/g,
            ', reactApplicationContext.currentActivity$1'
          );
          patched = true;
          console.log('[withIAPPatch]   Fixed: currentActivity as function argument');
        }

        if (patched) {
          fs.writeFileSync(iapModulePath, content, 'utf8');
          console.log('[withIAPPatch] react-native-iap Android patched successfully');
        } else {
          console.log('[withIAPPatch] react-native-iap Android already patched or pattern not found');
        }
      } else {
        console.log('[withIAPPatch] react-native-iap Android module not found, skipping patch');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withIAPPatch;
