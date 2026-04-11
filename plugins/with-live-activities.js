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

    // Find main target and its Sources build phase
    const mainTarget = xcodeProject.getFirstTarget();
    if (!mainTarget) return mod;

    const mainTargetUuid = mainTarget.firstTarget.uuid;
    const nativeTargets = objects['PBXNativeTarget'];
    const mainTargetObj = nativeTargets?.[mainTargetUuid];
    if (!mainTargetObj?.buildPhases) return mod;

    // Find the existing Sources build phase for the main target
    let mainSourcesPhaseUuid = null;
    for (const phase of mainTargetObj.buildPhases) {
      if (objects['PBXSourcesBuildPhase']?.[phase.value]) {
        mainSourcesPhaseUuid = phase.value;
        break;
      }
    }
    if (!mainSourcesPhaseUuid) return mod;

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

      // Create PBXFileReference
      const fileRefUuid = xcodeProject.generateUuid();
      objects['PBXFileReference'][fileRefUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: file.type,
        name: file.name,
        path: file.name,
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
    }

    return mod;
  });

  return config;
};

module.exports = withLiveActivities;
