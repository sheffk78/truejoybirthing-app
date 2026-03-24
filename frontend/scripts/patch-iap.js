#!/usr/bin/env node

/**
 * This script patches react-native-iap's RNIap.podspec to remove the RCT-Folly dependency
 * which is no longer available as a separate pod in React Native 0.81+
 * 
 * In RN 0.81+, Folly is bundled within React Native itself (React-Core) and is no longer
 * exposed as a separate 'RCT-Folly' pod.
 * 
 * This runs as a postinstall hook after npm/yarn install but BEFORE expo prebuild and pod install.
 */

const fs = require('fs');
const path = require('path');

const PODSPEC_PATH = path.join(__dirname, '..', 'node_modules', 'react-native-iap', 'RNIap.podspec');

function patchPodspec() {
  console.log('🔧 [patch-iap] Starting RNIap.podspec patch for RN 0.81+ compatibility...');
  
  // Check if we're in an iOS build context (skip on Android)
  if (process.env.EAS_BUILD_PLATFORM === 'android') {
    console.log('⏭️  [patch-iap] Skipping patch for Android build');
    return;
  }
  
  // Check if the podspec file exists
  if (!fs.existsSync(PODSPEC_PATH)) {
    console.log('⚠️  [patch-iap] RNIap.podspec not found at:', PODSPEC_PATH);
    console.log('    This is expected if react-native-iap is not installed yet.');
    return;
  }
  
  try {
    let content = fs.readFileSync(PODSPEC_PATH, 'utf8');
    const originalContent = content;
    
    // Check if the problematic dependency exists (it's inside a conditional for new arch)
    if (!content.includes('s.dependency "RCT-Folly"')) {
      console.log('✅ [patch-iap] RCT-Folly dependency not found - already patched or not present');
      return;
    }
    
    // Remove the RCT-Folly dependency line
    // The line looks like: s.dependency "RCT-Folly"
    content = content.replace(
      /^\s*s\.dependency\s+"RCT-Folly"\s*$/gm, 
      '    # s.dependency "RCT-Folly" # REMOVED: Not available in RN 0.81+ (Folly is bundled in React-Core)'
    );
    
    if (content === originalContent) {
      console.log('⚠️  [patch-iap] No changes made - pattern not matched');
      console.log('    Content check: has RCT-Folly =', content.includes('RCT-Folly'));
      return;
    }
    
    // Write the patched content back
    fs.writeFileSync(PODSPEC_PATH, content, 'utf8');
    
    console.log('✅ [patch-iap] Successfully patched RNIap.podspec');
    console.log('   Removed RCT-Folly dependency for React Native 0.81+ compatibility');
    console.log('   (Folly is now bundled within React-Core in RN 0.81+)');
    
  } catch (error) {
    console.error('❌ [patch-iap] Error patching podspec:', error.message);
    // Don't fail the build - just warn
  }
}

// Run the patch
patchPodspec();
