/**
 * Expo config plugin to patch react-native-iap for React Native 0.81+ compatibility
 * 
 * This plugin applies two patches:
 * 1. Android: Patches RNIapModule.kt to replace deprecated `currentActivity`
 *    with `reactApplicationContext.currentActivity` (required for RN 0.80+)
 * 2. iOS: Patches RNIap.podspec to remove the RCT-Folly dependency which no longer
 *    exists as a standalone pod in RN 0.81+ (absorbed into prebuilt dependencies)
 * 
 * The patches are applied during the prebuild phase, ensuring they work with EAS builds.
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withIAPPatch(config) {
  // First apply Android patch
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

  // Then apply iOS podspec patch
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      // Path to the RNIap.podspec file
      const podspecPath = path.join(
        projectRoot,
        'node_modules',
        'react-native-iap',
        'RNIap.podspec'
      );

      if (fs.existsSync(podspecPath)) {
        console.log('[withIAPPatch] Patching react-native-iap iOS podspec for RN 0.81+ compatibility...');
        
        let content = fs.readFileSync(podspecPath, 'utf8');
        let patched = false;

        // Remove RCT-Folly dependency - it no longer exists as standalone pod in RN 0.81+
        // Match various patterns of RCT-Folly dependency declarations
        const follyPatterns = [
          /^\s*s\.dependency\s+['"]RCT-Folly['"].*$/gm,
          /^\s*s\.dependency\s+"RCT-Folly".*$/gm,
          /^\s*s\.dependency\s+'RCT-Folly'.*$/gm,
        ];

        for (const pattern of follyPatterns) {
          if (pattern.test(content)) {
            content = content.replace(pattern, '  # s.dependency "RCT-Folly" # Removed for RN 0.81+ compatibility - absorbed into prebuilt deps');
            patched = true;
            console.log('[withIAPPatch]   Removed RCT-Folly dependency from podspec');
          }
        }

        // Also check for DoubleConversion dependency which may also be absorbed
        if (content.includes('s.dependency "DoubleConversion"') || content.includes("s.dependency 'DoubleConversion'")) {
          content = content.replace(
            /^\s*s\.dependency\s+['"]DoubleConversion['"].*$/gm,
            '  # s.dependency "DoubleConversion" # Removed for RN 0.81+ compatibility'
          );
          patched = true;
          console.log('[withIAPPatch]   Removed DoubleConversion dependency from podspec');
        }

        // Check for glog dependency
        if (content.includes('s.dependency "glog"') || content.includes("s.dependency 'glog'")) {
          content = content.replace(
            /^\s*s\.dependency\s+['"]glog['"].*$/gm,
            '  # s.dependency "glog" # Removed for RN 0.81+ compatibility'
          );
          patched = true;
          console.log('[withIAPPatch]   Removed glog dependency from podspec');
        }

        if (patched) {
          fs.writeFileSync(podspecPath, content, 'utf8');
          console.log('[withIAPPatch] react-native-iap iOS podspec patched successfully');
        } else {
          console.log('[withIAPPatch] react-native-iap iOS podspec already patched or no problematic dependencies found');
        }
      } else {
        console.log('[withIAPPatch] react-native-iap podspec not found, skipping iOS patch');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withIAPPatch;
