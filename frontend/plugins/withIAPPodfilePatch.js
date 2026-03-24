/**
 * Expo config plugin to patch react-native-iap podspec for React Native 0.81+ compatibility
 * 
 * This plugin adds a pre_install hook to the Podfile that patches the RNIap.podspec
 * to remove the RCT-Folly dependency which no longer exists as a standalone pod in RN 0.81+.
 * 
 * The patch is applied via Podfile hook, ensuring it works even when node_modules
 * is freshly installed on EAS build machines.
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
      if (podfileContent.includes('# react-native-iap RCT-Folly patch')) {
        console.log('[withIAPPodfilePatch] Podfile already patched');
        return config;
      }

      // Add pre_install hook to patch the RNIap.podspec before dependency resolution
      const preInstallHook = `
# react-native-iap RCT-Folly patch for RN 0.81+ compatibility
pre_install do |installer|
  # Path to RNIap.podspec
  rniap_podspec = File.join(__dir__, '..', 'node_modules', 'react-native-iap', 'RNIap.podspec')
  
  if File.exist?(rniap_podspec)
    content = File.read(rniap_podspec)
    
    # Remove RCT-Folly dependency - it no longer exists as standalone pod in RN 0.81+
    if content.include?("RCT-Folly")
      content = content.gsub(/^\\s*s\\.dependency\\s+['"]RCT-Folly['"].*$/, '  # s.dependency "RCT-Folly" # Removed for RN 0.81+ compatibility')
      File.write(rniap_podspec, content)
      Pod::UI.puts "[IAP Patch] Removed RCT-Folly dependency from RNIap.podspec"
    else
      Pod::UI.puts "[IAP Patch] RNIap.podspec already patched or no RCT-Folly dependency found"
    end
  else
    Pod::UI.puts "[IAP Patch] RNIap.podspec not found at #{rniap_podspec}"
  end
end

`;

      // Insert pre_install hook before the first target block
      const targetMatch = podfileContent.match(/^target\s+['"][^'"]+['"]\s+do/m);
      if (targetMatch) {
        const insertPosition = targetMatch.index;
        podfileContent = 
          podfileContent.slice(0, insertPosition) + 
          preInstallHook + 
          podfileContent.slice(insertPosition);
        
        fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        console.log('[withIAPPodfilePatch] Added pre_install hook to Podfile for RCT-Folly patch');
      } else {
        console.log('[withIAPPodfilePatch] Could not find target block in Podfile');
      }

      return config;
    },
  ]);
}

module.exports = withIAPPodfilePatch;
