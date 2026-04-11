// plugins/with-fix-codesigning.js
// Fixes "resource bundles are signed by default" Xcode 14+ error
// Disables code signing for CocoaPods resource bundle targets
// Must inject AFTER react_native_post_install to avoid being overridden

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFixCodesigning(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Skip only if our specific resource bundle fix is already present
      if (podfileContent.includes('product_type == "com.apple.product-type.bundle"')) {
        return config;
      }

      const fixSnippet = `
    # Fix Xcode 14+ resource bundle signing (must run after react_native_post_install)
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) and target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |build_config|
          build_config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end
`;

      // Strategy: insert the fix just before the closing 'end' of the post_install block.
      // The Podfile structure is:
      //   post_install do |installer|
      //     react_native_post_install(...)
      //   end
      // end  <-- target block end
      //
      // We need to find the 'end' that closes post_install and insert before it.

      // Find post_install block
      const postInstallMatch = podfileContent.match(/post_install\s+do\s+\|installer\|/);
      if (postInstallMatch) {
        const postInstallStart = postInstallMatch.index + postInstallMatch[0].length;
        
        // Find the matching 'end' for post_install by tracking nesting
        let depth = 1;
        let i = postInstallStart;
        const lines = podfileContent.substring(postInstallStart).split('\n');
        let charsConsumed = 0;
        
        for (const line of lines) {
          charsConsumed += line.length + 1; // +1 for newline
          const trimmed = line.trim();
          
          // Count 'do' blocks that open (do |...|, do \n)
          if (/\bdo\b(\s+\|[^|]*\|)?/.test(trimmed)) {
            depth++;
          }
          // Count 'end' that closes blocks
          if (trimmed === 'end') {
            depth--;
            if (depth === 0) {
              // Found the closing 'end' of post_install
              const insertPos = postInstallStart + charsConsumed - line.length - 1;
              podfileContent = 
                podfileContent.substring(0, insertPos) +
                fixSnippet +
                podfileContent.substring(insertPos);
              break;
            }
          }
        }
      } else {
        // No post_install found, add one before target block's final 'end'
        const lastEndIndex = podfileContent.lastIndexOf('end');
        if (lastEndIndex !== -1) {
          podfileContent =
            podfileContent.slice(0, lastEndIndex) +
            `  post_install do |installer|${fixSnippet}  end\n` +
            podfileContent.slice(lastEndIndex);
        }
      }

      fs.writeFileSync(podfilePath, podfileContent);
      return config;
    },
  ]);
};
