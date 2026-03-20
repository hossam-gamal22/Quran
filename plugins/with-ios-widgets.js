// plugins/with-ios-widgets.js
// Expo config plugin to add iOS WidgetKit extension target
// Copies Swift widget files from widgets/ios/ into the build

const {
  withXcodeProject,
  withEntitlementsPlist,
  withInfoPlist,
  IOSConfig,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const WIDGET_EXTENSION_NAME = 'RoohAlMuslimWidgets';
const WIDGET_BUNDLE_ID = 'com.rooh.almuslim.widgets';
const APP_GROUP_ID = 'group.com.roohmuslim.app';
const DEPLOYMENT_TARGET = '16.0';

// Swift source files for the widget extension
const WIDGET_SWIFT_FILES = [
  'WidgetBundle.swift',
  'NextPrayerWidget.swift',
  'QuranAyahWidget.swift',
  'AzkarWidget.swift',
  'DhikrWidget.swift',
  'HijriDateWidget.swift',
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
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, 'Info.plist'), widgetInfoPlist);

    // Add widget extension target to Xcode project
    const targetUuid = xcodeProject.generateUuid();
    const groupName = WIDGET_EXTENSION_NAME;

    // Create PBXGroup for widget files
    const widgetGroup = xcodeProject.addPbxGroup(
      [...WIDGET_SWIFT_FILES, `${WIDGET_EXTENSION_NAME}.entitlements`, 'Info.plist'],
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

    // Add Swift source files to the build phase
    for (const fileName of WIDGET_SWIFT_FILES) {
      xcodeProject.addSourceFile(
        `${WIDGET_EXTENSION_NAME}/${fileName}`,
        { target: target.uuid },
        widgetGroup.uuid
      );
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
            bs.CODE_SIGN_STYLE = 'Automatic';
            bs.INFOPLIST_FILE = `${WIDGET_EXTENSION_NAME}/Info.plist`;
            bs.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
            bs.PRODUCT_BUNDLE_IDENTIFIER = WIDGET_BUNDLE_ID;
            bs.SKIP_INSTALL = 'YES';
            bs.GENERATE_INFOPLIST_FILE = 'NO';
            bs.CURRENT_PROJECT_VERSION = '1';
            bs.MARKETING_VERSION = '1.0';
          }
        }
      }
    }

    // Add widget extension to the main target's "Embed App Extensions" build phase
    const mainTarget = xcodeProject.getFirstTarget();
    if (mainTarget) {
      xcodeProject.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed App Extensions',
        mainTarget.firstTarget.uuid,
        'app_extension'
      );
    }

    return mod;
  });

  return config;
};

module.exports = withIOSWidgets;
