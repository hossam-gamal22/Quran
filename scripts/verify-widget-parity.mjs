#!/usr/bin/env node
// Verifies that the widget registry is shipped consistently across:
//   - iOS configurable home-screen widgets,
//   - Android home-screen AppWidget providers,
//   - iOS/Android lock-screen provider lists.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const REGISTRY_JSON = resolve(ROOT, 'widgets/ios/Resources/widget-registry.json');
const IOS_ENUMS = resolve(ROOT, 'widgets/ios/GeneratedWidgetEnums.swift');
const IOS_SWIFT = resolve(ROOT, 'widgets/ios/RoohWidgets.swift');
const IOS_BUNDLE = resolve(ROOT, 'widgets/ios/WidgetBundle.swift');
const IOS_TARGET_SWIFT = resolve(ROOT, 'ios/RoohAlMuslimWidgets/RoohWidgets.swift');
const IOS_TARGET_BUNDLE = resolve(ROOT, 'ios/RoohAlMuslimWidgets/WidgetBundle.swift');
const ANDROID_MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml');
const ANDROID_XML_DIR = resolve(ROOT, 'android/app/src/main/res/xml');
const ANDROID_JAVA_DIR = resolve(ROOT, 'android/app/src/main/java/com/rooh/almuslim/widget');
const ANDROID_DRAWABLE_DIR = resolve(ROOT, 'android/app/src/main/res/drawable');
const REGISTRY_TS = resolve(ROOT, 'lib/widgets/registry.ts');
const ANDROID_TASK = resolve(ROOT, 'lib/android-widget-task-handler.tsx');
const ANDROID_SNAPSHOT = resolve(ROOT, 'components/widgets/android/SnapshotWidget.tsx');
const ANDROID_SHARED = resolve(ROOT, 'components/widgets/android/shared.ts');
const SNAPSHOT_TS = resolve(ROOT, 'lib/widgets/snapshot.tsx');
const BRIDGE_TS = resolve(ROOT, 'lib/widget-data-bridge.ts');
const PACKAGE_JSON = resolve(ROOT, 'package.json');
const APP_LAYOUT = resolve(ROOT, 'app/_layout.tsx');

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
  const base = previewDrawableName(def.id, size);
  return premiumRequiredForSize(def, size) ? `${base}_locked` : base;
}

function fail(errors, message) {
  errors.push(message);
}

function assertContains(errors, haystack, needle, label) {
  if (!haystack.includes(needle)) fail(errors, `${label}: missing ${needle}`);
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

function main() {
  const errors = [];
  const registry = JSON.parse(readFileSync(REGISTRY_JSON, 'utf8'));
  const iosEnums = readFileSync(IOS_ENUMS, 'utf8');
  const iosSwift = readFileSync(IOS_SWIFT, 'utf8');
  const iosBundle = readFileSync(IOS_BUNDLE, 'utf8');
  const iosTargetSwift = readFileSync(IOS_TARGET_SWIFT, 'utf8');
  const iosTargetBundle = readFileSync(IOS_TARGET_BUNDLE, 'utf8');
  const androidManifest = readFileSync(ANDROID_MANIFEST, 'utf8');
  const registryTs = readFileSync(REGISTRY_TS, 'utf8');
  const androidTask = readFileSync(ANDROID_TASK, 'utf8');
  const androidSnapshot = readFileSync(ANDROID_SNAPSHOT, 'utf8');
  const androidShared = readFileSync(ANDROID_SHARED, 'utf8');
  const snapshotTs = readFileSync(SNAPSHOT_TS, 'utf8');
  const bridgeTs = readFileSync(BRIDGE_TS, 'utf8');
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
  const appLayout = readFileSync(APP_LAYOUT, 'utf8');

  assertEqualFile(errors, IOS_SWIFT, IOS_TARGET_SWIFT, 'iOS RoohWidgets.swift');
  assertEqualFile(errors, IOS_BUNDLE, IOS_TARGET_BUNDLE, 'iOS WidgetBundle.swift');

  if (iosSwift.includes('AppIntentConfiguration(') || iosTargetSwift.includes('AppIntentConfiguration(')) {
    fail(errors, 'iOS home widgets: AppIntentConfiguration still exposes Edit Widget visual options');
  }
  assertContains(errors, iosSwift, 'StaticConfiguration(kind:', 'iOS static home widgets');
  assertContains(errors, iosSwift, 'snapshotManifest', 'iOS snapshot manifest decoding');
  assertContains(errors, iosSwift, 'nextPrayerAtEpochMs', 'iOS countdown from absolute prayer timestamp');
  assertContains(errors, iosSwift, 'return .light', 'iOS auto theme resolves to light');
  assertContains(errors, iosSwift, 'loaded snapshot route=', 'iOS loaded snapshot logging');
  assertContains(errors, iosSwift, 'fallback reason=', 'iOS fallback snapshot logging');

  if (!androidShared.includes("auto: { bg: '#E3E0DB'")) {
    fail(errors, 'Android auto theme must resolve to the gallery light/cream palette');
  }
  if (androidManifest.includes('android:configure=')) {
    fail(errors, 'Android manifest: visual configuration activity is still exposed');
  }
  assertContains(errors, androidSnapshot, 'snapshotManifest', 'Android snapshot manifest lookup');
  assertContains(errors, androidSnapshot, 'OverlapWidget', 'Android true overlay container');
  assertContains(errors, androidSnapshot, 'nextPrayerAtEpochMs', 'Android countdown from absolute prayer timestamp');
  assertContains(errors, androidSnapshot, 'backgroundColor: p.bg', 'Android themed PNG backing shell');
  if (androidSnapshot.includes("backgroundColor: '#E3E0DB'") || androidSnapshot.includes('backgroundColor: "#E3E0DB"')) {
    fail(errors, 'Android PNG shell: hard-coded light/cream background would leak around dark themed widgets');
  }
  assertContains(errors, androidSnapshot, 'imageWidth={width}', 'Android exact ImageWidget width');
  assertContains(errors, androidSnapshot, 'imageHeight={height}', 'Android exact ImageWidget height');
  assertContains(errors, androidSnapshot, 'loading snapshot route=', 'Android loaded snapshot logging');
  assertContains(errors, androidSnapshot, 'fallback reason=', 'Android fallback snapshot logging');
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
      assertContains(errors, iosBundle, `${className}Widget()`, `iOS static widget bundle:${className}`);
      assertContains(errors, iosSwift, `kind: "${className}Widget"`, `iOS static widget kind:${className}`);

      const xmlPath = resolve(ANDROID_XML_DIR, `${xmlRes}.xml`);
      assertFile(errors, xmlPath, `Android XML:${className}`);
      if (existsSync(xmlPath)) {
        const xml = readFileSync(xmlPath, 'utf8');
        assertContains(errors, xml, 'android:widgetCategory="home_screen"', `Android XML:${className}`);
        const preview = expectedHomePreviewDrawable(def, size);
        const basePreview = previewDrawableName(def.id, size);
        assertContains(errors, xml, `android:previewImage="@drawable/${preview}"`, `Android XML:${className}`);
        assertFile(errors, resolve(ANDROID_DRAWABLE_DIR, `${basePreview}.png`), `Android preview:${className}`);
        if (premiumRequiredForSize(def, size)) {
          const lockedPreviewPath = resolve(ANDROID_DRAWABLE_DIR, `${preview}.xml`);
          assertFile(errors, lockedPreviewPath, `Android locked preview:${className}`);
          if (existsSync(lockedPreviewPath)) {
            const lockedXml = readFileSync(lockedPreviewPath, 'utf8');
            assertContains(errors, lockedXml, `@drawable/${basePreview}`, `Android locked preview:${className}`);
            assertContains(errors, lockedXml, '@drawable/ic_widget_premium_lock_badge', `Android locked preview:${className}`);
          }
        }
        if (xml.includes('roohsmall_preview') || xml.includes('roohmedium_preview') || xml.includes('roohlarge_preview')) {
          fail(errors, `Android XML:${className}: launcher preview still uses generic app logo`);
        }
      }
    }
  }

  for (const base of [
    { className: 'RoohSmall', xml: 'widgetprovider_roohsmall', id: 'daySimple', size: 'small' },
    { className: 'RoohMedium', xml: 'widgetprovider_roohmedium', id: 'daySimple', size: 'medium' },
    { className: 'RoohLarge', xml: 'widgetprovider_roohlarge', id: 'prayerTable', size: 'large' },
  ]) {
    assertContains(errors, androidManifest, `android:name=".widget.${base.className}"`, `Android legacy provider:${base.className}`);
    assertFile(errors, resolve(ANDROID_JAVA_DIR, `${base.className}.java`), `Android legacy Java:${base.className}`);
    const xmlPath = resolve(ANDROID_XML_DIR, `${base.xml}.xml`);
    assertFile(errors, xmlPath, `Android legacy XML:${base.className}`);
    if (existsSync(xmlPath)) {
      const xml = readFileSync(xmlPath, 'utf8');
      const preview = previewDrawableName(base.id, base.size);
      assertContains(errors, xml, `android:previewImage="@drawable/${preview}"`, `Android legacy XML:${base.className}`);
      assertFile(errors, resolve(ANDROID_DRAWABLE_DIR, `${preview}.png`), `Android legacy preview:${base.className}`);
      if (xml.includes('roohsmall_preview') || xml.includes('roohmedium_preview') || xml.includes('roohlarge_preview')) {
        fail(errors, `Android legacy XML:${base.className}: launcher preview still uses generic app logo`);
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
      assertFile(errors, resolve(ANDROID_DRAWABLE_DIR, `${preview}.png`), `Android lock preview:${provider.android}`);
      if (xml.includes('roohsmall_preview') || xml.includes('roohmedium_preview') || xml.includes('roohlarge_preview')) {
        fail(errors, `Android lock XML:${provider.android}: launcher preview still uses generic app logo`);
      }
    }
  }

  assertContains(errors, androidTask, 'AppNotOpenedWidget', 'Android open-first state');
  assertContains(errors, androidTask, '!data && !appOpened', 'Android open-first branch');
  assertContains(errors, androidTask, 'premiumRequiredForSize', 'Android premium gate');
  assertContains(errors, androidTask, 'LockedWidget', 'Android premium locked state');
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
