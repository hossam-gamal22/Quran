// plugins/with-live-activities.js
// Expo config plugin to:
// 1. Add NSSupportsLiveActivities to Info.plist
// 2. Copy and register LiveActivityModule.swift, LiveActivityModule.m, and SharedActivityAttributes.swift
//    into the main app target's compile sources
// Source files are stored in plugins/live-activities-native/ (survives prebuild --clean)

const {
  withXcodeProject,
  withInfoPlist,
} = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Source directory for native files (must be outside ios/)
const NATIVE_SOURCE_DIR = 'plugins/live-activities-native';

// Files that need to be added to the main app target for Live Activities
const LIVE_ACTIVITY_SOURCE_FILES = [
  { name: 'LiveActivityModule.swift', type: 'sourcecode.swift' },
  { name: 'LiveActivityModule.m', type: 'sourcecode.c.objc' },
  { name: 'SharedActivityAttributes.swift', type: 'sourcecode.swift' },
  { name: 'WidgetReloadModule.swift', type: 'sourcecode.swift' },
  { name: 'WidgetReloadModule.m', type: 'sourcecode.c.objc' },
];

const withLiveActivities = (config) => {
  // Add NSSupportsLiveActivities to Info.plist
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    return mod;
  });

  // Add source files to main target
  config = withXcodeProject(config, (mod) => {
    const xcodeProject = mod.modResults;
    const appName = mod.modRequest.projectName || 'rwhalmslm';
    const projectRoot = mod.modRequest.projectRoot;
    const appDir = path.join(projectRoot, 'ios', appName);
    const nativeSourceDir = path.join(projectRoot, NATIVE_SOURCE_DIR);
    const objects = xcodeProject.hash.project.objects;

    // Copy all native files into the main app directory
    for (const file of LIVE_ACTIVITY_SOURCE_FILES) {
      const src = path.join(nativeSourceDir, file.name);
      const dst = path.join(appDir, file.name);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Ensure the Swift bridging header imports React headers so our Swift
    // RCTPromiseResolveBlock / RCTPromiseRejectBlock signatures resolve.
    // Expo's default bridging header is empty; without this, every @objc
    // bridge method in LiveActivityModule + WidgetReloadModule fails to
    // compile once the plugin actually adds them to Sources.
    const bridgingHeaderPath = path.join(appDir, `${appName}-Bridging-Header.h`);
    const requiredImport = '#import <React/RCTBridgeModule.h>';
    try {
      let bh = fs.existsSync(bridgingHeaderPath)
        ? fs.readFileSync(bridgingHeaderPath, 'utf8')
        : '';
      if (!bh.includes(requiredImport)) {
        bh = bh.trimEnd() + `\n\n${requiredImport}\n`;
        fs.writeFileSync(bridgingHeaderPath, bh);
      }
    } catch (e) {
      console.warn('[with-live-activities] Failed to update bridging header:', e.message);
    }

    // Find main target and its Sources build phase.
    // NOTE: xcodeProject.getFirstTarget().firstTarget.uuid returns undefined on
    // EAS / production builds (xcode-project version mismatch). We MUST look up
    // the target by name, otherwise WidgetReloadModule.swift/.m get silently
    // dropped from the build, breaking the AppIntent → JS deep-link bridge and
    // making every Spotlight/Control Center shortcut fall through to home.
    const nativeTargets = objects['PBXNativeTarget'];
    let mainTargetUuid = null;
    let mainTargetObj = null;
    for (const key in nativeTargets) {
      if (key.endsWith('_comment')) continue;
      const nt = nativeTargets[key];
      const ntName = nt && (nt.name || '').replace(/"/g, '');
      if (ntName === appName) {
        mainTargetUuid = key;
        mainTargetObj = nt;
        break;
      }
    }
    if (!mainTargetUuid || !mainTargetObj?.buildPhases) {
      throw new Error(`[with-live-activities] FATAL: Could not find main target "${appName}". Live Activities native module will be missing from the build. Aborting prebuild.`);
    }

    // Find the existing Sources build phase for the main target
    let mainSourcesPhaseUuid = null;
    for (const phase of mainTargetObj.buildPhases) {
      if (objects['PBXSourcesBuildPhase']?.[phase.value]) {
        mainSourcesPhaseUuid = phase.value;
        break;
      }
    }
    if (!mainSourcesPhaseUuid) {
      throw new Error(`[with-live-activities] FATAL: Sources build phase not found for target "${appName}". Aborting prebuild.`);
    }

    // Track how many of our files actually get registered
    let registeredCount = 0;

    // Detect files already added so re-prebuild without --clean doesn't dup
    const existingSourceFileNames = new Set();
    const existingSources = objects['PBXSourcesBuildPhase'][mainSourcesPhaseUuid].files || [];
    const buildFiles = objects['PBXBuildFile'] || {};
    const fileRefs = objects['PBXFileReference'] || {};
    for (const entry of existingSources) {
      const bf = buildFiles[entry.value];
      if (!bf) continue;
      const ref = fileRefs[bf.fileRef];
      const refName = (ref?.name || ref?.path || '').replace(/"/g, '');
      // Match on basename so namespaced paths (rwhalmslm/Foo.swift) match Foo.swift
      const base = refName.split('/').pop();
      if (base) existingSourceFileNames.add(base);
    }

    // Find the main app PBXGroup (the group named after the app)
    let appGroupUuid = null;
    const groups = objects['PBXGroup'];
    for (const key in groups) {
      if (key.endsWith('_comment')) continue;
      const group = groups[key];
      if (group && (group.name === appName || group.path === appName)) {
        appGroupUuid = key;
        break;
      }
    }

    // Add each source file to the project
    for (const file of LIVE_ACTIVITY_SOURCE_FILES) {
      const filePath = path.join(appDir, file.name);
      if (!fs.existsSync(filePath)) continue;

      // Skip if already present (idempotent across re-prebuilds without --clean)
      if (existingSourceFileNames.has(file.name)) continue;

      // Create PBXFileReference. Path is namespaced under the app folder so
      // Xcode resolves it correctly (matches with-ios-widgets.js convention).
      const fileRefUuid = xcodeProject.generateUuid();
      objects['PBXFileReference'][fileRefUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: file.type,
        name: file.name,
        path: `${appName}/${file.name}`,
        sourceTree: '"<group>"',
      };
      objects['PBXFileReference'][`${fileRefUuid}_comment`] = file.name;

      // Add file reference to the app group
      if (appGroupUuid && groups[appGroupUuid]) {
        if (!groups[appGroupUuid].children) {
          groups[appGroupUuid].children = [];
        }
        groups[appGroupUuid].children.push({
          value: fileRefUuid,
          comment: file.name,
        });
      }

      // Create PBXBuildFile
      const buildFileUuid = xcodeProject.generateUuid();
      objects['PBXBuildFile'][buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: fileRefUuid,
        fileRef_comment: file.name,
      };
      objects['PBXBuildFile'][`${buildFileUuid}_comment`] = `${file.name} in Sources`;

      // Add to main target's Sources build phase
      objects['PBXSourcesBuildPhase'][mainSourcesPhaseUuid].files.push({
        value: buildFileUuid,
        comment: `${file.name} in Sources`,
      });
      registeredCount++;
    }

    // Hard-fail if we ended up with zero registrations AND the project did not
    // already contain our files. Skipping silently is what produced the
    // "bridge_missing on device" symptom in the past.
    const allAlreadyPresent = LIVE_ACTIVITY_SOURCE_FILES.every((f) =>
      existingSourceFileNames.has(f.name),
    );
    if (registeredCount === 0 && !allAlreadyPresent) {
      throw new Error('[with-live-activities] FATAL: zero Live Activity Swift files were registered into the main target Sources phase. Build would ship without ActivityKit bridge.');
    }
    console.log(`[with-live-activities] Registered ${registeredCount} new sources (already-present: ${LIVE_ACTIVITY_SOURCE_FILES.filter((f) => existingSourceFileNames.has(f.name)).length}).`);

    return mod;
  });

  return config;
};

module.exports = withLiveActivities;
