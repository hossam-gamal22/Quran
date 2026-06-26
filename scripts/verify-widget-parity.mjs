#!/usr/bin/env node
// Verifies that the widget registry is shipped consistently across:
//   - iOS configurable home-screen widgets,
//   - Android home-screen AppWidget providers,
//   - iOS/Android lock-screen provider lists.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const REGISTRY_JSON = resolve(ROOT, 'widgets/ios/Resources/widget-registry.json');
const IOS_ENUMS = resolve(ROOT, 'widgets/ios/GeneratedWidgetEnums.swift');
const IOS_TARGET_ENUMS = resolve(ROOT, 'ios/RoohAlMuslimWidgets/GeneratedWidgetEnums.swift');
const IOS_SWIFT = resolve(ROOT, 'widgets/ios/RoohWidgets.swift');
const IOS_BUNDLE = resolve(ROOT, 'widgets/ios/WidgetBundle.swift');
const IOS_TARGET_SWIFT = resolve(ROOT, 'ios/RoohAlMuslimWidgets/RoohWidgets.swift');
const IOS_TARGET_BUNDLE = resolve(ROOT, 'ios/RoohAlMuslimWidgets/WidgetBundle.swift');
const IOS_LOCALIZABLE = resolve(ROOT, 'widgets/ios/Localizable.xcstrings');
const IOS_TARGET_LOCALIZABLE = resolve(ROOT, 'ios/RoohAlMuslimWidgets/Localizable.xcstrings');
const IOS_PRAYER_INPUTS = resolve(ROOT, 'widgets/ios/PrayerInputs.swift');
const IOS_TARGET_PRAYER_INPUTS = resolve(ROOT, 'ios/RoohAlMuslimWidgets/PrayerInputs.swift');
const IOS_LEGACY_NEXT_PRAYER = resolve(ROOT, 'widgets/ios/NextPrayerWidget.swift');
const ANDROID_MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml');
const ANDROID_XML_DIR = resolve(ROOT, 'android/app/src/main/res/xml');
const ANDROID_JAVA_DIR = resolve(ROOT, 'android/app/src/main/java/com/rooh/almuslim/widget');
const ANDROID_DRAWABLE_DIR = resolve(ROOT, 'android/app/src/main/res/drawable');
const ANDROID_PREVIEW_DIR = resolve(ROOT, 'android/app/src/main/res/drawable-nodpi');
const REGISTRY_TS = resolve(ROOT, 'lib/widgets/registry.ts');
const ANDROID_TASK = resolve(ROOT, 'lib/android-widget-task-handler.tsx');
const ANDROID_SNAPSHOT = resolve(ROOT, 'components/widgets/android/SnapshotWidget.tsx');
const ANDROID_SHARED = resolve(ROOT, 'components/widgets/android/shared.ts');
const ANDROID_LOCKED = resolve(ROOT, 'components/widgets/android/LockedWidget.tsx');
const ANDROID_NATIVE_OVERLAY = resolve(ROOT, 'android/app/src/main/java/com/rooh/almuslim/widget/NativeWidgetTextOverlay.kt');
const SNAPSHOT_PUMP_CONTROLLER = resolve(ROOT, 'components/widgets/SnapshotPumpController.tsx');
const SNAPSHOT_TS = resolve(ROOT, 'lib/widgets/snapshot.tsx');
const BRIDGE_TS = resolve(ROOT, 'lib/widget-data-bridge.ts');
const PACKAGE_JSON = resolve(ROOT, 'package.json');
const APP_LAYOUT = resolve(ROOT, 'app/_layout.tsx');
const APP_WIDGET = resolve(ROOT, 'app/widget.tsx');
const ANDROID_PREVIEW_GENERATOR = resolve(ROOT, 'scripts/generate-android-widget-preview-images.mjs');
const ANDROID_PROVIDER_GENERATOR = resolve(ROOT, 'scripts/generate-android-widget-providers.mjs');
const ANDROID_WIDGET_PATCH = resolve(ROOT, 'scripts/patch-react-native-android-widget.js');

const LOCK_PROVIDERS = [
  { ios: 'RoohLockDayThuluthWidget', android: 'RoohLockDayThuluth', xml: 'widgetprovider_roohlockdaythuluth', id: 'dayThuluth', size: 'small' },
  { ios: 'RoohLockMonthThuluthWidget', android: 'RoohLockMonthThuluth', xml: 'widgetprovider_roohlockmonththuluth', id: 'monthThuluth', size: 'medium' },
  { ios: 'RoohLockNextPrayerWidget', android: 'RoohLockNextPrayer', xml: 'widgetprovider_roohlocknextprayer', id: 'prayerSingle', size: 'small' },
  { ios: 'RoohLockAllPrayersWidget', android: 'RoohLockAllPrayers', xml: 'widgetprovider_roohlockallprayers', id: 'prayerTable', size: 'medium' },
  { ios: 'RoohLockHijriCircularWidget', android: 'RoohLockHijriCircular', xml: 'widgetprovider_roohlockhijricircular', id: 'hijriDate', size: 'small' },
  { ios: 'RoohLockNextPrayerCountdownWidget', android: 'RoohLockNextPrayerCountdown', xml: 'widgetprovider_roohlocknextprayercountdown', id: 'prayerSingle', size: 'small' },
];

const FORBIDDEN_GALLERY_WIDGETS = [
  {
    id: 'monthElegantEn',
    className: 'RoohMonthElegantEnMedium',
    xmlRes: 'widgetprovider_roohmonthelegantenmedium',
    titleAr: 'الشهر - أنيق',
  },
];

const RETIRED_ANDROID_PICKER_PROVIDERS = ['RoohSmall', 'RoohMedium', 'RoohLarge'];

const STALE_ANDROID_VARIANT_PROVIDERS = [
  'RoohVerseOfDaySmall',
  'RoohVerseOfDayLarge',
  'RoohAzkarMorningSmall',
  'RoohAzkarEveningSmall',
  'RoohDailyDhikrSmall',
];

function cap(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function providerClassName(id, size) {
  return `Rooh${cap(id)}${cap(size)}`;
}

function xmlResName(id, size) {
  return `widgetprovider_rooh${id.toLowerCase()}${size}`;
}

function previewDrawableName(id, size) {
  return `widget_preview_${id.toLowerCase()}_${size}`;
}

function premiumRequiredForSize(def, size) {
  if (Array.isArray(def.premiumSizes) && def.premiumSizes.length > 0) {
    return def.premiumSizes.includes(size);
  }
  return !!def.isPremium;
}

function expectedHomePreviewDrawable(def, size) {
  return previewDrawableName(def.id, size);
}

function fail(errors, message) {
  errors.push(message);
}

function assertContains(errors, haystack, needle, label) {
  if (!haystack.includes(needle)) fail(errors, `${label}: missing ${needle}`);
}

function assertNotContains(errors, haystack, needle, label) {
  if (haystack.includes(needle)) fail(errors, `${label}: still contains ${needle}`);
}

function assertFile(errors, path, label) {
  if (!existsSync(path)) fail(errors, `${label}: missing file ${path}`);
}

function assertEqualFile(errors, a, b, label) {
  if (!existsSync(a) || !existsSync(b)) return;
  const left = readFileSync(a, 'utf8');
  const right = readFileSync(b, 'utf8');
  if (left !== right) fail(errors, `${label}: source and Xcode target files are out of sync`);
}

function assertRegionHasInk(errors, filePath, region, label) {
  if (!existsSync(filePath)) return;
  const png = PNG.sync.read(readFileSync(filePath));
  let darkPixelCount = 0;
  for (let y = region.y; y < Math.min(region.y + region.height, png.height); y += 1) {
    for (let x = region.x; x < Math.min(region.x + region.width, png.width); x += 1) {
      const index = (png.width * y + x) << 2;
      const average = (png.data[index] + png.data[index + 1] + png.data[index + 2]) / 3;
      if (png.data[index + 3] > 64 && average < 130) darkPixelCount += 1;
    }
  }
  if (darkPixelCount < 40) {
    fail(errors, `${label}: dynamic text is missing (${darkPixelCount} dark pixels)`);
  }
}

function main() {
  const errors = [];
  const registry = JSON.parse(readFileSync(REGISTRY_JSON, 'utf8'));
  const iosEnums = readFileSync(IOS_ENUMS, 'utf8');
  const iosTargetEnums = readFileSync(IOS_TARGET_ENUMS, 'utf8');
  const iosSwift = readFileSync(IOS_SWIFT, 'utf8');
  const iosBundle = readFileSync(IOS_BUNDLE, 'utf8');
  const iosTargetSwift = readFileSync(IOS_TARGET_SWIFT, 'utf8');
  const iosTargetBundle = readFileSync(IOS_TARGET_BUNDLE, 'utf8');
  const iosLocalizable = readFileSync(IOS_LOCALIZABLE, 'utf8');
  const iosTargetLocalizable = readFileSync(IOS_TARGET_LOCALIZABLE, 'utf8');
  const androidManifest = readFileSync(ANDROID_MANIFEST, 'utf8');
  const registryTs = readFileSync(REGISTRY_TS, 'utf8');
  const androidTask = readFileSync(ANDROID_TASK, 'utf8');
  const androidSnapshot = readFileSync(ANDROID_SNAPSHOT, 'utf8');
  const androidShared = readFileSync(ANDROID_SHARED, 'utf8');
  const androidLocked = readFileSync(ANDROID_LOCKED, 'utf8');
  const androidNativeOverlay = readFileSync(ANDROID_NATIVE_OVERLAY, 'utf8');
  const snapshotPumpController = readFileSync(SNAPSHOT_PUMP_CONTROLLER, 'utf8');
  const snapshotTs = readFileSync(SNAPSHOT_TS, 'utf8');
  const bridgeTs = readFileSync(BRIDGE_TS, 'utf8');
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
  const appLayout = readFileSync(APP_LAYOUT, 'utf8');
  const appWidget = readFileSync(APP_WIDGET, 'utf8');
  const androidPreviewGenerator = readFileSync(ANDROID_PREVIEW_GENERATOR, 'utf8');
  const androidProviderGenerator = readFileSync(ANDROID_PROVIDER_GENERATOR, 'utf8');
  const androidWidgetPatch = readFileSync(ANDROID_WIDGET_PATCH, 'utf8');
  const iosLegacyNextPrayer = readFileSync(IOS_LEGACY_NEXT_PRAYER, 'utf8');

  assertEqualFile(errors, IOS_ENUMS, IOS_TARGET_ENUMS, 'iOS GeneratedWidgetEnums.swift');
  assertEqualFile(errors, IOS_SWIFT, IOS_TARGET_SWIFT, 'iOS RoohWidgets.swift');
  assertEqualFile(errors, IOS_BUNDLE, IOS_TARGET_BUNDLE, 'iOS WidgetBundle.swift');
  assertEqualFile(errors, IOS_LOCALIZABLE, IOS_TARGET_LOCALIZABLE, 'iOS Localizable.xcstrings');
  assertEqualFile(errors, IOS_PRAYER_INPUTS, IOS_TARGET_PRAYER_INPUTS, 'iOS PrayerInputs.swift');

  assertContains(errors, iosBundle, 'RoohSmallWidget()', 'iOS grouped small widget');
  assertContains(errors, iosBundle, 'RoohMediumWidget()', 'iOS grouped medium widget');
  assertContains(errors, iosBundle, 'RoohLargeWidget()', 'iOS grouped large widget');
  assertContains(errors, iosSwift, 'AppIntentConfiguration(', 'iOS grouped configurable widgets');
  assertContains(errors, iosSwift, 'StaticConfiguration(kind:', 'iOS lock/static widgets');
  assertContains(errors, iosSwift, 'snapshotManifest', 'iOS snapshot manifest decoding');
  assertContains(errors, iosSwift, 'nextPrayerAtEpochMs', 'iOS countdown from absolute prayer timestamp');
  assertContains(errors, iosSwift, 'return .light', 'iOS auto theme resolves to light');
  assertContains(errors, iosSwift, 'loaded snapshot route=', 'iOS loaded snapshot logging');
  assertContains(errors, iosSwift, 'fallback reason=', 'iOS fallback snapshot logging');
  assertNotContains(errors, iosEnums, 'Previous & Next Prayer', 'iOS Arabic app-intent fallback for previous/next widget');
  assertNotContains(errors, iosTargetEnums, 'Previous & Next Prayer', 'iOS target Arabic app-intent fallback for previous/next widget');
  assertNotContains(errors, iosLocalizable, '"value" : "Previous & Next Prayer"', 'iOS previous/next localized title');
  assertNotContains(errors, iosTargetLocalizable, '"value" : "Previous & Next Prayer"', 'iOS target previous/next localized title');
  assertContains(errors, iosLocalizable, '"widget.kind.prayerNextPrevious"', 'iOS previous/next localized key');
  assertContains(errors, iosLocalizable, '"value" : "الصلاة السابقة والقادمة"', 'iOS previous/next Arabic localized value');

  if (!androidShared.includes("auto: { bg: '#E3E0DB'")) {
    fail(errors, 'Android auto theme must resolve to the gallery light/cream palette');
  }
  assertContains(errors, androidShared, 'watermarkFontFor', 'Android date widgets share the iOS watermark font rule');
  if (androidManifest.includes('android:configure=')) {
    fail(errors, 'Android manifest: visual configuration activity is still exposed');
  }
  assertContains(errors, androidSnapshot, 'snapshotManifest', 'Android snapshot manifest lookup');
  assertContains(errors, androidSnapshot, 'OverlapWidget', 'Android true overlay container');
  assertContains(errors, androidSnapshot, 'ANDROID_OVERLAY_ANCHORS', 'Android live countdown overlay anchors');
  assertContains(errors, androidSnapshot, 'NATIVE_TEXT_VERTICAL_SAFETY', 'Android native countdown text safety inset');
  assertContains(errors, androidNativeOverlay, 'if (config.optBoolean("compact", false)) localized.replace("\\\\s".toRegex(), "") else localized', 'Android native countdown strips whitespace only for compact anchors');
  assertNotContains(errors, androidSnapshot, "overlayText.replace(/\\s/g, '')", 'Android initial countdown render preserves gallery whitespace');
  assertNotContains(errors, androidSnapshot, "overlayStr.replace(/\\s/g, '')", 'Android fallback countdown render preserves gallery whitespace');
  assertNotContains(errors, iosSwift, 'remaining.replacingOccurrences(of: " ", with: "")', 'iOS compact countdown preserves gallery whitespace');
  assertNotContains(errors, iosSwift, 'raw.replacingOccurrences(of: " ", with: "")', 'iOS fallback countdown render preserves gallery whitespace');
  assertContains(errors, androidWidgetPatch, 'android:includeFontPadding="true"', 'Android native countdown keeps Arabic font padding');
  assertContains(errors, androidWidgetPatch, `.replace(/android:includeFontPadding="false"/g, 'android:includeFontPadding="true"')`, 'Android native countdown patch migrates old clipped layouts');
  assertContains(errors, androidSnapshot, "blendOver(p.isLight ? '#000000' : '#FFFFFF', 0.1, p.bg)", 'Android watermark pre-flattened to solid RGB (RNAW drops 8-digit hex)');
  assertNotContains(errors, androidSnapshot, "'#1A000000' : '#1AFFFFFF'", 'Android watermark must not use ARGB in React Native styles');
  assertNotContains(errors, androidSnapshot, "widgetId === 'monthSimple' || widgetId === 'monthThuluth'", 'Android month widgets must not share one broken renderer');
  assertContains(errors, androidSnapshot, "widgetId === 'monthSimple'", 'Android monthSimple renderer');
  assertContains(errors, androidSnapshot, "widgetId === 'monthThuluth'", 'Android monthThuluth renderer');
  assertNotContains(errors, androidSnapshot, "'Amiri-Bold'", 'Android daySimple must match iOS Rubik typography');
  // The gallery renders Arabic day/month labels in the user-selected widget
  // font (`ar ? widgetFont : 'Rubik-Bold'` in previews/index.tsx) — the live
  // Android render must mirror that or home diverges from gallery.
  assertContains(errors, androidSnapshot, 'fontFamily: isAr ? widgetFont : FONT.rubikBold', 'Android day/month labels use the gallery widget font for Arabic');
  assertContains(errors, androidSnapshot, 'nextPrayerAtEpochMs', 'Android countdown from absolute prayer timestamp');
  assertContains(errors, androidSnapshot, 'backgroundColor: p.bg', 'Android themed PNG backing shell');
  if (androidSnapshot.includes("backgroundColor: '#E3E0DB'") || androidSnapshot.includes('backgroundColor: "#E3E0DB"')) {
    fail(errors, 'Android PNG shell: hard-coded light/cream background would leak around dark themed widgets');
  }
  assertContains(errors, androidSnapshot, 'widgetWidth?: number', 'Android launcher widget width input');
  assertContains(errors, androidSnapshot, 'widgetHeight?: number', 'Android launcher widget height input');
  assertContains(errors, androidSnapshot, 'renderScale = Math.min(targetWidth / width, targetHeight / height)', 'Android preserves full gallery snapshot');
  assertContains(errors, androidSnapshot, 'renderScale = Math.min(targetWidth / logicalWidth, targetHeight / logicalHeight)', 'Android live date widgets preserve gallery aspect ratio');
  assertContains(errors, androidSnapshot, 'formatDateSample(now, configuredDateFormat, numerals, isAr)', 'Android live date widgets use the gallery date-format source');
  assertContains(errors, androidSnapshot, "widgetId === 'prayerSingle' && ov.key === 'hero'", 'Android small prayer time keeps a dedicated centered baseline');
  assertContains(errors, androidSnapshot, 'imageWidth={renderedImageWidth}', 'Android scaled ImageWidget width');
  assertContains(errors, androidSnapshot, 'imageHeight={renderedImageHeight}', 'Android scaled ImageWidget height');
  assertContains(errors, androidTask, 'widgetWidth={widgetBounds?.width}', 'Android task passes launcher width');
  assertContains(errors, androidTask, 'widgetHeight={widgetBounds?.height}', 'Android task passes launcher height');
  assertContains(errors, bridgeTs, 'renderWidget: (widgetInfo:', 'Android immediate refresh receives launcher widget info');
  // Round 3 removed the per-state prayer template subsystem: every prayer
  // widget now serves the gallery-fallback PNG + live anchor overlays through
  // the SINGLE decideAndroidWidget/renderAndroidWidgetDecision resolver. The
  // immediate refresh must use the same resolver (no second render path) and
  // must NOT resurrect the template-override plumbing.
  assertContains(errors, bridgeTs, 'await decideAndroidWidget(widgetName, sharedData)', 'Android immediate refresh precomputes decisions via the single resolver');
  assertContains(errors, bridgeTs, 'renderAndroidWidgetDecision(decision, sharedData, widgetInfo)', 'Android immediate refresh renders through the single resolver');
  assertNotContains(errors, bridgeTs, 'resolveAndroidSnapshotRenderOverride', 'Android immediate refresh must not resurrect per-state prayer template overrides');
  assertNotContains(errors, bridgeTs, 'ensureAndroidPrayerStaticTemplates?.(', 'Android pump must not re-bake the removed per-state prayer templates');
  assertContains(errors, bridgeTs, '}, 5000);', 'Android background prayer prewarm is delayed after the visible reload');
  assertContains(errors, bridgeTs, 'displayOverride?: WidgetDisplayOverride', 'Android settings refresh can bypass stale stored display values');
  assertContains(errors, bridgeTs, "applied immediate display override (updateWidgetData)", 'Android settings refresh applies the just-selected display value immediately');
  assertContains(errors, bridgeTs, 'refreshWidgetDisplayNow', 'Widget settings have a display-only fast refresh path');
  assertContains(errors, bridgeTs, 'displayOnlyWriteMs', 'Widget display-only refresh writes shared data before full prayer sync');
  assertContains(errors, bridgeTs, 'RESOLVED_WIDGET_THEMES', 'Android background prewarm prepares placed widgets for all themes');
  assertContains(errors, appWidget, 'applyWidgetSetting', 'Widget settings apply + persist each picked option immediately');
  assertContains(errors, appWidget, 'syncInFlightRef', 'Widget settings coalesce concurrent re-bakes into one trailing sync');
  assertContains(
    errors,
    snapshotPumpController,
    'if (pending) {\n        runActiveThenBackgroundPump(true).catch(() => {});\n      }',
    'Widget settings changes do not start a competing snapshot pump',
  );
  const foregroundPumpCalls = snapshotPumpController.match(/runActiveThenBackgroundPump\(pending\)\.catch/g) ?? [];
  if (foregroundPumpCalls.length > 1) {
    fail(errors, 'Widget settings changes: duplicate unconditional snapshot pump can race updateWidgetData and delay native widget refresh');
  }
  assertContains(errors, androidSnapshot, 'loading snapshot route=', 'Android loaded snapshot logging');
  assertContains(errors, androidSnapshot, 'fallback reason=', 'Android fallback snapshot logging');
  assertNotContains(errors, androidLocked, 'APP_ICON', 'Android premium locked widget must match iOS without app icon');
  assertNotContains(errors, androidLocked, 'ImageWidget', 'Android premium locked widget must match iOS without app icon image');
  assertNotContains(errors, androidLocked, '#1A1A2E', 'Android premium locked widget must use the selected widget palette');
  assertNotContains(errors, androidLocked, 'اشترك للحصول على هذه الودجت', 'Android premium locked widget old copy');
  assertContains(errors, androidLocked, 'SvgWidget', 'Android premium locked widget lock glyph');
  assertContains(errors, androidLocked, 'اشترك للوصول', 'Android premium locked widget title');
  assertContains(errors, androidLocked, 'افتح التطبيق للاشتراك', 'Android premium locked widget subtitle');
  assertContains(errors, androidLocked, 'paletteFor', 'Android premium locked widget theme palette');
  assertContains(errors, snapshotTs, 'snapshotVersion', 'Snapshot version/hash key');
  assertContains(errors, snapshotTs, 'moveAsync({ from: tmpDst, to: dst })', 'Android atomic snapshot move');
  assertContains(errors, snapshotTs, 'cleanupOldSnapshots', 'Snapshot cleanup');
  assertContains(errors, bridgeTs, 'snapshotManifest', 'Shared widget snapshot manifest');
  assertContains(errors, bridgeTs, 'refreshWidgetsNow', 'Refresh proof function');
  assertContains(errors, bridgeTs, 'writeToSharedStorage(WIDGET_DATA_KEY, json)', 'Shared data write after snapshot generation');
  if (packageJson.scripts?.['verify:widgets'] !== 'node scripts/verify-widget-parity.mjs') {
    fail(errors, 'package.json: missing verify:widgets script');
  }
  if (!packageJson.scripts?.['widgets:generate']) {
    fail(errors, 'package.json: missing widgets:generate script');
  }
  const densityScaledPreviewPngs = readdirSync(ANDROID_DRAWABLE_DIR)
    .filter((name) => /^widget_preview_.*\.png$/.test(name));
  if (densityScaledPreviewPngs.length > 0) {
    fail(errors, `Android picker previews: PNGs must live in drawable-nodpi only (${densityScaledPreviewPngs.join(', ')})`);
  }
  const expectedPreviewPngs = new Set();
  for (const def of registry) {
    for (const size of def.sizes ?? []) {
      expectedPreviewPngs.add(`${previewDrawableName(def.id, size)}.png`);
    }
  }
  const stalePreviewPngs = readdirSync(ANDROID_PREVIEW_DIR)
    .filter((name) => /^widget_preview_.*\.png$/.test(name) && !expectedPreviewPngs.has(name));
  if (stalePreviewPngs.length > 0) {
    fail(errors, `Android picker previews: stale drawable-nodpi PNGs are still present (${stalePreviewPngs.join(', ')})`);
  }
  const staleLockedPreviewXml = readdirSync(ANDROID_DRAWABLE_DIR)
    .filter((name) => /^widget_preview_.*_locked\.xml$/.test(name));
  if (staleLockedPreviewXml.length > 0) {
    fail(errors, `Android picker previews: stale locked layer-list XMLs are still present (${staleLockedPreviewXml.join(', ')})`);
  }
  for (const className of RETIRED_ANDROID_PICKER_PROVIDERS) {
    if (androidManifest.includes(`android:name=".widget.${className}"`)) {
      fail(errors, `Android manifest:${className}: generic iOS-style picker provider is still visible`);
    }
  }
  for (const className of STALE_ANDROID_VARIANT_PROVIDERS) {
    if (androidManifest.includes(`android:name=".widget.${className}"`)) {
      fail(errors, `Android manifest:${className}: stale provider is still visible in the Launcher picker`);
    }
    if (registryTs.includes(`${className}:`)) {
      fail(errors, `Android provider route:${className}: stale gallery route is still registered`);
    }
  }

  for (const forbidden of FORBIDDEN_GALLERY_WIDGETS) {
    const generatedJson = JSON.stringify(registry);
    if (generatedJson.includes(forbidden.id)) {
      fail(errors, `Forbidden widget:${forbidden.id}: still present in generated iOS/Android registry`);
    }
    if (iosEnums.includes(forbidden.id)) {
      fail(errors, `Forbidden widget:${forbidden.id}: still present in iOS AppIntent picker enum`);
    }
    if (androidManifest.includes(`android:name=".widget.${forbidden.className}"`) || androidManifest.includes(forbidden.xmlRes)) {
      fail(errors, `Forbidden widget:${forbidden.id}: still present in Android launcher manifest`);
    }
    if (registryTs.includes(`id: '${forbidden.id}'`) || registryTs.includes(forbidden.titleAr)) {
      fail(errors, `Forbidden widget:${forbidden.id}: still present in source registry`);
    }
  }

  const homeProviders = [];
  for (const def of registry) {
    if (!Array.isArray(def.platforms) || !def.platforms.includes('ios')) {
      fail(errors, `registry:${def.id}: missing ios platform`);
    }
    if (!Array.isArray(def.platforms) || !def.platforms.includes('android')) {
      fail(errors, `registry:${def.id}: missing android platform`);
    }
    assertContains(errors, iosEnums, `case ${def.iosKind ?? def.id}`, `iOS enum:${def.id}`);

    for (const size of def.sizes ?? []) {
      const className = providerClassName(def.id, size);
      const xmlRes = xmlResName(def.id, size);
      homeProviders.push(className);

      assertContains(errors, androidManifest, `android:name=".widget.${className}"`, `Android manifest:${className}`);
      assertContains(errors, androidManifest, `android:resource="@xml/${xmlRes}"`, `Android manifest:${className}`);
      assertContains(errors, registryTs, `${className}:`, `Android provider route:${className}`);
      assertFile(errors, resolve(ANDROID_JAVA_DIR, `${className}.java`), `Android Java:${className}`);

      const xmlPath = resolve(ANDROID_XML_DIR, `${xmlRes}.xml`);
      assertFile(errors, xmlPath, `Android XML:${className}`);
      if (existsSync(xmlPath)) {
        const xml = readFileSync(xmlPath, 'utf8');
        assertContains(errors, xml, 'android:widgetCategory="home_screen"', `Android XML:${className}`);
        const preview = expectedHomePreviewDrawable(def, size);
        const basePreview = previewDrawableName(def.id, size);
        assertContains(errors, xml, `android:previewImage="@drawable/${preview}"`, `Android XML:${className}`);
        assertFile(errors, resolve(ANDROID_PREVIEW_DIR, `${basePreview}.png`), `Android preview:${className}`);
        if (xml.includes('android:description=')) {
          fail(errors, `Android XML:${className}: picker title is repeated through android:description`);
        }
        const expectedTargetCells = {
          small: { width: 2, height: 2 },
          medium: { width: 3, height: 2 },
          // large is 3×3 with minHeight 260dp — the ~square prayer-table card
          // contain-fits the 3-col width; a 4-row cell left an empty band below
          // (see SIZE_DIMS in generate-android-widget-providers.mjs).
          large: { width: 3, height: 3 },
        }[size];
        if (expectedTargetCells) {
          assertContains(errors, xml, `android:targetCellWidth="${expectedTargetCells.width}"`, `Android XML:${className}`);
          assertContains(errors, xml, `android:targetCellHeight="${expectedTargetCells.height}"`, `Android XML:${className}`);
        }
        if (xml.includes('roohsmall_preview') || xml.includes('roohmedium_preview') || xml.includes('roohlarge_preview')) {
          fail(errors, `Android XML:${className}: launcher preview still uses generic app logo`);
        }
      }
    }
  }

  for (const provider of LOCK_PROVIDERS) {
    assertContains(errors, iosBundle, `${provider.ios}()`, `iOS lock bundle:${provider.ios}`);
    assertContains(errors, androidManifest, `android:name=".widget.${provider.android}"`, `Android lock manifest:${provider.android}`);
    assertContains(errors, androidManifest, `android:resource="@xml/${provider.xml}"`, `Android lock manifest:${provider.android}`);
    assertContains(errors, registryTs, `${provider.android}:`, `Android lock route:${provider.android}`);
    assertFile(errors, resolve(ANDROID_JAVA_DIR, `${provider.android}.java`), `Android lock Java:${provider.android}`);

    const xmlPath = resolve(ANDROID_XML_DIR, `${provider.xml}.xml`);
    assertFile(errors, xmlPath, `Android lock XML:${provider.android}`);
    if (existsSync(xmlPath)) {
      const xml = readFileSync(xmlPath, 'utf8');
      assertContains(errors, xml, 'android:widgetCategory="keyguard"', `Android lock XML:${provider.android}`);
      assertContains(errors, xml, 'android:initialKeyguardLayout="@layout/rn_widget"', `Android lock XML:${provider.android}`);
      const preview = previewDrawableName(provider.id, provider.size);
      assertContains(errors, xml, `android:previewImage="@drawable/${preview}"`, `Android lock XML:${provider.android}`);
      assertFile(errors, resolve(ANDROID_PREVIEW_DIR, `${preview}.png`), `Android lock preview:${provider.android}`);
      if (xml.includes('android:description=')) {
        fail(errors, `Android lock XML:${provider.android}: picker title is repeated through android:description`);
      }
      if (xml.includes('roohsmall_preview') || xml.includes('roohmedium_preview') || xml.includes('roohlarge_preview')) {
        fail(errors, `Android lock XML:${provider.android}: launcher preview still uses generic app logo`);
      }
    }
  }

  assertContains(errors, androidTask, 'AppNotOpenedWidget', 'Android open-first state');
  assertContains(errors, androidTask, '!data && !appOpened', 'Android open-first branch');
  assertContains(errors, androidTask, 'premiumRequiredForSize', 'Android premium gate');
  assertContains(errors, androidTask, 'LockedWidget', 'Android premium locked state');
  assertContains(errors, androidTask, 'AsyncStorage.setItem(WIDGET_DATA_KEY', 'Android persists fresh offline prayer calculation');
  assertContains(errors, androidPreviewGenerator, 'pickerDynamicOverlaySvg', 'Android picker dynamic thumbnail overlays');
  // Picker thumbnails replay the SAME anchors SnapshotWidget draws live,
  // pulled from the device manifest next to the snapshot PNGs. Prayer widgets
  // bake all dynamic text as blanks, so a missing anchor set must abort the
  // generator instead of silently emitting blank prayer previews.
  assertContains(errors, androidPreviewGenerator, 'MANIFEST_ANCHORS', 'Android picker thumbnails replay the pulled device anchor manifest');
  assertContains(errors, androidPreviewGenerator, 'PRAYER_PICKER_IDS', 'Android picker prayer thumbnails fail loudly without pulled anchors');
  assertFile(errors, resolve(ROOT, 'tmp/widget-previews/anchors.json'), 'Android picker anchor manifest (run scripts/pull-android-widget-snapshots.mjs)');
  try {
    const pulledAnchors = JSON.parse(readFileSync(resolve(ROOT, 'tmp/widget-previews/anchors.json'), 'utf8'));
    const PRAYER_ROUTES = ['prayerSingle_small', 'prayerTable_small', 'prayerTable_medium', 'prayerTable_large', 'prayerNextPrevious_medium'];
    const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const route of PRAYER_ROUTES) {
      const entry = pulledAnchors[route];
      if (!entry?.anchors?.length) {
        fail(errors, `Picker anchors:${route}: missing — its launcher preview would render blank`);
        continue;
      }
      if (route.startsWith('prayerTable')) {
        // Mirror the runtime completeness guard in SnapshotWidget: a table
        // preview without all six row-time anchors cannot render its rows.
        const ids = new Set(entry.anchors.map((a) => a.id));
        for (const key of PRAYER_KEYS) {
          if (!ids.has(`prayerRowTime.${key}`)) fail(errors, `Picker anchors:${route}: missing prayerRowTime.${key}`);
        }
      }
    }
  } catch (e) {
    fail(errors, `Picker anchors: unreadable (${e?.message ?? e})`);
  }
  assertNotContains(errors, androidPreviewGenerator, 'font-family="Arial, sans-serif"', 'Android picker countdown typography must match live Rubik overlay');
  assertNotContains(errors, androidPreviewGenerator, 'y="136"', 'Android picker countdown must not use old clipped y coordinate');
  assertNotContains(errors, androidPreviewGenerator, 'y="134"', 'Android picker countdown must not use old clipped y coordinate');
  assertContains(errors, androidPreviewGenerator, ".resize(dims.width, dims.height, { fit: 'fill' })", 'Android picker thumbnail normalization');
  assertContains(errors, androidProviderGenerator, 'targetCellWidth', 'Android launcher provider target cell width');
  assertContains(errors, androidProviderGenerator, 'targetCellHeight', 'Android launcher provider target cell height');
  if (androidPreviewGenerator.includes('<rect x="126" y="100"')) {
    fail(errors, 'Android prayerTable large picker overlay still uses a visible mask rectangle');
  }
  assertRegionHasInk(
    errors,
    resolve(ANDROID_PREVIEW_DIR, 'widget_preview_daydigital_small.png'),
    { x: 25, y: 38, width: 105, height: 68 },
    'Android dayDigital picker thumbnail',
  );
  assertRegionHasInk(
    errors,
    resolve(ANDROID_PREVIEW_DIR, 'widget_preview_prayertable_large.png'),
    { x: 185, y: 305, width: 125, height: 34 },
    'Android prayerTable large picker thumbnail bottom row',
  );
  assertRegionHasInk(
    errors,
    resolve(ANDROID_PREVIEW_DIR, 'widget_preview_prayertable_small.png'),
    { x: 0, y: 0, width: 120, height: 50 },
    'Android prayerTable small picker thumbnail countdown header',
  );
  assertContains(errors, androidSnapshot, 'prayerNextCountdownWithLabel', 'Android prayerTable large live countdown matches gallery label');
  assertContains(errors, iosSwift, '.configurationDisplayName("الصلاة القادمة")', 'iOS next-prayer widget title');
  assertContains(errors, iosSwift, '.supportedFamilies([.accessoryRectangular, .accessoryInline])', 'iOS lock next-prayer inline family');
  assertContains(errors, iosSwift, 'if family == .accessoryInline', 'iOS lock next-prayer inline renderer');
  assertContains(errors, iosSwift, 'sharedDataWithFreshPrayer(now:', 'iOS lock widgets refresh prayer calculation');
  if (iosLegacyNextPrayer.includes('"12:15')) {
    fail(errors, 'iOS legacy next-prayer widget: hard-coded 12:15 fallback is still present');
  }
  if (iosLegacyNextPrayer.includes('.configurationDisplayName("مواقيت الصلاة")')) {
    fail(errors, 'iOS legacy next-prayer widget: picker title must be الصلاة القادمة');
  }
  assertContains(errors, appLayout, "AsyncStorage.setItem(APP_OPENED_ONCE_KEY, 'true')", 'App opened marker');

  if (errors.length > 0) {
    console.error('Widget parity verification failed:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log('✓ Widget parity verified');
  console.log(`  Home-screen registry definitions: ${registry.length}`);
  console.log(`  Home-screen Android providers:    ${homeProviders.length}`);
  console.log(`  Lock-screen provider parity:      ${LOCK_PROVIDERS.length} iOS + ${LOCK_PROVIDERS.length} Android`);
  console.log('  Android open-app-first state:     present');
}

main();
