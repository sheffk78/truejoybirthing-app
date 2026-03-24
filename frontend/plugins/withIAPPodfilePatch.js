/**
 * Expo config plugin to add a pre_install hook to the Podfile
 * that patches react-native-iap's podspec for RN 0.81+ compatibility
 * 
 * This plugin adds Ruby code to the Podfile that runs during `pod install`
 * and removes the RCT-Folly dependency from RNIap.podspec.
 * 
 * The patch happens DURING pod install on the EAS server, ensuring it works
 * even with fresh node_modules.
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withIAPPodfilePatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const podfilePath = path.join(projectRoot, 'ios', 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.log('[withIAPPodfilePatch] Podfile not found, skipping');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Check if we already added the patch
      if (podfileContent.includes('# RNIap RCT-Folly patch')) {
        console.log('[withIAPPodfilePatch] Podfile already patched');
        return config;
      }

      // The pre_install hook that patches RNIap.podspec
      // This runs BEFORE CocoaPods resolves dependencies
      const preInstallHook = `
# RNIap RCT-Folly patch for React Native 0.81+ compatibility
# In RN 0.81+, Folly is bundled in React-Core and RCT-Folly no longer exists as a separate pod
pre_install do |installer|
  # Find and patch RNIap.podspec
  rniap_podspec_path = File.join(__dir__, '..', 'node_modules', 'react-native-iap', 'RNIap.podspec')
  
  if File.exist?(rniap_podspec_path)
    podspec_content = File.read(rniap_podspec_path)
    
    if podspec_content.include?('s.dependency "RCT-Folly"')
      # Comment out the RCT-Folly dependency
      patched_content = podspec_content.gsub(
        /^(\\s*)s\\.dependency\\s+"RCT-Folly"\\s*$/,
        '\\1# s.dependency "RCT-Folly" # REMOVED: Not available in RN 0.81+'
      )
      
      File.write(rniap_podspec_path, patched_content)
      Pod::UI.puts "[RNIap Patch] ✅ Removed RCT-Folly dependency from RNIap.podspec"
    else
      Pod::UI.puts "[RNIap Patch] ✅ RNIap.podspec already patched or no RCT-Folly dependency"
    end
  else
    Pod::UI.puts "[RNIap Patch] ⚠️  RNIap.podspec not found at #{rniap_podspec_path}"
  end
end

`;

      // Find where to insert the pre_install hook
      // It should go before any target blocks
      const targetMatch = podfileContent.match(/^target\s+['"][^'"]+['"]\s+do/m);
      
      if (targetMatch) {
        const insertPosition = targetMatch.index;
        podfileContent = 
          podfileContent.slice(0, insertPosition) + 
          preInstallHook + 
          podfileContent.slice(insertPosition);
        
        fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        console.log('[withIAPPodfilePatch] ✅ Added pre_install hook to Podfile');
      } else {
        // If no target block found, append at the beginning after require statements
        const requireMatch = podfileContent.match(/^(require[^\n]+\n)+/m);
        if (requireMatch) {
          const insertPosition = requireMatch.index + requireMatch[0].length;
          podfileContent = 
            podfileContent.slice(0, insertPosition) + 
            preInstallHook + 
            podfileContent.slice(insertPosition);
        } else {
          // Just prepend it
          podfileContent = preInstallHook + podfileContent;
        }
        
        fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        console.log('[withIAPPodfilePatch] ✅ Added pre_install hook to Podfile (fallback position)');
      }

      return config;
    },
  ]);
}

module.exports = withIAPPodfilePatch;
