// plugins/with-ios-widgets.js
// Expo config plugin to add iOS WidgetKit extension target
// Copies Swift widget files from widgets/ios/ into the build

const {
  withXcodeProject,
  withEntitlementsPlist,
  IOSConfig,
} = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const WIDGET_EXTENSION_NAME = 'RoohAlMuslimWidgets';
const WIDGET_BUNDLE_ID = 'com.rooh.almuslim.widgets';
const APP_GROUP_ID = 'group.com.rooh.almuslim';
const DEPLOYMENT_TARGET = '16.1';

// Recursively copy a directory
function copyDirectorySync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Swift source files for the widget extension.
// NOTE: AppShortcuts.swift is intentionally NOT here. Apple requires
// AppShortcutsProvider to live in the MAIN APP target so Spotlight / Siri /
// Shortcuts can execute the intent in the app process. AppIntents.swift stays
// in the widget extension because ControlWidgets.swift references those
// intents for Control Center buttons; a separate copy is also compiled into
// the main app target (see MAIN_APP_INTENT_FILES below).
const WIDGET_SWIFT_FILES = [
  'WidgetBundle.swift',
  'NextPrayerWidget.swift',
  'QuranAyahWidget.swift',
  'AzkarWidget.swift',
  'DhikrWidget.swift',
  'HijriDateWidget.swift',
  'PrayerLiveActivity.swift',
  'AppIntents.swift',
  'ControlWidgets.swift',
];

// Swift files copied from widgets/ios/ into the main app target so that
// App Shortcuts (Spotlight / Siri / Shortcuts app) can be registered and
// executed from the app process, not the widget extension.
const MAIN_APP_INTENT_FILES = [
  'AppIntents.swift',
  'AppShortcuts.swift',
];

// Shared Swift files compiled into BOTH main app and widget extension
const SHARED_SWIFT_FILES = [
  'SharedActivityAttributes.swift',
];

// Font files needed by widgets (HijriDateWidget uses Amiri)
const WIDGET_FONT_FILES = [
  'Amiri-Regular.ttf',
  'Amiri-Bold.ttf',
];

/**
 * Main plugin: wires up the WidgetKit extension target
 */
const withIOSWidgets = (config) => {
  // 1. Add App Group entitlement to main target
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.security.application-groups'] = [APP_GROUP_ID];
    return mod;
  });

  // 2. Add the widget extension target to PBXProject
  config = withXcodeProject(config, (mod) => {
    const xcodeProject = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;

    // Create widget extension directory inside ios/
    const widgetDir = path.join(projectRoot, 'ios', WIDGET_EXTENSION_NAME);
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true });
    }

    // Copy Swift files from widgets/ios/ to ios/RoohAlMuslimWidgets/
    const sourceDir = path.join(projectRoot, 'widgets', 'ios');
    for (const fileName of WIDGET_SWIFT_FILES) {
      const src = path.join(sourceDir, fileName);
      const dst = path.join(widgetDir, fileName);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Copy SharedActivityAttributes.swift into the widget extension directory
    // so both targets compile it (sourced from plugins/live-activities-native/)
    for (const fileName of SHARED_SWIFT_FILES) {
      const src = path.join(projectRoot, 'plugins', 'live-activities-native', fileName);
      const dst = path.join(widgetDir, fileName);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Copy Assets.xcassets (widget icon) from widgets/ios/ to ios/RoohAlMuslimWidgets/
    const assetsSource = path.join(sourceDir, 'Assets.xcassets');
    const assetsDest = path.join(widgetDir, 'Assets.xcassets');
    if (fs.existsSync(assetsSource)) {
      copyDirectorySync(assetsSource, assetsDest);
    }

    // Copy Amiri font files for HijriDateWidget
    const fontsDir = path.join(projectRoot, 'assets', 'fonts');
    for (const fontFile of WIDGET_FONT_FILES) {
      const src = path.join(fontsDir, fontFile);
      const dst = path.join(widgetDir, fontFile);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Create widget entitlements file
    const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>${APP_GROUP_ID}</string>
	</array>
</dict>
</plist>`;
    fs.writeFileSync(
      path.join(widgetDir, `${WIDGET_EXTENSION_NAME}.entitlements`),
      widgetEntitlements
    );

    // Create widget Info.plist
    const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>ar</string>
	<key>CFBundleDisplayName</key>
	<string>روح المسلم</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>NSSupportsLiveActivities</key>
	<true/>
	<key>UIAppFonts</key>
	<array>
		<string>Amiri-Regular.ttf</string>
		<string>Amiri-Bold.ttf</string>
	</array>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, 'Info.plist'), widgetInfoPlist);

    // Add widget extension target to Xcode project
    const groupName = WIDGET_EXTENSION_NAME;

    // Create PBXGroup for widget files (all files including Swift sources)
    const widgetGroup = xcodeProject.addPbxGroup(
      [...WIDGET_SWIFT_FILES, ...SHARED_SWIFT_FILES, ...WIDGET_FONT_FILES, 'Assets.xcassets', `${WIDGET_EXTENSION_NAME}.entitlements`, 'Info.plist'],
      groupName,
      groupName
    );

    // Add group to main project group
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroup);

    // Add the widget extension target
    const target = xcodeProject.addTarget(
      WIDGET_EXTENSION_NAME,
      'app_extension',
      WIDGET_EXTENSION_NAME,
      WIDGET_BUNDLE_ID
    );

    // Access the project's internal object hash for manual manipulation.
    // addTarget creates a minimal target without build phases, so we create them manually.
    const objects = xcodeProject.hash.project.objects;

    // Find the widget target UUID (name may be quoted)
    let widgetTargetUuid = null;
    const nativeTargets = objects['PBXNativeTarget'];
    for (const key in nativeTargets) {
      if (key.endsWith('_comment')) continue;
      const nt = nativeTargets[key];
      // addTarget may quote the name, so check both
      if (nt && (nt.name === WIDGET_EXTENSION_NAME || nt.name === `"${WIDGET_EXTENSION_NAME}"`)) {
        widgetTargetUuid = key;
        break;
      }
    }

    // Create PBXSourcesBuildPhase for widget target
    const sourcesBuildPhaseUuid = xcodeProject.generateUuid();
    if (!objects['PBXSourcesBuildPhase']) {
      objects['PBXSourcesBuildPhase'] = {};
    }
    objects['PBXSourcesBuildPhase'][sourcesBuildPhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects['PBXSourcesBuildPhase'][`${sourcesBuildPhaseUuid}_comment`] = 'Sources';

    // Create PBXFrameworksBuildPhase for widget target
    const frameworksBuildPhaseUuid = xcodeProject.generateUuid();
    if (!objects['PBXFrameworksBuildPhase']) {
      objects['PBXFrameworksBuildPhase'] = {};
    }
    objects['PBXFrameworksBuildPhase'][frameworksBuildPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects['PBXFrameworksBuildPhase'][`${frameworksBuildPhaseUuid}_comment`] = 'Frameworks';

    // Create PBXResourcesBuildPhase for widget target
    const resourcesBuildPhaseUuid = xcodeProject.generateUuid();
    if (!objects['PBXResourcesBuildPhase']) {
      objects['PBXResourcesBuildPhase'] = {};
    }
    objects['PBXResourcesBuildPhase'][resourcesBuildPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects['PBXResourcesBuildPhase'][`${resourcesBuildPhaseUuid}_comment`] = 'Resources';

    // Assign build phases to the widget target
    if (widgetTargetUuid && nativeTargets[widgetTargetUuid]) {
      nativeTargets[widgetTargetUuid].buildPhases = [
        { value: sourcesBuildPhaseUuid, comment: 'Sources' },
        { value: frameworksBuildPhaseUuid, comment: 'Frameworks' },
        { value: resourcesBuildPhaseUuid, comment: 'Resources' },
      ];
    }

    // Add Swift source files to the widget target's compile sources
    const groupChildren = objects['PBXGroup'][widgetGroup.uuid].children;
    for (const child of groupChildren) {
      const fileName = child.comment;
      if (!WIDGET_SWIFT_FILES.includes(fileName) && !SHARED_SWIFT_FILES.includes(fileName)) continue;

      const buildFileUuid = xcodeProject.generateUuid();
      objects['PBXBuildFile'][buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: child.value,
        fileRef_comment: fileName,
      };
      objects['PBXBuildFile'][`${buildFileUuid}_comment`] = `${fileName} in Sources`;

      objects['PBXSourcesBuildPhase'][sourcesBuildPhaseUuid].files.push({
        value: buildFileUuid,
        comment: `${fileName} in Sources`,
      });
    }

    // Add Assets.xcassets to the widget target's Resources build phase
    for (const child of groupChildren) {
      if (child.comment === 'Assets.xcassets') {
        const assetsBuildFileUuid = xcodeProject.generateUuid();
        objects['PBXBuildFile'][assetsBuildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: child.value,
          fileRef_comment: 'Assets.xcassets',
        };
        objects['PBXBuildFile'][`${assetsBuildFileUuid}_comment`] = 'Assets.xcassets in Resources';

        objects['PBXResourcesBuildPhase'][resourcesBuildPhaseUuid].files.push({
          value: assetsBuildFileUuid,
          comment: 'Assets.xcassets in Resources',
        });
        break;
      }
    }

    // Add font files to the widget target's Resources build phase
    for (const child of groupChildren) {
      if (WIDGET_FONT_FILES.includes(child.comment)) {
        const fontBuildFileUuid = xcodeProject.generateUuid();
        objects['PBXBuildFile'][fontBuildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: child.value,
          fileRef_comment: child.comment,
        };
        objects['PBXBuildFile'][`${fontBuildFileUuid}_comment`] = `${child.comment} in Resources`;

        objects['PBXResourcesBuildPhase'][resourcesBuildPhaseUuid].files.push({
          value: fontBuildFileUuid,
          comment: `${child.comment} in Resources`,
        });
      }
    }

    // Add WidgetKit, SwiftUI, ActivityKit, and AppIntents frameworks to widget target
    const frameworkNames = ['WidgetKit.framework', 'SwiftUI.framework', 'ActivityKit.framework', 'AppIntents.framework'];
    for (const fwName of frameworkNames) {
      const fwRefUuid = xcodeProject.generateUuid();
      objects['PBXFileReference'][fwRefUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'wrapper.framework',
        name: fwName,
        path: `System/Library/Frameworks/${fwName}`,
        sourceTree: 'SDKROOT',
      };
      objects['PBXFileReference'][`${fwRefUuid}_comment`] = fwName;

      const fwBuildFileUuid = xcodeProject.generateUuid();
      const buildFileEntry = {
        isa: 'PBXBuildFile',
        fileRef: fwRefUuid,
        fileRef_comment: fwName,
      };
      // AppIntents.framework should be Optional (weak) linked for iOS 16 compatibility
      if (fwName === 'AppIntents.framework') {
        buildFileEntry.settings = { ATTRIBUTES: ['Weak'] };
      }
      objects['PBXBuildFile'][fwBuildFileUuid] = buildFileEntry;
      objects['PBXBuildFile'][`${fwBuildFileUuid}_comment`] = `${fwName} in Frameworks`;

      objects['PBXFrameworksBuildPhase'][frameworksBuildPhaseUuid].files.push({
        value: fwBuildFileUuid,
        comment: `${fwName} in Frameworks`,
      });
    }

    // Add widget target as dependency of main target so it gets built.
    // NOTE: `xcodeProject.getFirstTarget()` returns { uuid, firstTarget: {...} }
    // where `firstTarget` is the target's PROPERTIES dict and does NOT carry
    // a nested `uuid` field. Earlier code referenced `mainTarget.firstTarget.uuid`
    // which is `undefined`, silently breaking dependency / source / framework
    // injection. Resolve the real UUID by name instead.
    const appName = mod.modRequest.projectName || 'rwhalmslm';
    let resolvedMainTargetUuid = null;
    let resolvedMainTargetObj = null;
    for (const key in nativeTargets) {
      if (key.endsWith('_comment')) continue;
      const nt = nativeTargets[key];
      const ntName = nt && (nt.name || '').replace(/"/g, '');
      if (ntName === appName) {
        resolvedMainTargetUuid = key;
        resolvedMainTargetObj = nt;
        break;
      }
    }
    const mainTarget = xcodeProject.getFirstTarget();
    if (mainTarget && widgetTargetUuid) {
      const dependencyUuid = xcodeProject.generateUuid();
      const containerProxyUuid = xcodeProject.generateUuid();

      // Create PBXContainerItemProxy
      if (!objects['PBXContainerItemProxy']) {
        objects['PBXContainerItemProxy'] = {};
      }
      objects['PBXContainerItemProxy'][containerProxyUuid] = {
        isa: 'PBXContainerItemProxy',
        containerPortal: xcodeProject.getFirstProject().firstProject.uuid || '83CBB9F71A601CBA00E9B192',
        proxyType: 1,
        remoteGlobalIDString: widgetTargetUuid,
        remoteInfo: `"${WIDGET_EXTENSION_NAME}"`,
      };
      objects['PBXContainerItemProxy'][`${containerProxyUuid}_comment`] = 'PBXContainerItemProxy';

      // Create PBXTargetDependency
      if (!objects['PBXTargetDependency']) {
        objects['PBXTargetDependency'] = {};
      }
      objects['PBXTargetDependency'][dependencyUuid] = {
        isa: 'PBXTargetDependency',
        target: widgetTargetUuid,
        target_comment: WIDGET_EXTENSION_NAME,
        targetProxy: containerProxyUuid,
        targetProxy_comment: 'PBXContainerItemProxy',
      };
      objects['PBXTargetDependency'][`${dependencyUuid}_comment`] = 'PBXTargetDependency';

      // Add dependency to main target
      const mainTargetObj = resolvedMainTargetObj;
      if (mainTargetObj) {
        if (!mainTargetObj.dependencies) {
          mainTargetObj.dependencies = [];
        }
        mainTargetObj.dependencies.push({
          value: dependencyUuid,
          comment: 'PBXTargetDependency',
        });
      }
    }

    // Configure build settings for the widget target
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config = configurations[key];
      if (config && config.buildSettings && config.name) {
        // Find configs belonging to the widget target
        if (typeof config.buildSettings === 'object') {
          const bs = config.buildSettings;
          if (bs.PRODUCT_BUNDLE_IDENTIFIER === WIDGET_BUNDLE_ID ||
              bs.PRODUCT_NAME === `"${WIDGET_EXTENSION_NAME}"`) {
            bs.SWIFT_VERSION = '5.0';
            bs.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
            bs.TARGETED_DEVICE_FAMILY = '"1,2"';
            bs.CODE_SIGN_ENTITLEMENTS = `${WIDGET_EXTENSION_NAME}/${WIDGET_EXTENSION_NAME}.entitlements`;
            bs.CODE_SIGN_STYLE = 'Manual';
            bs.DEVELOPMENT_TEAM = 'UDCBW35NWT';
            bs.INFOPLIST_FILE = `${WIDGET_EXTENSION_NAME}/Info.plist`;
            bs.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
            bs.PRODUCT_BUNDLE_IDENTIFIER = WIDGET_BUNDLE_ID;
            bs.SKIP_INSTALL = 'YES';
            bs.GENERATE_INFOPLIST_FILE = 'NO';
            // Match parent app version so App Store Connect doesn't reject upload
            // (CFBundleShortVersionString of app extension must equal parent app's)
            bs.CURRENT_PROJECT_VERSION = String(config.ios?.buildNumber ?? '1');
            bs.MARKETING_VERSION = String(config.version ?? '1.0');
            bs.ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = 'YES';
          }
        }
      }
    }

    // Add widget extension to the main target's "Embed App Extensions" build phase
    if (resolvedMainTargetUuid) {
      xcodeProject.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed App Extensions',
        resolvedMainTargetUuid,
        'app_extension'
      );
    }

    // ────────────────────────────────────────────────────────────────────
    // Compile AppIntents.swift + AppShortcuts.swift into the MAIN APP target.
    // Required so that App Shortcuts (Spotlight / Siri / Shortcuts app) can
    // register the provider from the app process and execute intents there.
    // Without this, shortcuts appear in Spotlight (via the widget extension's
    // metadata) but tapping them does nothing because the system cannot
    // resolve the intent in the app.
    // ────────────────────────────────────────────────────────────────────
    const appDir = path.join(projectRoot, 'ios', appName);

    // 1. Copy the Swift files from widgets/ios/ into the main app dir.
    //    We use a separate on-disk copy (instead of sharing the widget
    //    extension's file reference) to keep each target's compile unit
    //    fully isolated — Xcode treats them as two independent sources that
    //    each emit their own Swift classes into their own binary.
    for (const fileName of MAIN_APP_INTENT_FILES) {
      const src = path.join(sourceDir, fileName);
      const dst = path.join(appDir, fileName);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // 2. Find the main target's Sources build phase.
    const mainTargetUuid = resolvedMainTargetUuid;
    const mainTargetObj = resolvedMainTargetObj;
    let mainSourcesPhaseUuid = null;
    if (mainTargetObj?.buildPhases) {
      for (const phase of mainTargetObj.buildPhases) {
        if (objects['PBXSourcesBuildPhase']?.[phase.value]) {
          mainSourcesPhaseUuid = phase.value;
          break;
        }
      }
    }

    // 3. Find the main app PBXGroup (so the file shows up in the Xcode
    //    navigator under the app folder).
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

    // 4. Register each file: PBXFileReference → app group → PBXBuildFile →
    //    main target's Sources phase.
    if (mainSourcesPhaseUuid) {
      for (const fileName of MAIN_APP_INTENT_FILES) {
        const filePath = path.join(appDir, fileName);
        if (!fs.existsSync(filePath)) continue;

        const fileRefUuid = xcodeProject.generateUuid();
        objects['PBXFileReference'][fileRefUuid] = {
          isa: 'PBXFileReference',
          lastKnownFileType: 'sourcecode.swift',
          name: fileName,
          path: `${appName}/${fileName}`,
          sourceTree: '"<group>"',
        };
        objects['PBXFileReference'][`${fileRefUuid}_comment`] = fileName;

        if (appGroupUuid && groups[appGroupUuid]) {
          if (!groups[appGroupUuid].children) {
            groups[appGroupUuid].children = [];
          }
          groups[appGroupUuid].children.push({
            value: fileRefUuid,
            comment: fileName,
          });
        }

        const buildFileUuid = xcodeProject.generateUuid();
        objects['PBXBuildFile'][buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: fileRefUuid,
          fileRef_comment: fileName,
        };
        objects['PBXBuildFile'][`${buildFileUuid}_comment`] = `${fileName} in Sources`;

        objects['PBXSourcesBuildPhase'][mainSourcesPhaseUuid].files.push({
          value: buildFileUuid,
          comment: `${fileName} in Sources`,
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────
    // Link AppIntents.framework into the MAIN APP target.
    // Required so that:
    //   - `appintentsmetadataprocessor` extracts intent metadata at build
    //     time (otherwise it logs "No AppIntents.framework dependency found"
    //     and skips, leaving Spotlight/Siri/Shortcuts with zero registered
    //     shortcuts).
    //   - The system can resolve and execute intents inside the app process
    //     when Control Center / Spotlight launches the app via openAppWhenRun.
    // Weak-linked so iOS 15 still loads the binary (framework is iOS 16+).
    // NOTE: We must look up the main app target by NAME — `getFirstTarget()`
    // returns the widget extension after `addTarget()` shifted ordering.
    // ────────────────────────────────────────────────────────────────────
    let mainFrameworksPhaseUuid = null;
    if (resolvedMainTargetObj?.buildPhases) {
      for (const phase of resolvedMainTargetObj.buildPhases) {
        if (objects['PBXFrameworksBuildPhase']?.[phase.value]) {
          mainFrameworksPhaseUuid = phase.value;
          break;
        }
      }
    }

    if (mainFrameworksPhaseUuid) {
      const mainFrameworksPhase = objects['PBXFrameworksBuildPhase'][mainFrameworksPhaseUuid];
      const alreadyLinked = (mainFrameworksPhase.files || []).some((f) => {
        const comment = String(f?.comment || '');
        return comment.includes('AppIntents.framework');
      });

      if (!alreadyLinked) {
        const fwName = 'AppIntents.framework';
        const fwRefUuid = xcodeProject.generateUuid();
        objects['PBXFileReference'][fwRefUuid] = {
          isa: 'PBXFileReference',
          lastKnownFileType: 'wrapper.framework',
          name: fwName,
          path: `System/Library/Frameworks/${fwName}`,
          sourceTree: 'SDKROOT',
        };
        objects['PBXFileReference'][`${fwRefUuid}_comment`] = fwName;

        const fwBuildFileUuid = xcodeProject.generateUuid();
        objects['PBXBuildFile'][fwBuildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: fwRefUuid,
          fileRef_comment: fwName,
          settings: { ATTRIBUTES: ['Weak'] },
        };
        objects['PBXBuildFile'][`${fwBuildFileUuid}_comment`] = `${fwName} in Frameworks`;

        if (!mainFrameworksPhase.files) mainFrameworksPhase.files = [];
        mainFrameworksPhase.files.push({
          value: fwBuildFileUuid,
          comment: `${fwName} in Frameworks`,
        });
      }
    }

    return mod;
  });

  return config;
};

module.exports = withIOSWidgets;
