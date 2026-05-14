#!/usr/bin/env node
// scripts/generate-android-widget-providers.mjs
// Reads widget definitions from widget-registry.json and generates Android
// receivers for:
//   - the legacy generic providers (RoohSmall/Medium/Large),
//   - one home-screen provider per (id, size) gallery variant,
//   - dedicated keyguard providers that mirror the iOS lock-screen widgets.
//
// Outputs: Java class + widgetprovider XML + strings.xml description +
// AndroidManifest <receiver> entry.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REG_PATH = resolve(ROOT, 'widgets/ios/Resources/widget-registry.json');
const ANDROID_RES = resolve(ROOT, 'android/app/src/main/res');
const ANDROID_JAVA = resolve(ROOT, 'android/app/src/main/java/com/rooh/almuslim/widget');
const MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml');
const STRINGS = resolve(ANDROID_RES, 'values/strings.xml');
const PREVIEW_SNAPSHOT_DIR = resolve(ROOT, 'tmp/widget-previews');
const ANDROID_PREVIEW_RES = resolve(ANDROID_RES, 'drawable-nodpi');
const ANDROID_DRAWABLE_RES = resolve(ANDROID_RES, 'drawable');

const previewSourceByDrawable = new Map();
const lockedPreviewDrawables = new Map();

function rememberPreview(id, size) {
  const drawable = previewDrawableName(id, size);
  previewSourceByDrawable.set(drawable, `${id}_${size}_light.png`);
  return drawable;
}

function lockedPreviewDrawableName(baseDrawable) {
  return `${baseDrawable}_locked`;
}

function rememberLockedPreview(id, size) {
  const baseDrawable = rememberPreview(id, size);
  const lockedDrawable = lockedPreviewDrawableName(baseDrawable);
  lockedPreviewDrawables.set(lockedDrawable, baseDrawable);
  return lockedDrawable;
}

const SIZE_DIMS = {
  small: { width: 110, height: 110 },
  medium: { width: 250, height: 110 },
  large: { width: 250, height: 250 },
};

const BASE_PROVIDERS = [
  {
    className: 'RoohSmall',
    xmlRes: 'widgetprovider_roohsmall',
    stringKey: 'widget_roohsmall_description',
    label: 'Small Widget',
    description: 'اختر نوع الويدجت بعد الإضافة',
    ...SIZE_DIMS.small,
    preview: rememberPreview('daySimple', 'small'),
    category: 'home_screen',
  },
  {
    className: 'RoohMedium',
    xmlRes: 'widgetprovider_roohmedium',
    stringKey: 'widget_roohmedium_description',
    label: 'Medium Widget',
    description: 'اختر نوع الويدجت بعد الإضافة',
    ...SIZE_DIMS.medium,
    preview: rememberPreview('daySimple', 'medium'),
    category: 'home_screen',
  },
  {
    className: 'RoohLarge',
    xmlRes: 'widgetprovider_roohlarge',
    stringKey: 'widget_roohlarge_description',
    label: 'Large Widget',
    description: 'اختر نوع الويدجت بعد الإضافة',
    ...SIZE_DIMS.large,
    preview: rememberPreview('prayerTable', 'large'),
    category: 'home_screen',
  },
];

const LOCK_PROVIDERS = [
  {
    className: 'RoohLockDayThuluth',
    xmlRes: 'widgetprovider_roohlockdaythuluth',
    stringKey: 'widget_roohlockdaythuluth_description',
    label: 'اليوم - ثلث',
    description: 'اليوم - ثلث',
    ...SIZE_DIMS.small,
    preview: rememberPreview('dayThuluth', 'small'),
    category: 'keyguard',
  },
  {
    className: 'RoohLockMonthThuluth',
    xmlRes: 'widgetprovider_roohlockmonththuluth',
    stringKey: 'widget_roohlockmonththuluth_description',
    label: 'التاريخ الهجري',
    description: 'التاريخ الهجري',
    ...SIZE_DIMS.medium,
    preview: rememberPreview('monthThuluth', 'medium'),
    category: 'keyguard',
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
  };
});

const providers = [
  ...BASE_PROVIDERS,
  ...homeProviders,
  ...LOCK_PROVIDERS,
];

// Keep the Android launcher widget picker visually aligned with the in-app
// gallery. These PNGs are produced by the React snapshot pump and committed as
// drawable-nodpi resources so Android can show real thumbnails before add-time.
mkdirSync(ANDROID_PREVIEW_RES, { recursive: true });
mkdirSync(ANDROID_DRAWABLE_RES, { recursive: true });
let copiedPreviewCount = 0;
for (const [drawable, filename] of previewSourceByDrawable.entries()) {
  const source = resolve(PREVIEW_SNAPSHOT_DIR, filename);
  const dest = resolve(ANDROID_PREVIEW_RES, `${drawable}.png`);
  if (existsSync(source)) {
    copyFileSync(source, dest);
    copiedPreviewCount += 1;
  } else if (!existsSync(dest)) {
    console.warn(`! Missing Android widget preview source: ${source}`);
  }
}

for (const [lockedDrawable, baseDrawable] of lockedPreviewDrawables.entries()) {
  const dest = resolve(ANDROID_DRAWABLE_RES, `${lockedDrawable}.xml`);
  const content = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@drawable/${baseDrawable}" />
    <item
        android:width="22dp"
        android:height="22dp"
        android:gravity="top|end"
        android:top="8dp"
        android:right="8dp"
        android:drawable="@drawable/ic_widget_premium_lock_badge" />
</layer-list>
`;
  writeFileSync(dest, content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Java classes
// ─────────────────────────────────────────────────────────────────────────────
const javaFiles = [];
for (const provider of providers) {
  const className = provider.className;
  const javaPath = resolve(ANDROID_JAVA, `${className}.java`);
  const content = `package com.rooh.almuslim.widget;

import com.reactnativeandroidwidget.RNWidgetProvider;

public class ${className} extends RNWidgetProvider {
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
    android:resizeMode="none"
    android:description="@string/${provider.stringKey}"
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
  writeFileSync(STRINGS, stringsXml);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update AndroidManifest.xml — insert missing <receiver> entries before
// </application>. Existing blocks are preserved so user/native edits are not
// churned unnecessarily.
// ─────────────────────────────────────────────────────────────────────────────
let manifestXml = readFileSync(MANIFEST, 'utf-8');
const receiverBlocks = [];
for (const provider of providers) {
  const className = provider.className;
  if (manifestXml.includes(`android:name=".widget.${className}"`)) continue; // already there
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
  writeFileSync(MANIFEST, manifestXml);
}

console.log(`✓ Generated ${homeProviders.length} Android home-screen variant providers`);
console.log(`✓ Generated ${LOCK_PROVIDERS.length} Android keyguard providers`);
console.log(`  Java classes:    ${javaFiles.length}`);
console.log(`  XML configs:     ${providers.length}`);
console.log(`  String entries:  ${newStringLines.length}`);
console.log(`  Manifest blocks: ${receiverBlocks.length}`);
