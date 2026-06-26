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

/** Generation stamp for the per-state template PNGs. The full bake records it
 *  per (theme, language) matrix in `prayer-static/manifest.json`;
 *  `prayerStaticAssetExistsOnDevice` rejects templates whose matrix wasn't
 *  baked under the CURRENT version, so a layout change in the preview
 *  components can never serve an old-geometry PNG under new overlay anchors
 *  (documentDirectory survives APK updates, so without this gate stale
 *  templates were served forever — the "home table ≠ gallery" bug).
 *  KEEP IN SYNC with SCHEMA_VERSION in lib/widgets/pump.ts (that module can't
 *  be imported from here without a require cycle). */
export const PRAYER_TEMPLATE_BAKE_VERSION = 16;

const PRAYER_TEMPLATE_MANIFEST_PATH = `${PRAYER_STATIC_DIR}manifest.json`;

interface PrayerTemplateManifest {
  version?: number;
  bakedAt?: string;
  /** `${theme}_${language}` → bake version that last FULLY generated that
   *  matrix. Per-matrix (not a single global stamp) because the pump bakes
   *  only the ACTIVE theme: an `auto` user flipping system dark mode at night
   *  must not get another theme's stale matrix blessed by a global stamp. */
  matrices?: Record<string, number>;
}

// One manifest read per process (headless runs are short-lived; the foreground
// bake invalidates after rewriting it).
let templateManifestCache: { value: PrayerTemplateManifest | null } | null = null;

export function invalidatePrayerTemplateVersionCache(): void {
  templateManifestCache = null;
}

async function readPrayerTemplateManifest(): Promise<PrayerTemplateManifest | null> {
  if (templateManifestCache) return templateManifestCache.value;
  let value: PrayerTemplateManifest | null = null;
  try {
    const raw = await FileSystem.readAsStringAsync(PRAYER_TEMPLATE_MANIFEST_PATH);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') value = parsed as PrayerTemplateManifest;
  } catch {
    // Missing/corrupt manifest → treat all templates as stale. Pre-versioning
    // bakes never wrote this file, which correctly fails the matrix check.
    value = null;
  }
  templateManifestCache = { value };
  return value;
}

/** True when the (theme, language) template matrix was fully baked under the
 *  current PRAYER_TEMPLATE_BAKE_VERSION. */
export async function prayerTemplateMatrixIsCurrent(theme: PrayerTheme, language: PrayerLang): Promise<boolean> {
  const manifest = await readPrayerTemplateManifest();
  return manifest?.matrices?.[`${theme}_${language}`] === PRAYER_TEMPLATE_BAKE_VERSION;
}

/** Record that the (theme, language) matrix was fully baked under the current
 *  version. Called by the foreground bake (snapshot.tsx) ONLY after a full,
 *  error-free, non-targeted run — a partial/targeted bake must never bless a
 *  matrix that still contains old-generation PNGs. */
export async function stampPrayerTemplateMatrix(theme: PrayerTheme, language: PrayerLang): Promise<void> {
  const existing = (await readPrayerTemplateManifest()) ?? {};
  const manifest: PrayerTemplateManifest = {
    ...existing,
    version: PRAYER_TEMPLATE_BAKE_VERSION,
    bakedAt: new Date().toISOString(),
    matrices: { ...existing.matrices, [`${theme}_${language}`]: PRAYER_TEMPLATE_BAKE_VERSION },
  };
  try {
    await FileSystem.writeAsStringAsync(PRAYER_TEMPLATE_MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  } finally {
    invalidatePrayerTemplateVersionCache();
  }
}

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

/** Check whether the foreground gallery capture generated this state PNG AND
 *  its (theme, language) matrix belongs to the current bake generation. A
 *  stale-generation template is treated as absent so the caller falls back to
 *  the gallery PNG (whose anchors are generation-matched via the pump's
 *  SCHEMA_VERSION) until the next foreground bake refreshes the templates. */
export async function prayerStaticAssetExistsOnDevice(opts: ResolveAssetOptions): Promise<boolean> {
  try {
    if (!(await prayerTemplateMatrixIsCurrent(opts.theme, opts.language))) return false;
    const path = prayerStaticAssetPath(opts);
    const info = await FileSystem.getInfoAsync(path);
    return !!info.exists;
  } catch {
    return false;
  }
}
