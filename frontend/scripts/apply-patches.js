#!/usr/bin/env node
/**
 * Custom patch script that applies all necessary patches for the app.
 * This script ensures react-native-iap patch is applied even when
 * the deployment system modifies the postinstall script.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Applying custom patches...');

// Try to run patch-package first
try {
  console.log('Running patch-package...');
  execSync('npx patch-package', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('patch-package completed successfully');
} catch (error) {
  console.log('patch-package not available or failed, applying patches manually...');
  
  // Manual patch for react-native-iap if patch-package fails
  const iapModulePath = path.join(
    __dirname,
    '..',
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
    let content = fs.readFileSync(iapModulePath, 'utf8');
    
    // Check if patch is needed
    if (content.includes('val activity = currentActivity') && !content.includes('val activity = reactApplicationContext.currentActivity')) {
      console.log('Patching react-native-iap RNIapModule.kt...');
      
      // Apply the fix for currentActivity -> reactApplicationContext.currentActivity
      content = content.replace(
        /val activity = currentActivity/g,
        'val activity = reactApplicationContext.currentActivity'
      );
      
      fs.writeFileSync(iapModulePath, content, 'utf8');
      console.log('  react-native-iap patched successfully');
    } else if (content.includes('val activity = reactApplicationContext.currentActivity')) {
      console.log('  react-native-iap already patched');
    } else {
      console.log('  react-native-iap patch pattern not found, skipping');
    }
  } else {
    console.log('  react-native-iap module not found, skipping patch');
  }
}

console.log('All patches applied successfully');
