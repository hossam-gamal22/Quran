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
    const mainTarget = project.getFirstTarget()?.uuid;
    if (!mainTarget) {
      console.warn('[with-ios-adhan-sounds] Could not find main Xcode target');
      return cfg;
    }

    const cafFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.caf'));
    let added = 0;
    for (const file of cafFiles) {
      const src = path.join(sourceDir, file);
      const dst = path.join(targetDir, file);
      fs.copyFileSync(src, dst);

      // Add to Xcode project as a resource so it's copied into the app bundle.
      // skip if already registered to avoid duplicate PBXFileReference entries.
      const alreadyAdded = project.hasFile(`${appName}/${file}`);
      if (!alreadyAdded) {
        project.addResourceFile(`${appName}/${file}`, { target: mainTarget });
        added++;
      }
    }

    console.log(`[with-ios-adhan-sounds] Copied ${cafFiles.length} CAF files, added ${added} to Xcode project`);
    return cfg;
  });
};
