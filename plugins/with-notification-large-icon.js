const { withDangerousMod, withAndroidManifest } = require("expo/config-plugins");
const { resolve } = require("path");
const { copyFileSync, mkdirSync, existsSync } = require("fs");

/**
 * Expo config plugin that sets the app icon as the large notification icon on Android.
 *
 * expo-notifications supports `expo.modules.notifications.large_notification_icon`
 * meta-data but has no built-in config for it. This plugin fills that gap by:
 *   1. Copying the app icon into drawable folders (Android auto-scales from highest DPI)
 *   2. Adding the AndroidManifest meta-data so expo-notifications picks it up
 *
 * Usage in app.json:
 *   ["./plugins/with-notification-large-icon", { "icon": "./assets/images/icons/icon.png" }]
 */

const LARGE_ICON_NAME = "notification_large_icon";
const META_DATA_KEY = "expo.modules.notifications.large_notification_icon";

// Copy icon into each drawable-* folder so Android has it at all DPIs.
// The source icon (1024x1024) is copied as-is — Android downscales automatically.
const DRAWABLE_FOLDERS = [
  "drawable-mdpi",
  "drawable-hdpi",
  "drawable-xhdpi",
  "drawable-xxhdpi",
  "drawable-xxxhdpi",
];

function copyLargeIcon(projectRoot, iconPath) {
  const resolvedPath = resolve(projectRoot, iconPath);
  if (!existsSync(resolvedPath)) {
    console.warn(`[with-notification-large-icon] Icon not found: ${resolvedPath}`);
    return;
  }

  const resPath = resolve(projectRoot, "android/app/src/main/res");

  for (const folder of DRAWABLE_FOLDERS) {
    const folderPath = resolve(resPath, folder);
    mkdirSync(folderPath, { recursive: true });
    copyFileSync(resolvedPath, resolve(folderPath, `${LARGE_ICON_NAME}.png`));
  }

  console.log(`[with-notification-large-icon] Copied icon to ${DRAWABLE_FOLDERS.length} drawable folders`);
}

function withNotificationLargeIcon(config, props = {}) {
  const iconPath = props.icon || "./assets/images/icons/icon.png";

  // Step 1: Copy the icon into Android drawable resources
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      copyLargeIcon(config.modRequest.projectRoot, iconPath);
      return config;
    },
  ]);

  // Step 2: Add meta-data to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application?.[0];
    if (!mainApp) return config;

    if (!mainApp["meta-data"]) {
      mainApp["meta-data"] = [];
    }

    // Remove existing entry if present
    mainApp["meta-data"] = mainApp["meta-data"].filter(
      (item) => item.$?.["android:name"] !== META_DATA_KEY
    );

    // Add new entry pointing to the drawable resource
    mainApp["meta-data"].push({
      $: {
        "android:name": META_DATA_KEY,
        "android:resource": `@drawable/${LARGE_ICON_NAME}`,
      },
    });

    return config;
  });

  return config;
}

module.exports = withNotificationLargeIcon;
