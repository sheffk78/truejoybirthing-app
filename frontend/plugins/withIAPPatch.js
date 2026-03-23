/**
 * Expo config plugin to patch react-native-iap for React Native 0.81+ compatibility
 * 
 * This plugin patches the RNIapModule.kt file to replace deprecated `currentActivity`
 * with `reactApplicationContext.currentActivity` which is required for RN 0.80+
 * 
 * The patch is applied during the prebuild phase, ensuring it works with EAS builds
 * even when the postinstall script is modified by the deployment system.
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withIAPPatch(config) {
  return withDangerousMod(config, [
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
        console.log('[withIAPPatch] Patching react-native-iap for RN 0.81+ compatibility...');
        
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
        // Match patterns like: isOfferPersonalized, currentActivity, promise)
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
          console.log('[withIAPPatch] react-native-iap patched successfully');
        } else {
          console.log('[withIAPPatch] react-native-iap already patched or pattern not found');
        }
      } else {
        console.log('[withIAPPatch] react-native-iap module not found, skipping patch');
      }

      return config;
    },
  ]);
}

module.exports = withIAPPatch;
