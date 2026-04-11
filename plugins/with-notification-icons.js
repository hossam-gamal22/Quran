const { withDangerousMod } = require('expo/config-plugins');
const { resolve, join } = require('path');
const { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } = require('fs');

/**
 * Config plugin: Dynamic per-category Android notification large icons.
 * Copies category PNGs into drawable folders and patches
 * ExpoNotificationBuilder.kt to resolve iconType from body JSON.
 */

const DRAWABLE_FOLDERS = [
  'drawable-mdpi',
  'drawable-hdpi',
  'drawable-xhdpi',
  'drawable-xxhdpi',
  'drawable-xxxhdpi',
];

const ICON_PREFIX = 'notif_icon_';

function copyIcons(projectRoot) {
  const srcDir = resolve(projectRoot, 'assets/images/notification-icons');
  if (!existsSync(srcDir)) {
    console.warn('[with-notification-icons] Icon source directory not found:', srcDir);
    return;
  }

  const icons = readdirSync(srcDir).filter(
    (f) => f.startsWith(ICON_PREFIX) && f.endsWith('.png')
  );

  if (icons.length === 0) {
    console.warn('[with-notification-icons] No icons found matching notif_icon_*.png');
    return;
  }

  const resPath = resolve(projectRoot, 'android/app/src/main/res');

  for (const folder of DRAWABLE_FOLDERS) {
    const folderPath = resolve(resPath, folder);
    mkdirSync(folderPath, { recursive: true });
    for (const icon of icons) {
      copyFileSync(resolve(srcDir, icon), resolve(folderPath, icon));
    }
  }

  console.log(
    `[with-notification-icons] Copied ${icons.length} icons to ${DRAWABLE_FOLDERS.length} drawable folders`
  );
}

function patchNotificationBuilder(projectRoot) {
  const builderPath = resolve(
    projectRoot,
    'node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt'
  );

  if (!existsSync(builderPath)) {
    console.warn('[with-notification-icons] ExpoNotificationBuilder.kt not found — skipping');
    return;
  }

  let source = readFileSync(builderPath, 'utf-8');

  // Already patched?
  if (source.includes('// [with-notification-icons] dynamic iconType')) {
    console.log('[with-notification-icons] Already patched — skipping');
    return;
  }

  // ── Add import for JSONObject if missing ──────────────────────────────
  if (!source.includes('import org.json.JSONObject')) {
    source = source.replace(
      'import android.os.Bundle',
      'import android.os.Bundle\nimport org.json.JSONObject'
    );
  }

  // ── Patch the build() method ──────────────────────────────────────────
  // Find the large icon resolution block and prepend our dynamic lookup.
  //
  // Original:
  //   if (notificationContent.containsImage()) {
  //     val bitmap = notificationContent.getImage(context)
  //     bitmap?.let { builder.setLargeIcon(it) }
  //   } else {
  //     builder.setLargeIcon(largeIcon)
  //   }
  //
  // Patched:
  //   We try to read iconType from body JSON first. If a matching drawable
  //   exists, use it. Otherwise fall through to original logic.

  const ORIGINAL_LARGE_ICON_BLOCK = `    if (notificationContent.containsImage()) {
      val bitmap = notificationContent.getImage(context)
      bitmap?.let { builder.setLargeIcon(it) }
    } else {
      builder.setLargeIcon(largeIcon)
    }`;

  const PATCHED_LARGE_ICON_BLOCK = `    // [with-notification-icons] dynamic iconType
    var dynamicIconSet = false
    try {
      val bodyJson = notificationContent.body
      if (bodyJson != null && bodyJson.has("iconType")) {
        val iconType = bodyJson.optString("iconType", "")
        if (iconType.isNotEmpty()) {
          val resName = "notif_icon_\${iconType}"
          val resId = context.resources.getIdentifier(resName, "drawable", context.packageName)
          if (resId != 0) {
            val bmp = android.graphics.BitmapFactory.decodeResource(context.resources, resId)
            if (bmp != null) {
              builder.setLargeIcon(bmp)
              dynamicIconSet = true
            }
          }
        }
      }
    } catch (_: Exception) {}

    if (!dynamicIconSet) {
      if (notificationContent.containsImage()) {
        val bitmap = notificationContent.getImage(context)
        bitmap?.let { builder.setLargeIcon(it) }
      } else {
        builder.setLargeIcon(largeIcon)
      }
    }`;

  if (source.includes(ORIGINAL_LARGE_ICON_BLOCK)) {
    source = source.replace(ORIGINAL_LARGE_ICON_BLOCK, PATCHED_LARGE_ICON_BLOCK);
    writeFileSync(builderPath, source, 'utf-8');
    console.log('[with-notification-icons] ✅ Patched ExpoNotificationBuilder.kt for dynamic icons');
  } else {
    console.warn(
      '[with-notification-icons] ⚠️ Large icon block signature not found — expo-notifications may have changed'
    );
  }
}

function withNotificationIcons(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      copyIcons(cfg.modRequest.projectRoot);
      patchNotificationBuilder(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);
}

module.exports = withNotificationIcons;
