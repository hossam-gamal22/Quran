// lib/widget-android-asset-resolver.ts
//
// Android prayer-state template resolver. The foreground app captures the
// gallery chrome once per active theme/language and the headless widget task
// selects the matching state PNG while drawing changing values live.
//
// Asset on-device layout:
//   ${FileSystem.documentDirectory}prayer-static/<assetName>.png

import * as FileSystem from 'expo-file-system/legacy';

export type PrayerSize = 'small' | 'medium' | 'large';
export type PrayerTheme = 'light' | 'dark' | 'olive' | 'green' | 'blue' | 'desert' | 'slate';
export type PrayerLang = 'ar' | 'en';
export type PrayerStateKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_STATIC_DIR = `${FileSystem.documentDirectory}prayer-static/`;

/** Sequential previous-prayer for the next-prev widget. Mirrors the Swift
 *  `PrayerAssetResolver.defaultPrevious`. */
export function defaultPreviousFor(active: PrayerStateKey): PrayerStateKey {
  switch (active) {
    case 'fajr':    return 'isha';
    case 'sunrise': return 'fajr';
    case 'dhuhr':   return 'sunrise';
    case 'asr':     return 'dhuhr';
    case 'maghrib': return 'asr';
    case 'isha':    return 'maghrib';
  }
}

export interface ResolveAssetOptions {
  widgetId: 'prayerSingle' | 'prayerTable' | 'prayerNextPrevious';
  size: PrayerSize;
  theme: PrayerTheme;
  language: PrayerLang;
  active: PrayerStateKey;
  previous?: PrayerStateKey;
}

/** Construct the asset filename. Exactly matches the iOS asset name produced
 *  by `widgets/ios/PrayerStaticOverlay.swift → PrayerAssetResolver.assetName`,
 *  so a single bake produces files usable on both platforms. */
export function prayerStaticAssetName(opts: ResolveAssetOptions): string {
  const { widgetId, size, theme, language, active } = opts;
  if (widgetId === 'prayerNextPrevious') {
    const prev = opts.previous ?? defaultPreviousFor(active);
    return `${widgetId}_${size}_${theme}_${language}_${prev}_${active}`;
  }
  return `${widgetId}_${size}_${theme}_${language}_${active}`;
}

/** Full on-device path for the static PNG, regardless of whether it has been
 *  generated on the device yet. Callers should probe existence with
 *  `prayerStaticAssetExistsOnDevice` before reading. */
export function prayerStaticAssetPath(opts: ResolveAssetOptions): string {
  return `${PRAYER_STATIC_DIR}${prayerStaticAssetName(opts)}.png`;
}

/** Check whether the foreground gallery capture generated this state PNG. */
export async function prayerStaticAssetExistsOnDevice(opts: ResolveAssetOptions): Promise<boolean> {
  try {
    const path = prayerStaticAssetPath(opts);
    const info = await FileSystem.getInfoAsync(path);
    return !!info.exists;
  } catch {
    return false;
  }
}
