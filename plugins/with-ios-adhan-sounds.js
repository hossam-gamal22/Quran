// plugins/with-ios-adhan-sounds.js
//
// Copies .caf full-adhan sound files into the iOS app target so iOS can use
// them as notification sounds (UNNotificationSound). These files can't go
// through expo-notifications `sounds` because Android's resource merger
// would see them as duplicates of the .mp3 files with the same base name.
//
// This plugin runs at iOS prebuild time only — Android is unaffected.

const { withXcodeProject } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const CAF_SOURCE_DIR = 'assets/sounds/adhan_full_ios';

module.exports = function withIosAdhanSounds(config) {
  return withXcodeProject(config, async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const platformRoot = cfg.modRequest.platformProjectRoot; // ios/
    const appName = cfg.modRequest.projectName ?? 'rwhalmslm';

    const sourceDir = path.join(projectRoot, CAF_SOURCE_DIR);
    if (!fs.existsSync(sourceDir)) {
      console.warn('[with-ios-adhan-sounds] CAF source dir not found:', sourceDir);
      return cfg;
    }

    const targetDir = path.join(platformRoot, appName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const project = cfg.modResults;

    // Find the main app target by name for reliability (getFirstTarget may
    // return the widget extension target when multiple targets exist).
    let mainTarget = null;
    try {
      const nativeTargets = project.pbxNativeTargetSection();
      for (const [uuid, target] of Object.entries(nativeTargets)) {
        if (uuid.endsWith('_comment')) continue;
        const name = typeof target.name === 'string'
          ? target.name.replace(/^"|"$/g, '')
          : '';
        if (name === appName) {
          mainTarget = uuid;
          break;
        }
      }
    } catch (_) {}

    // Fallback to first target
    if (!mainTarget) {
      mainTarget = project.getFirstTarget()?.uuid;
    }

    if (!mainTarget) {
      console.warn('[with-ios-adhan-sounds] Could not find main Xcode target');
      return cfg;
    }

    const cafFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.caf'));
    let added = 0;
    for (const file of cafFiles) {
      const src = path.join(sourceDir, file);
      const dst = path.join(targetDir, file);
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
      }

      const filePath = `${appName}/${file}`;
      const alreadyAdded = project.hasFile(filePath);
      if (!alreadyAdded) {
        try {
          project.addResourceFile(filePath, { target: mainTarget });
          added++;
        } catch (e) {
          // Some versions of the xcode library crash if addFile returns null
          // (e.g. when the file reference already exists under a different UUID).
          // The file is already copied to the correct location; if Xcode finds it
          // in the target folder it will still bundle it — log and continue.
          console.warn(
            `[with-ios-adhan-sounds] addResourceFile failed for ${file}: ${e.message}`
          );
        }
      }
    }

    console.log(`[with-ios-adhan-sounds] Copied ${cafFiles.length} CAF files, added ${added} to Xcode project`);
    return cfg;
  });
};
