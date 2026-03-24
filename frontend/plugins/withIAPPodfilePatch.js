/**
 * Expo config plugin to add a pre_install hook to the Podfile
 * that patches react-native-iap's podspec for RN 0.81+ compatibility
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
      if (podfileContent.includes('RNIAP_PATCH_MARKER')) {
        console.log('[withIAPPodfilePatch] Podfile already patched');
        return config;
      }

      // Simple pre_install hook with minimal Ruby code - using string replacement
      const preInstallHook = `
# RNIAP_PATCH_MARKER - RCT-Folly fix for RN 0.81+
pre_install do |installer|
  puts "[RNIAP] Starting podspec patch..."
  podspec_file = File.join(__dir__, "..", "node_modules", "react-native-iap", "RNIap.podspec")
  puts "[RNIAP] Checking: " + podspec_file
  if File.exist?(podspec_file)
    content = File.read(podspec_file)
    puts "[RNIAP] File exists, size: " + content.length.to_s
    if content.include?("RCT-Folly")
      puts "[RNIAP] Found RCT-Folly dependency, patching..."
      # Use simple string replacement - handles both quote styles
      new_content = content.gsub('s.dependency "RCT-Folly"', '# s.dependency "RCT-Folly" # REMOVED')
      new_content = new_content.gsub("s.dependency 'RCT-Folly'", "# s.dependency 'RCT-Folly' # REMOVED")
      File.write(podspec_file, new_content)
      puts "[RNIAP] Patch applied successfully!"
    else
      puts "[RNIAP] No RCT-Folly dependency found (already patched?)"
    end
  else
    puts "[RNIAP] WARNING: podspec not found!"
  end
end

`;

      // Find where to insert - before the first target block
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
        // Fallback: add after require statements
        podfileContent = preInstallHook + podfileContent;
        fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        console.log('[withIAPPodfilePatch] ✅ Added pre_install hook to Podfile (at beginning)');
      }

      return config;
    },
  ]);
}

module.exports = withIAPPodfilePatch;
