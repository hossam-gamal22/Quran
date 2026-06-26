#!/usr/bin/env node
// scripts/generate-android-widget-providers.mjs
// Reads widget definitions from widget-registry.json and generates Android
// receivers for:
//   - one home-screen provider per (id, size) gallery variant,
//   - dedicated keyguard providers that mirror the iOS lock-screen widgets.
//
// Outputs: Java class + widgetprovider XML + strings.xml description +
// AndroidManifest <receiver> entry.

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REG_PATH = resolve(ROOT, 'widgets/ios/Resources/widget-registry.json');
const ANDROID_RES = resolve(ROOT, 'android/app/src/main/res');
const ANDROID_JAVA = resolve(ROOT, 'android/app/src/main/java/com/rooh/almuslim/widget');
const MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml');
const STRINGS = resolve(ANDROID_RES, 'values/strings.xml');
const ANDROID_PREVIEW_RES = resolve(ANDROID_RES, 'drawable-nodpi');
const ANDROID_DRAWABLE_RES = resolve(ANDROID_RES, 'drawable');

function rememberPreview(id, size) {
  return previewDrawableName(id, size);
}

function rememberLockedPreview(id, size) {
  return rememberPreview(id, size);
}

const SIZE_DIMS = {
  small: { width: 110, height: 110, targetCellWidth: 2, targetCellHeight: 2 },
  medium: { width: 250, height: 110, targetCellWidth: 3, targetCellHeight: 2 },
  // The large prayer/table content is ~square (329×345 dp). 3×3 cells with
  // minHeight 260dp is the verified-good sizing (contain-fit renders the card
  // at nearly full width without a big empty band). NOTE: android/ is NOT
  // git-tracked — this generator is the single source of truth for these
  // values, so any sizing tweak must be made HERE, not in the emitted XML.
  large: { width: 250, height: 260, targetCellWidth: 3, targetCellHeight: 3 },
};

const RETIRED_PICKER_PROVIDERS = [
  { className: 'RoohSmall', xmlRes: 'widgetprovider_roohsmall' },
  { className: 'RoohMedium', xmlRes: 'widgetprovider_roohmedium' },
  { className: 'RoohLarge', xmlRes: 'widgetprovider_roohlarge' },
];

const LOCK_PROVIDERS = [
  {
    className: 'RoohLockDayThuluth',
    xmlRes: 'widgetprovider_roohlockdaythuluth',
    stringKey: 'widget_roohlockdaythuluth_description',
    label: 'اليوم ثلث',
    description: 'اليوم ثلث',
    ...SIZE_DIMS.small,
    preview: rememberPreview('dayThuluth', 'small'),
    category: 'keyguard',
    isDate: true,
  },
  {
    className: 'RoohLockMonthThuluth',
    xmlRes: 'widgetprovider_roohlockmonththuluth',
    stringKey: 'widget_roohlockmonththuluth_description',
    label: 'الشهر ثلث',
    description: 'الشهر ثلث',
    ...SIZE_DIMS.medium,
    preview: rememberPreview('monthThuluth', 'medium'),
    category: 'keyguard',
    isDate: true,
  },
  {
    className: 'RoohLockNextPrayer',
    xmlRes: 'widgetprovider_roohlocknextprayer',
    stringKey: 'widget_roohlocknextprayer_description',
    label: 'الصلاة القادمة',
    description: 'الصلاة القادمة',
    ...SIZE_DIMS.small,
    preview: rememberPreview('prayerSingle', 'small'),
    category: 'keyguard',
    isPrayer: true,
  },
  {
    className: 'RoohLockAllPrayers',
    xmlRes: 'widgetprovider_roohlockallprayers',
    stringKey: 'widget_roohlockallprayers_description',
    label: 'مواقيت الصلاة',
    description: 'مواقيت الصلاة',
    ...SIZE_DIMS.medium,
    preview: rememberPreview('prayerTable', 'medium'),
    category: 'keyguard',
    isPrayer: true,
  },
  {
    className: 'RoohLockHijriCircular',
    xmlRes: 'widgetprovider_roohlockhijricircular',
    stringKey: 'widget_roohlockhijricircular_description',
    label: 'التاريخ الهجري',
    description: 'التاريخ الهجري',
    ...SIZE_DIMS.small,
    preview: rememberPreview('hijriDate', 'small'),
    category: 'keyguard',
    isDate: true,
  },
  {
    className: 'RoohLockNextPrayerCountdown',
    xmlRes: 'widgetprovider_roohlocknextprayercountdown',
    stringKey: 'widget_roohlocknextprayercountdown_description',
    label: 'عدّاد الصلاة القادمة',
    description: 'عدّاد الصلاة القادمة',
    ...SIZE_DIMS.small,
    preview: rememberPreview('prayerSingle', 'small'),
    category: 'keyguard',
    isPrayer: true,
  },
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function pascalSize(size) {
  return cap(size);
}

function pascalId(id) {
  // id is camelCase like "dayThuluth", "prayerNextPrevious", "verseOfDay"
  return cap(id);
}

function providerClassName(id, size) {
  return `Rooh${pascalId(id)}${pascalSize(size)}`;
}

function stringKey(id, size) {
  return `widget_rooh${id.toLowerCase()}${size}_description`;
}

function xmlFileName(id, size) {
  return `widgetprovider_rooh${id.toLowerCase()}${size}.xml`;
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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const reg = JSON.parse(readFileSync(REG_PATH, 'utf-8'));

// Collect every Android variant we need to register (id × size, Android-supported only).
const variants = [];
for (const def of reg) {
  if (!Array.isArray(def.platforms) || !def.platforms.includes('android')) continue;
  if (!Array.isArray(def.sizes)) continue;
  for (const size of def.sizes) {
    if (!SIZE_DIMS[size]) continue;
    variants.push({
      id: def.id,
      size,
      titleAr: def.titleAr,
      titleEn: def.titleEn,
      isPremium: premiumRequiredForSize(def, size),
    });
  }
}

const homeProviders = variants.map((v) => {
  const dims = SIZE_DIMS[v.size];
  return {
    className: providerClassName(v.id, v.size),
    xmlRes: xmlFileName(v.id, v.size).replace('.xml', ''),
    stringKey: stringKey(v.id, v.size),
    label: v.titleAr,
    description: v.titleAr,
    ...dims,
    preview: v.isPremium ? rememberLockedPreview(v.id, v.size) : rememberPreview(v.id, v.size),
    category: 'home_screen',
    isPrayer: v.id.startsWith('prayer'),
    // Date-keyed widgets get DateAwareWidgetProvider so the local-midnight
    // refresh alarm stays armed while any of them is placed.
    isDate: /^(day|month|hijri)/.test(v.id),
  };
});

const providers = [
  ...homeProviders,
  ...LOCK_PROVIDERS,
];

const STALE_PROVIDER_CLASSES = [
  ...RETIRED_PICKER_PROVIDERS.map((provider) => provider.className),
  // Removed from the current iOS/gallery registry. Keeping these receivers in
  // the Android manifest makes Launcher show old small/large variants that no
  // longer exist in the app gallery.
  'RoohVerseOfDaySmall',
  'RoohVerseOfDayLarge',
  'RoohAzkarMorningSmall',
  'RoohAzkarEveningSmall',
  'RoohDailyDhikrSmall',
];

// Keep Android's resource folders tidy. The launcher thumbnails themselves are
// generated by generate-android-widget-preview-images.mjs immediately before
// this script, so this script must not overwrite its picker-only overlays with
// the raw React snapshot sources.
mkdirSync(ANDROID_PREVIEW_RES, { recursive: true });
mkdirSync(ANDROID_DRAWABLE_RES, { recursive: true });

for (const file of readdirSync(ANDROID_DRAWABLE_RES)) {
  if (!/^widget_preview_.*_locked\.xml$/.test(file)) continue;
  unlinkSync(resolve(ANDROID_DRAWABLE_RES, file));
}

for (const provider of RETIRED_PICKER_PROVIDERS) {
  const javaPath = resolve(ANDROID_JAVA, `${provider.className}.java`);
  const xmlPath = resolve(ANDROID_RES, 'xml', `${provider.xmlRes}.xml`);
  if (existsSync(javaPath)) unlinkSync(javaPath);
  if (existsSync(xmlPath)) unlinkSync(xmlPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Java classes
// ─────────────────────────────────────────────────────────────────────────────
const javaFiles = [];
for (const provider of providers) {
  const className = provider.className;
  const javaPath = resolve(ANDROID_JAVA, `${className}.java`);
  const baseClass = provider.isPrayer
    ? 'PrayerAwareWidgetProvider'
    : provider.isDate
      ? 'DateAwareWidgetProvider'
      : 'RNWidgetProvider';
  const providerImport = (provider.isPrayer || provider.isDate) ? '' : '\nimport com.reactnativeandroidwidget.RNWidgetProvider;\n';
  const content = `package com.rooh.almuslim.widget;
${providerImport}
public class ${className} extends ${baseClass} {
}
`;
  writeFileSync(javaPath, content);
  javaFiles.push(className);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate widgetprovider XML files
// ─────────────────────────────────────────────────────────────────────────────
for (const provider of providers) {
  const xmlName = `${provider.xmlRes}.xml`;
  const xmlPath = resolve(ANDROID_RES, 'xml', xmlName);
  const keyguardLine = provider.category === 'keyguard'
    ? '    android:initialKeyguardLayout="@layout/rn_widget"\n'
    : '';
  const content = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="${provider.width}dp"
    android:minHeight="${provider.height}dp"
    android:targetCellWidth="${provider.targetCellWidth}"
    android:targetCellHeight="${provider.targetCellHeight}"
    android:resizeMode="none"
    android:initialLayout="@layout/rn_widget"
${keyguardLine}    android:previewImage="@drawable/${provider.preview}"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="${provider.category}">
</appwidget-provider>
`;
  writeFileSync(xmlPath, content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update strings.xml
// ─────────────────────────────────────────────────────────────────────────────
let stringsXml = readFileSync(STRINGS, 'utf-8');
const originalStringsXml = stringsXml;
const stringMap = new Map();
for (const provider of providers) {
  stringMap.set(provider.stringKey, provider.description);
}
const newStringLines = [];
for (const [key, label] of stringMap.entries()) {
  const line = `  <string name="${key}" translatable="false">${escapeXml(label)}</string>`;
  const existing = new RegExp(`\\s*<string name="${escapeRegExp(key)}"[^>]*>.*?</string>`);
  if (existing.test(stringsXml)) {
    stringsXml = stringsXml.replace(existing, `\n${line}`);
  } else {
    newStringLines.push(line);
  }
}
if (newStringLines.length > 0) {
  stringsXml = stringsXml.replace(
    '</resources>',
    `${newStringLines.join('\n')}\n</resources>`,
  );
}
if (stringsXml !== originalStringsXml) {
  writeFileSync(STRINGS, stringsXml);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update AndroidManifest.xml — insert missing <receiver> entries before
// </application>. Existing blocks are preserved so user/native edits are not
// churned unnecessarily.
// ─────────────────────────────────────────────────────────────────────────────
let manifestXml = readFileSync(MANIFEST, 'utf-8');
const originalManifestXml = manifestXml;
const receiverBlocks = [];
for (const className of STALE_PROVIDER_CLASSES) {
  const staleReceiver = new RegExp(
    `\\s*<receiver\\b(?=[^>]*android:name="\\.widget\\.${escapeRegExp(className)}")[\\s\\S]*?</receiver>`,
    'g',
  );
  manifestXml = manifestXml.replace(staleReceiver, '');
}
for (const provider of providers) {
  const className = provider.className;
  if (manifestXml.includes(`android:name=".widget.${className}"`)) {
    const receiver = new RegExp(
      `(<receiver\\b(?=[^>]*android:name="\\.widget\\.${escapeRegExp(className)}")[^>]*android:label=")[^"]*(")`,
    );
    manifestXml = manifestXml.replace(receiver, `$1${escapeXml(provider.label)}$2`);
    continue;
  }
  receiverBlocks.push(
    `    <receiver android:name=".widget.${className}" android:exported="false" android:label="${escapeXml(provider.label)}">
        <intent-filter>
            <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
        </intent-filter>
        <meta-data android:name="android.appwidget.provider" android:resource="@xml/${provider.xmlRes}"/>
    </receiver>`,
  );
}
if (receiverBlocks.length > 0) {
  const marker = '  </application>';
  const idx = manifestXml.indexOf(marker);
  if (idx === -1) throw new Error('Could not find </application> in AndroidManifest.xml');
  manifestXml =
    manifestXml.slice(0, idx) + receiverBlocks.join('\n') + '\n' + manifestXml.slice(idx);
}
if (manifestXml !== originalManifestXml) writeFileSync(MANIFEST, manifestXml);

console.log(`✓ Generated ${homeProviders.length} Android home-screen variant providers`);
console.log(`✓ Generated ${LOCK_PROVIDERS.length} Android keyguard providers`);
console.log(`  Java classes:    ${javaFiles.length}`);
console.log(`  XML configs:     ${providers.length}`);
console.log(`  String entries:  ${newStringLines.length}`);
console.log(`  Manifest blocks: ${receiverBlocks.length}`);
