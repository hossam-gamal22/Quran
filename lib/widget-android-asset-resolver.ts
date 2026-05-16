// lib/widget-android-asset-resolver.ts
//
// PHASE 2 SKELETON — not yet wired into the rendering path. Mirrors
// `PrayerAssetResolver` in widgets/ios/PrayerStaticOverlay.swift so the
// Android headless task can later swap to the same per-state static-PNG
// architecture iOS uses.
//
// Status:
//   • Returns the expected FileSystem path for a (kind, size, theme, lang,
//     state) tuple — exactly matching the iOS Asset Catalog naming.
//   • Provides a `prayerStaticAssetExistsOnDevice()` probe so the future
//     migration can detect whether the bake has been copied onto the device.
//   • Does NOT yet change Android widget rendering. The existing snapshot
//     pipeline keeps running unchanged. When the assets land on-device and
//     are wired into the task handler, this resolver is the lookup point.
//
// Asset on-device layout (deferred):
//   ${FileSystem.documentDirectory}prayer-static/<assetName>.png
//
// The migration plan is: copy the iOS-baked PNGs into a bundled Android raw
// resource folder via a small expo plugin OR ship them via a one-time
// download to the device, then point the headless task at this resolver.

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
 *  copied onto the device yet. Callers should probe existence with
 *  `prayerStaticAssetExistsOnDevice` before reading. */
export function prayerStaticAssetPath(opts: ResolveAssetOptions): string {
  return `${PRAYER_STATIC_DIR}${prayerStaticAssetName(opts)}.png`;
}

/** Check whether the static PNG for a state is present on the device.
 *  Currently always false (no migration step ships them yet) — but written so
 *  the future Android headless task can call `await ...` and conditionally
 *  switch rendering. */
export async function prayerStaticAssetExistsOnDevice(opts: ResolveAssetOptions): Promise<boolean> {
  try {
    const path = prayerStaticAssetPath(opts);
    const info = await FileSystem.getInfoAsync(path);
    return !!info.exists;
  } catch {
    return false;
  }
}
