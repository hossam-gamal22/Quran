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
// 'jumuah' is a Friday-only variant of the Dhuhr state: same timing/slot as
// dhuhr but the name is baked as "صلاة الجمعة" / "Jumuah". The headless selector
// maps dhuhr→jumuah on Fridays so the right baked name shows even closed-app.
export type PrayerStateKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';

export const PRAYER_STATIC_DIR = `${FileSystem.documentDirectory}prayer-static/`;

/** Sequential previous-prayer for the next-prev widget. Mirrors the Swift
 *  `PrayerAssetResolver.defaultPrevious`. */
export function defaultPreviousFor(active: PrayerStateKey): PrayerStateKey {
  switch (active) {
    case 'fajr':    return 'isha';
    case 'sunrise': return 'fajr';
    case 'dhuhr':   return 'sunrise';
    case 'jumuah':  return 'sunrise'; // Friday Dhuhr — same predecessor as dhuhr
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
  /** Friday flag. When true, the `prayerTable` widget selects the Jumuah-labeled
   *  per-state variant (`${active}_jumuah`) so its Dhuhr ROW reads «صلاة الجمعة»
   *  for the whole of Friday — not only while Dhuhr is the active/next prayer.
   *  `prayerSingle` (hero-only) and `prayerNextPrevious` (slots already carry
   *  `jumuah` via active/previous) ignore this flag. */
  friday?: boolean;
}

/** Construct the asset filename. The Android headless task and the foreground
 *  bake (lib/widgets/snapshot.tsx → jumuahBakeSpecs) must agree on this scheme. */
export function prayerStaticAssetName(opts: ResolveAssetOptions): string {
  const { widgetId, size, theme, language, active } = opts;
  if (widgetId === 'prayerNextPrevious') {
    const prev = opts.previous ?? defaultPreviousFor(active);
    return `${widgetId}_${size}_${theme}_${language}_${prev}_${active}`;
  }
  // Friday table: every active state maps to its Jumuah-labeled variant so the
  // Dhuhr row shows «صلاة الجمعة» all day. `dhuhr` already arrives as `active:
  // 'jumuah'` (token `jumuah`), so only the other states gain the suffix.
  if (widgetId === 'prayerTable' && opts.friday && active !== 'jumuah') {
    return `${widgetId}_${size}_${theme}_${language}_${active}_jumuah`;
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
