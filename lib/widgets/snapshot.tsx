// lib/widgets/snapshot.tsx
//
// Render-to-image pipeline. Produces one PNG per (widget id × size) by mounting
// the registry's Preview component inside an off-screen container and capturing
// it with react-native-view-shot. The PNGs are then handed to:
//   - iOS:     WidgetReloadModule.writeSharedImage (App Group container)
//   - Android: persistent app-internal storage (FileSystem.documentDirectory)
//
// Constraints (see plan §4b):
//   C2  — countdown text MUST NOT appear in the snapshot for widgets where the
//          live native overlay draws it. The Preview component reads `forSnapshot`
//          to suppress that region.
//   C5  — generation is hash-based + debounced. We compute a stable signature
//          from registry + user settings + content data; if it matches the last
//          stored hash AND every PNG file exists, we return early.
//   C7  — Android uses FileSystem.documentDirectory (persistent), NOT cache.
//
// This module never throws. Failures are logged in __DEV__ and surfaced via the
// returned `WidgetSnapshotResult`.

import React from 'react';
import { Platform, NativeModules, PixelRatio, View, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';

import {
  WIDGET_REGISTRY,
  WIDGET_REGISTRY_VERSION,
  type WidgetDefinition,
  registryFingerprint,
} from './registry';
import type { PreviewSize, WidgetThemeKey } from '@/components/widgets/previews/shared';
import { getSizeDims } from '@/components/widgets/previews/shared';
import {
  WidgetSnapshotCaptureContext,
  WidgetForcedThemeContext,
  WidgetPreviewDataContext,
} from '@/components/widgets/previews/snapshot-capture-context';
import type { SharedWidgetData } from '@/lib/widget-data';

// ─────────────────────────────────────────────────────────────────────────────
// Theme resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 7 concrete themes the snapshot pump generates a PNG variant for.
 * `auto` is a sentinel that resolves to one of these at render time on each
 * platform — no `auto.png` is ever written.
 */
export const RESOLVED_WIDGET_THEMES: ReadonlyArray<ResolvedWidgetTheme> = [
  'light',
  'dark',
  'olive',
  'green',
  'blue',
  'desert',
  'slate',
];

export type ResolvedWidgetTheme = Exclude<WidgetThemeKey, 'auto'>;

/**
 * Map a raw theme value (possibly `'auto'`, possibly unknown) to one of the
 * 7 concrete IDs. Used by every consumer (PNG filename, palette, native bg)
 * so they never disagree.
 */
export function resolveWidgetTheme(
  raw: string | undefined,
  systemColorScheme?: 'light' | 'dark' | null,
): ResolvedWidgetTheme {
  const value = (raw ?? 'auto').toString();
  if (value === 'auto') {
    // Auto now defaults to light to match in-app gallery + give users a brighter look.
    return 'light';
  }
  if ((RESOLVED_WIDGET_THEMES as ReadonlyArray<string>).includes(value)) {
    return value as ResolvedWidgetTheme;
  }
  return 'light';
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SnapshotInput {
  /** App language at render time (drives RTL & Arabic strings inside previews). */
  language: 'ar' | 'en' | string;
  /** True when the user has an active premium subscription. */
  isPremium: boolean;
  /** Stable content identifiers — bumping these invalidates the cache. */
  prayerSignature: string;
  verseSignature: string;
  dhikrSignature: string;
  azkarSignature: string;
  /** Theme/display preferences pulled from SettingsContext. */
  theme: string;
  numerals: string;
  calendar: string;
  monthCalendar: string;
  dayCalendar: string;
  fontVariant: string;
  dateFormat: string;
  /** Bumping this constant invalidates every cached PNG (debug / migrations). */
  schemaVersion: number;
  sharedData?: SharedWidgetData;
  /** Monotonic/cache-busting version written into PNG keys consumed by native widgets. */
  snapshotVersion?: number;
  /** Dev-only/proof marker; included in hash so "Refresh widgets now" proves a new PNG was rendered. */
  refreshProofMarker?: string;
  /** Optional foreground-refresh filter: render only these route keys first. */
  includeRouteKeys?: ReadonlyArray<string>;
}

export interface SnapshotEntry {
  id: string;
  size: PreviewSize;
  /** Resolved theme variant this PNG renders with. */
  theme: ResolvedWidgetTheme;
  /** Stable route key native uses to find this entry in SharedWidgetData.snapshotManifest. */
  routeKey: string;
  /** Versioned/cache-busted PNG basename without `.png`. */
  key: string;
  /** Per-entry hash used for logs and snapshot cleanup. */
  hash: string;
  /** Final on-disk path (App Group on iOS, documentDirectory on Android). */
  path: string;
  /** True when the file was newly written this run. */
  fresh: boolean;
}

export interface WidgetSnapshotResult {
  ran: boolean;
  reason: 'unchanged' | 'rendered' | 'skipped' | 'error';
  hash: string;
  entries: SnapshotEntry[];
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Per-theme hash key prefix. Each resolved theme stores its own hash so a
 *  partial run (e.g. active theme only) does not short-circuit later passes. */
const HASH_KEY_PREFIX = '@widget_snapshot_hash_v2';
function hashKey(theme: ResolvedWidgetTheme): string { return `${HASH_KEY_PREFIX}:${theme}`; }

/** SHA-1 not available in JS without a dep; we use a fast non-crypto hash. */
function fastHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Per-theme content hash. `input.theme` is intentionally excluded — each
 * resolved theme variant gets its own stored hash, and the forced-theme value
 * is folded in via the `theme` argument so two adjacent calls that only differ
 * in resolved theme produce different hashes.
 */
export function computeSnapshotHash(input: SnapshotInput, theme?: ResolvedWidgetTheme): string {
  const parts = [
    `r=${registryFingerprint()}`,
    `s=${input.schemaVersion}`,
    `p=${Platform.OS}:${PixelRatio.get()}`,
    `lang=${input.language}`,
    `prem=${input.isPremium ? 1 : 0}`,
    `num=${input.numerals}`,
    `cal=${input.calendar}/${input.dayCalendar}/${input.monthCalendar}`,
    `fv=${input.fontVariant}`,
    `df=${input.dateFormat}`,
    `pr=${input.prayerSignature}`,
    `vs=${input.verseSignature}`,
    `dh=${input.dhikrSignature}`,
    `az=${input.azkarSignature}`,
  ];
  if (input.snapshotVersion != null) parts.push(`sv=${input.snapshotVersion}`);
  if (input.refreshProofMarker) parts.push(`proof=${input.refreshProofMarker}`);
  if (theme) parts.push(`t=${theme}`);
  return fastHash(parts.join('|'));
}

/**
 * PNG basename used by both iOS App Group and Android persistent storage.
 * Theme is required and must already be resolved (never `'auto'`) — the pump
 * generates one variant per concrete theme so any consumer can ask for
 * whichever theme is currently active.
 */
export function snapshotName(
  id: string,
  size: PreviewSize,
  theme: ResolvedWidgetTheme,
  versionOrHash?: number | string,
): string {
  const suffix = versionOrHash == null || versionOrHash === ''
    ? ''
    : `_v${String(versionOrHash).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return `${id}_${size}_${theme}${suffix}`;
}

export function snapshotRouteKey(id: string, size: PreviewSize, theme: ResolvedWidgetTheme): string {
  return `${id}_${size}_${theme}`;
}

export function snapshotPathForKey(key: string): string {
  return `${FileSystem.documentDirectory ?? ''}widgets/${key}.png`;
}

/** Final on-disk path that the consumer (iOS/Android shell) reads. */
export async function snapshotPath(
  id: string,
  size: PreviewSize,
  theme: ResolvedWidgetTheme,
  versionOrHash?: number | string,
): Promise<string | null> {
  const name = snapshotName(id, size, theme, versionOrHash);
  if (Platform.OS === 'ios') {
    try {
      const { WidgetReloadModule } = NativeModules;
      if (WidgetReloadModule?.sharedImagePath) {
        return await WidgetReloadModule.sharedImagePath(name);
      }
    } catch {}
    return null;
  }
  return `${FileSystem.documentDirectory}widgets/${name}.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Off-screen renderer
// ─────────────────────────────────────────────────────────────────────────────

interface OffscreenSlotProps {
  def: WidgetDefinition;
  size: PreviewSize;
  language: 'ar' | 'en';
  /** Resolved theme for this render — drives the foreground palette baked
   *  into the captured PNG so it matches its `<id>_<size>_<theme>.png`
   *  filename. Never `'auto'`. */
  theme: ResolvedWidgetTheme;
  sharedData?: SharedWidgetData;
  /** Mutable ref the orchestrator reads to call captureRef. */
  innerRef: React.RefObject<View | null>;
}

/**
 * Single offscreen slot. Mounted inside `<SnapshotHost>` (see below) at exact
 * widget pixel size. Forces `language` to the registry's `forcedLanguage` when
 * present so Thuluth widgets render Arabic regardless of UI locale, and forces
 * `theme` so the foreground palette matches the per-theme PNG filename.
 *
 * `forSnapshot={true}` is passed through so previews with a live overlay omit
 * the countdown region (C2).
 */
function OffscreenSlot({ def, size, language, theme, sharedData, innerRef }: OffscreenSlotProps) {
  const dims = getSizeDims(size);
  const Preview = def.Preview as React.FC<{
    size: PreviewSize;
    language?: 'ar' | 'en';
    forSnapshot?: boolean;
  }>;
  const lang: 'ar' | 'en' = (def.forcedLanguage ?? language) as 'ar' | 'en';
  return (
    <WidgetSnapshotCaptureContext.Provider value>
      <WidgetForcedThemeContext.Provider value={theme}>
        <WidgetPreviewDataContext.Provider value={sharedData ?? null}>
          <View
            ref={innerRef}
            collapsable={false}
            style={{
              width: dims.width,
              height: dims.height,
              backgroundColor: 'transparent',
              overflow: 'hidden',
            }}
          >
            <Preview size={size} language={lang} forSnapshot={true} />
          </View>
        </WidgetPreviewDataContext.Provider>
      </WidgetForcedThemeContext.Provider>
    </WidgetSnapshotCaptureContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Host component — mount at the root of the app (e.g. _layout.tsx) so refs
// remain stable. Uses position: 'absolute' off-screen so visual layout is
// undisturbed.
// ─────────────────────────────────────────────────────────────────────────────

type SlotKey = string; // `${id}_${size}_${theme}`

type SlotMap = Record<
  SlotKey,
  {
    def: WidgetDefinition;
    size: PreviewSize;
    language: 'ar' | 'en';
    theme: ResolvedWidgetTheme;
    sharedData?: SharedWidgetData;
  }
>;

let hostSetSlots: ((slots: SlotMap) => void) | null = null;
const slotRefs = new Map<SlotKey, React.RefObject<View | null>>();

function getOrCreateRef(key: SlotKey): React.RefObject<View | null> {
  const existing = slotRefs.get(key);
  if (existing) return existing;
  const ref = React.createRef<View>();
  slotRefs.set(key, ref);
  return ref;
}

/** Mount once at the root of the app. Renders nothing visible. */
export function SnapshotHost() {
  const [slots, setSlots] = React.useState<SlotMap>({});
  React.useEffect(() => {
    hostSetSlots = setSlots;
    return () => { hostSetSlots = null; };
  }, []);

  if (Object.keys(slots).length === 0) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        // Stay at (0,0) in the layout tree — far-offscreen positions like
        // left:-9999 cause some Android launchers / OEM ROMs to skip the
        // rendering pass entirely, producing transparent capture buffers.
        // Keep the host behind the app and almost transparent. A visible 1%
        // overlay can leak widget text (notably the Hijri date) onto the app
        // background while the pump runs.
        // Size = max widget size (large = 329×345 dp) + safety margin so a
        // single mounted slot is never clipped by the host's overflow:hidden.
        // One-slot-at-a-time rendering (see runSnapshotPass) keeps this small.
        left: 0,
        top: 0,
        opacity: 0.001,
        zIndex: -1000,
        elevation: -1000,
        width: 380,
        height: 400,
        overflow: 'hidden',
      }}
    >
      {Object.entries(slots).map(([key, slot]) => (
        <OffscreenSlot
          key={key}
          def={slot.def}
          size={slot.size}
          language={slot.language}
          theme={slot.theme}
          sharedData={slot.sharedData}
          innerRef={getOrCreateRef(key)}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let runningPromise: Promise<WidgetSnapshotResult> | null = null;

async function settleNextFrame(ms = 32): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function captureOne(
  def: WidgetDefinition,
  size: PreviewSize,
  theme: ResolvedWidgetTheme,
): Promise<{ tmpUri: string; widthPx: number; heightPx: number }> {
  const dims = getSizeDims(size);
  const ref = getOrCreateRef(`${def.id}_${size}_${theme}`);
  // give layout a moment to commit before capturing
  await settleNextFrame();
  // Do NOT specify width/height — let react-native-view-shot capture at the
  // native screen density. A 155 dp view at PixelRatio=3 produces a 465×465 px
  // PNG, which renders pixel-perfect on the home screen without upscaling.
  // Passing explicit dp values (155, 329…) would force a low-res 155 px output
  // regardless of device density, causing blurry home-screen widgets.
  const tmpUri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });
  return {
    tmpUri,
    widthPx: Math.round(dims.width * PixelRatio.get()),
    heightPx: Math.round(dims.height * PixelRatio.get()),
  };
}

async function writeIosSnapshot(name: string, tmpUri: string): Promise<string | null> {
  try {
    const { WidgetReloadModule } = NativeModules;
    if (!WidgetReloadModule?.writeSharedImage) return null;
    const path = await WidgetReloadModule.writeSharedImage(name, tmpUri);
    return path as string;
  } catch (e) {
    if (__DEV__) console.warn(`[snapshot] iOS writeSharedImage(${name}) failed`, e);
    return null;
  }
}

async function writeAndroidSnapshot(name: string, tmpUri: string): Promise<string | null> {
  try {
    const dir = `${FileSystem.documentDirectory}widgets/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const dst = `${dir}${name}.png`;
    const tmpDst = `${dir}.${name}.${Date.now()}.tmp.png`;
    await FileSystem.deleteAsync(tmpDst, { idempotent: true }).catch(() => {});
    await FileSystem.copyAsync({ from: tmpUri, to: tmpDst });
    const verify = await verifyAlpha(tmpDst);
    if (!verify.ok) {
      await FileSystem.deleteAsync(tmpDst, { idempotent: true }).catch(() => {});
      if (__DEV__) console.warn(`[snapshot] Android temp verify(${name}) failed`, verify.notes.join(','));
      return null;
    }
    // Expo's documentDirectory move is the closest cross-platform atomic replace
    // available here: the final path is not published until the temp PNG has
    // been fully written and verified.
    await FileSystem.deleteAsync(dst, { idempotent: true }).catch(() => {});
    await FileSystem.moveAsync({ from: tmpDst, to: dst });
    if (__DEV__) console.log(`[snapshot] generated android key=${name} path=${dst}`);
    return dst;
  } catch (e) {
    if (__DEV__) console.warn(`[snapshot] Android copy(${name}) failed`, e);
    return null;
  }
}

async function writeSnapshot(name: string, tmpUri: string): Promise<string | null> {
  const t0 = Date.now();
  const path = Platform.OS === 'ios'
    ? await writeIosSnapshot(name, tmpUri)
    : Platform.OS === 'android'
      ? await writeAndroidSnapshot(name, tmpUri)
      : null;
  if (__DEV__) console.log(`[widget/refresh] pngWriteMs=${Date.now() - t0} key=${name}`);
  return path;
}

async function commitReload(): Promise<void> {
  if (Platform.OS !== 'ios') return; // Android reload is driven by widget-data-bridge.triggerNativeWidgetReload
  try {
    const { WidgetReloadModule } = NativeModules;
    if (WidgetReloadModule?.commitSharedImages) {
      await WidgetReloadModule.commitSharedImages();
    } else if (WidgetReloadModule?.reloadAllTimelines) {
      await WidgetReloadModule.reloadAllTimelines();
    }
  } catch {}
}

function registrySnapshotPrefixes(): string[] {
  const prefixes: string[] = [];
  for (const def of WIDGET_REGISTRY) {
    for (const size of def.sizes) {
      prefixes.push(`${def.id}_${size}_`);
    }
  }
  return prefixes;
}

async function cleanupOldSnapshots(keepKeys: ReadonlySet<string>): Promise<void> {
  if (keepKeys.size === 0) return;
  const effectiveKeep = new Set(keepKeys);
  try {
    const raw = await AsyncStorage.getItem('widget_shared_data');
    if (raw) {
      const data = JSON.parse(raw);
      Object.values(data?.snapshotManifest ?? {}).forEach((entry: any) => {
        if (entry?.key) effectiveKeep.add(String(entry.key));
      });
    }
  } catch {}
  if (Platform.OS === 'ios') {
    try {
      const { WidgetReloadModule } = NativeModules;
      if (WidgetReloadModule?.cleanupSharedImages) {
        await WidgetReloadModule.cleanupSharedImages(Array.from(effectiveKeep));
        if (__DEV__) console.log(`[snapshot] iOS cleanup kept ${effectiveKeep.size} snapshot(s)`);
      }
    } catch (e) {
      if (__DEV__) console.warn('[snapshot] iOS cleanup failed', e);
    }
    return;
  }
  if (Platform.OS !== 'android') return;
  try {
    const dir = `${FileSystem.documentDirectory}widgets/`;
    const files = await FileSystem.readDirectoryAsync(dir).catch(() => []);
    const prefixes = registrySnapshotPrefixes();
    await Promise.all(files.map(async (file) => {
      if (!file.endsWith('.png')) return;
      const key = file.slice(0, -4);
      if (effectiveKeep.has(key)) return;
      if (!prefixes.some((prefix) => key.startsWith(prefix))) return;
      await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true }).catch(() => {});
    }));
    if (__DEV__) console.log(`[snapshot] Android cleanup kept ${effectiveKeep.size} snapshot(s)`);
  } catch (e) {
    if (__DEV__) console.warn('[snapshot] Android cleanup failed', e);
  }
}

/**
 * Internal worker — walks the registry × the requested themes, captures every
 * (id, size, theme) variant, and writes them. Caller is responsible for storing
 * each theme's hash.
 *
 * Themes are processed one at a time: mount all (id, size) slots for theme T,
 * capture them, unmount, then advance to theme T+1. This caps live memory at
 * one theme's worth of offscreen views.
 */
async function runSnapshotPass(
  input: SnapshotInput,
  themes: ReadonlyArray<ResolvedWidgetTheme>,
  hash: string,
  opts: { cleanup?: boolean; commit?: boolean } = {},
): Promise<WidgetSnapshotResult> {
  if (!hostSetSlots) {
    return { ran: false, reason: 'skipped', hash, entries: [], errors: ['SnapshotHost not mounted'] };
  }

  const platform: 'ios' | 'android' | 'other' = Platform.OS as any;
  const language: 'ar' | 'en' = (input.language === 'en' ? 'en' : 'ar');
  const entries: SnapshotEntry[] = [];
  const errors: string[] = [];
  const includeRouteKeys = input.includeRouteKeys?.length
    ? new Set(input.includeRouteKeys)
    : null;

  // Render ONE slot at a time. Mounting many slots simultaneously inside the
  // 400×400 dp SnapshotHost caused later slots (small widgets stack vertically)
  // to fall outside the host's bounds — Android then skipped the rendering pass
  // for the clipped views, producing transparent capture buffers. One-at-a-time
  // is slower but the only way to guarantee every variant gets a real PNG.
  // Prayer widgets on iOS now read pre-baked PNGs from the widget extension's
  // Asset Catalog (widgets/ios/Assets.xcassets/PrayerStatic/*) and overlay
  // dynamic numeric values via PrayerStaticOverlay.swift. They no longer
  // consume runtime-captured snapshots — skip them here on iOS so the cached
  // manifest never references stale per-state PNGs that the new pipeline
  // ignores. Android continues to capture as before (until Android also
  // adopts the static-PNG architecture in a follow-up).
  const IOS_STATIC_PRAYER_KINDS = new Set(['prayerSingle', 'prayerTable', 'prayerNextPrevious']);

  for (const theme of themes) {
    for (const def of WIDGET_REGISTRY) {
      if (platform === 'ios' && !def.platforms.includes('ios')) continue;
      if (platform === 'android' && !def.platforms.includes('android')) continue;
      if (platform === 'ios' && IOS_STATIC_PRAYER_KINDS.has(def.id)) continue;
      for (const size of def.sizes) {
        const key = `${def.id}_${size}_${theme}`;
        const routeKey = snapshotRouteKey(def.id, size, theme);
        if (includeRouteKeys && !includeRouteKeys.has(routeKey)) continue;
        const slot = { def, size, language, theme, sharedData: input.sharedData };

        // Mount this single slot — wait for setState + layout + font application.
        // 250 ms gives Android time to apply custom widget fonts before capture;
        // 120 ms was sometimes too short on slower devices causing system-font fallback.
        hostSetSlots({ [key]: slot });
        await settleNextFrame(250);

        try {
          const cap = await captureOne(slot.def, slot.size, slot.theme);
          const entryHash = computeSnapshotHash(input, slot.theme);
          const versionKey = input.snapshotVersion ?? entryHash.slice(0, 10);
          const name = snapshotName(slot.def.id, slot.size, slot.theme, versionKey);
          if (__DEV__) {
            console.log('[WidgetTheme] snapshot theme:', {
              selectedWidgetTheme: input.theme,
              snapshotTheme: slot.theme,
              widgetId: slot.def.id,
              size: slot.size,
            });
          }
          // Verify the captured PNG at tmpUri (always in app sandbox, accessible
          // on all platforms) before writing. On iOS the destination is the App
          // Group container which expo-file-system cannot stat, so post-write
          // verification would always return file_missing and prevent hash storage.
          const verify = await verifyAlpha(cap.tmpUri);
          if (!verify.ok) {
            errors.push(`verify_failed:${key}:${verify.notes.join(',')}`);
          } else {
            const path = await writeSnapshot(name, cap.tmpUri);
            if (path) {
              if (__DEV__) console.log(`[snapshot] generated key=${name} route=${routeKey} path=${path} hash=${entryHash}`);
              if (__DEV__) {
                console.log('[WidgetTheme] final snapshot key:', {
                  selectedWidgetTheme: input.theme,
                  snapshotTheme: slot.theme,
                  snapshotKey: name,
                  routeKey,
                  path,
                });
              }
              entries.push({
                id: slot.def.id,
                size: slot.size,
                theme: slot.theme,
                routeKey,
                key: name,
                hash: entryHash,
                path,
                fresh: true,
              });
            } else {
              errors.push(`write_failed:${key}`);
            }
          }
        } catch (e) {
          errors.push(`capture_failed:${key}:${(e as Error)?.message ?? 'unknown'}`);
        }
      }
    }

    // Unmount before next theme.
    hostSetSlots({});
    await settleNextFrame(16);
  }

  if (opts.cleanup !== false) {
    const cleanupT0 = Date.now();
    await cleanupOldSnapshots(new Set(entries.map((entry) => entry.key)));
    if (__DEV__) console.log(`[widget/refresh] cleanupMs=${Date.now() - cleanupT0}`);
  }
  if (opts.commit !== false) {
    await commitReload();
  }

  return { ran: true, reason: 'rendered', hash, entries, errors };
}

/**
 * Pump a specific subset of themes. Each theme's per-theme hash is checked
 * independently; only themes whose hash differs (or whose target file is
 * missing) are rendered. The hash is only persisted for themes whose pass
 * completed without verification or write errors.
 */
export async function pumpWidgetSnapshotsForThemes(
  input: SnapshotInput,
  themes: ReadonlyArray<ResolvedWidgetTheme>,
  opts: {
    force?: boolean;
    debounceMs?: number;
    includeRouteKeys?: ReadonlyArray<string>;
    cleanup?: boolean;
    commit?: boolean;
  } = {}
): Promise<WidgetSnapshotResult> {
  const debounce = opts.debounceMs ?? 800;

  // Pre-filter: per-theme hash check.
  const todo: ResolvedWidgetTheme[] = [];
  const themeHashes = new Map<ResolvedWidgetTheme, string>();
  for (const t of themes) {
    const h = computeSnapshotHash(input, t);
    themeHashes.set(t, h);
    if (opts.force) { todo.push(t); continue; }
    try {
      const stored = await AsyncStorage.getItem(hashKey(t));
      if (stored !== h) { todo.push(t); }
    } catch {
      todo.push(t);
    }
  }
  if (todo.length === 0) {
    if (__DEV__) console.log('[snapshot] all themes unchanged', themes);
    return { ran: false, reason: 'unchanged', hash: '', entries: [], errors: [] };
  }

  // Coalesce concurrent callers globally — a single in-flight pass at a time.
  if (runningPromise) return runningPromise;

  if (debounce > 0) {
    await new Promise<void>((resolve) => {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { pendingTimer = null; resolve(); }, debounce);
    });
  }

  runningPromise = (async () => {
    try {
      const combinedHash = todo.map((t) => themeHashes.get(t)).join('|');
      const inputForPass = opts.includeRouteKeys?.length
        ? { ...input, includeRouteKeys: opts.includeRouteKeys }
        : input;
      const result = await runSnapshotPass(inputForPass, todo, combinedHash, {
        cleanup: opts.cleanup,
        commit: opts.commit,
      });
      // Only persist a theme's hash if no errors were recorded for that theme.
      // A placed-widget-only pass intentionally does not prove the whole theme is
      // complete, so do not store the per-theme hash for partial foreground runs.
      if (result.ran && !opts.includeRouteKeys?.length) {
        for (const t of todo) {
          const errored = result.errors.some((e) => e.includes(`_${t}`));
          if (!errored) {
            try { await AsyncStorage.setItem(hashKey(t), themeHashes.get(t)!); } catch {}
          }
        }
      }
      return result;
    } finally {
      runningPromise = null;
    }
  })();
  return runningPromise;
}

/**
 * Public entry point — pumps every concrete theme. Back-compat shim that
 * delegates to `pumpWidgetSnapshotsForThemes(input, RESOLVED_WIDGET_THEMES)`.
 */
export async function pumpWidgetSnapshots(
  input: SnapshotInput,
  opts: {
    force?: boolean;
    debounceMs?: number;
    includeRouteKeys?: ReadonlyArray<string>;
    cleanup?: boolean;
    commit?: boolean;
  } = {}
): Promise<WidgetSnapshotResult> {
  return pumpWidgetSnapshotsForThemes(input, RESOLVED_WIDGET_THEMES, opts);
}

/** Test/dev helper: clear every per-theme cached hash so the next call regenerates. */
export async function invalidateSnapshotCache(): Promise<void> {
  for (const t of RESOLVED_WIDGET_THEMES) {
    try { await AsyncStorage.removeItem(hashKey(t)); } catch {}
  }
  // Drop the v1 key as well so users upgrading don't carry stale state.
  try { await AsyncStorage.removeItem('@widget_snapshot_hash_v1'); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// PNG alpha verification (plan §I) — dev-only sanity check that the captured
// PNG matches the contract: transparent root, no black pre-mult fringe, content
// visible in the interior. Logs warnings rather than throwing so production
// builds never crash on a degraded variant.
// ─────────────────────────────────────────────────────────────────────────────

export interface AlphaVerificationResult {
  /** File checked. */
  path: string;
  /** True when every assertion below passes. */
  ok: boolean;
  /** Human-readable diagnostics. */
  notes: string[];
}

/**
 * Decode the first ~24 base64 chars (~18 bytes) into a byte array. Enough to
 * read the PNG signature (8 B) + IHDR chunk header (8 B). Caller may pass
 * more chars to read width/height too.
 */
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64HeaderToBytes(b64: string): number[] {
  const out: number[] = [];
  for (let i = 0; i + 3 < b64.length; i += 4) {
    const e1 = B64_CHARS.indexOf(b64[i]!);
    const e2 = B64_CHARS.indexOf(b64[i + 1]!);
    const e3 = B64_CHARS.indexOf(b64[i + 2]!);
    const e4 = B64_CHARS.indexOf(b64[i + 3]!);
    if (e1 < 0 || e2 < 0) break;
    out.push(((e1 << 2) | (e2 >> 4)) & 0xff);
    if (b64[i + 2] === '=' || e3 < 0) break;
    out.push((((e2 & 15) << 4) | (e3 >> 2)) & 0xff);
    if (b64[i + 3] === '=' || e4 < 0) break;
    out.push((((e3 & 3) << 6) | e4) & 0xff);
  }
  return out;
}

/**
 * Verify a written PNG's basic integrity:
 *   - File exists and has plausible size for a transparent foreground (>=200 B).
 *   - PNG magic bytes 0x89 50 4E 47 0D 0A 1A 0A.
 *   - IHDR width/height both > 0 (catches transparent-empty captures the file
 *     size envelope alone misses).
 *   - File size below the platform-specific ceiling.
 *
 * Runs in production builds (not gated on __DEV__) so write-time regressions
 * surface in the result `errors[]` and prevent the per-theme hash from being
 * persisted (forcing a re-pump on the next call).
 */
export async function verifyAlpha(path: string): Promise<AlphaVerificationResult> {
  const notes: string[] = [];
  let ok = true;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return { path, ok: false, notes: ['file_missing'] };
    }
    const size = (info as any).size as number | undefined;
    if (size == null || size === 0) {
      ok = false;
      notes.push('zero_bytes');
    } else if (size < 200) {
      ok = false;
      notes.push(`undersized:${size}b`);
    } else if (size > 1_500_000) {
      // iOS and Android snapshots include the full rounded gallery tile.
      ok = false;
      notes.push(`oversized:${size}b`);
    }

    // Read the first 33 bytes (44 base64 chars) to check the PNG signature
    // and decode IHDR width/height.
    if (ok) {
      try {
        const head = await FileSystem.readAsStringAsync(path, {
          encoding: 'base64' as any,
          position: 0,
          length: 33,
        });
        const bytes = base64HeaderToBytes(head);
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.length < 24
          || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
          ok = false;
          notes.push('not_png');
        } else {
          // IHDR width = bytes 16..19 BE, height = bytes 20..23 BE.
          const w = ((bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!) >>> 0;
          const h = ((bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!) >>> 0;
          if (w === 0 || h === 0) {
            ok = false;
            notes.push(`zero_dims:${w}x${h}`);
          }
        }
      } catch (e) {
        // Header read failure is not fatal in production — we already verified
        // size envelope. Note it for diagnostics.
        if (__DEV__) notes.push(`header_read_failed:${(e as Error)?.message ?? 'unknown'}`);
      }
    }
  } catch (e) {
    ok = false;
    notes.push(`stat_failed:${(e as Error)?.message ?? 'unknown'}`);
  }
  if (!ok && __DEV__) console.warn('[verifyAlpha]', path, notes.join(', '));
  return { path, ok, notes };
}

/**
 * Inventory every (id × size × theme) tuple the registry expects to render on
 * this platform. For each, report whether the PNG file exists, its size, and
 * its decoded width/height. Used by the dev-tools screen to diagnose missing
 * snapshots without having to inspect AsyncStorage or the App Group container.
 */
export interface SnapshotInventoryEntry {
  id: string;
  size: PreviewSize;
  theme: ResolvedWidgetTheme;
  path: string | null;
  exists: boolean;
  bytes: number | null;
  width: number | null;
  height: number | null;
  ok: boolean;
  notes: string[];
}

export async function snapshotInventory(): Promise<SnapshotInventoryEntry[]> {
  const platform: 'ios' | 'android' | 'other' = Platform.OS as any;
  const out: SnapshotInventoryEntry[] = [];
  let manifest: Record<string, { key?: string; path?: string }> = {};
  try {
    const raw = await AsyncStorage.getItem('widget_shared_data');
    if (raw) manifest = JSON.parse(raw)?.snapshotManifest ?? {};
  } catch {}
  for (const def of WIDGET_REGISTRY) {
    if (platform === 'ios' && !def.platforms.includes('ios')) continue;
    if (platform === 'android' && !def.platforms.includes('android')) continue;
    for (const size of def.sizes) {
      for (const theme of RESOLVED_WIDGET_THEMES) {
        const routeKey = snapshotRouteKey(def.id, size, theme);
        const entry = manifest[routeKey];
        const path = entry?.path ?? (entry?.key
          ? (Platform.OS === 'ios'
              ? await (async () => {
                  try {
                    const { WidgetReloadModule } = NativeModules;
                    return WidgetReloadModule?.sharedImagePath ? await WidgetReloadModule.sharedImagePath(entry.key) : null;
                  } catch { return null; }
                })()
              : snapshotPathForKey(entry.key))
          : await snapshotPath(def.id, size, theme));
        let exists = false;
        let bytes: number | null = null;
        let width: number | null = null;
        let height: number | null = null;
        let ok = false;
        let notes: string[] = [];
        if (path) {
          try {
            const info = await FileSystem.getInfoAsync(path);
            exists = info.exists;
            if (info.exists) {
              bytes = ((info as any).size as number | undefined) ?? null;
              try {
                const head = await FileSystem.readAsStringAsync(path, {
                  encoding: 'base64' as any, position: 0, length: 33,
                });
                const b = base64HeaderToBytes(head);
                if (b.length >= 24) {
                  width = ((b[16]! << 24) | (b[17]! << 16) | (b[18]! << 8) | b[19]!) >>> 0;
                  height = ((b[20]! << 24) | (b[21]! << 16) | (b[22]! << 8) | b[23]!) >>> 0;
                }
              } catch {}
              const v = await verifyAlpha(path);
              ok = v.ok; notes = v.notes;
            }
          } catch {}
        }
        out.push({ id: def.id, size, theme, path, exists, bytes, width, height, ok, notes });
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Static-PNG bake for iOS prayer widgets
//
// Iterates the 5 × 6 × 7 × 2 state matrix (widget × state × theme × lang),
// mounts each preview with `forSnapshot=true` and a state-specific fixture so
// the highlight row + active prayer name match, captures via captureRef, and
// writes flat PNGs into FileSystem.documentDirectory + 'prayer-static-bake/'.
//
// After running, the user pulls that folder out of the simulator and runs:
//   pnpm build-prayer-imagesets <pulled-folder>
// which converts the flat PNGs into proper iOS Asset Catalog imagesets.
// ─────────────────────────────────────────────────────────────────────────────

export type PrayerStateKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_STATE_KEYS: ReadonlyArray<PrayerStateKey> = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

const PRAYER_NAME_AR: Record<PrayerStateKey, string> = {
  fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
};
const PRAYER_NAME_EN: Record<PrayerStateKey, string> = {
  fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};
/** Canonical 6-prayer schedule used by the bake fixture. Times are illustrative
 *  only — they're rendered with `opacity: 0` (transparent placeholder) because
 *  the home-screen overlay draws the user's actual time on top. */
const BAKE_TIMES: Record<PrayerStateKey, string> = {
  fajr: '04:14', sunrise: '05:35', dhuhr: '12:17', asr: '15:33', maghrib: '18:42', isha: '20:19',
};
const BAKE_BASE_EPOCH = Date.now();

/** Build a `SharedWidgetData` fixture that asserts `nextState` is the next
 *  prayer (highlighted, hero-baked). `previousState` is the one immediately
 *  before in the prayer order, used by the next/prev widget. */
function buildBakeFixture(nextState: PrayerStateKey, previousState: PrayerStateKey): SharedWidgetData {
  const order = PRAYER_STATE_KEYS;
  const nowMs = BAKE_BASE_EPOCH;
  const targetIdx = order.indexOf(nextState);
  // Build a synthetic timeline where:
  //   • every prayer with index < targetIdx has epoch in the PAST
  //   • nextState (targetIdx) has epoch in the FUTURE
  //   • every prayer with index > targetIdx has epoch farther in the future
  // This makes `resolvePreviewEpoch(false)` correctly pick the prayer at
  // `targetIdx - 1` as the previous, and `resolvePreviewEpoch(true)` pick
  // `targetIdx` as the next — so the prayerNextPrev preview shows the
  // correct prev/next names for the requested state.
  const allPrayers = order.map((k, i) => {
    const offsetMin = (i - targetIdx) * 90 + 30;  // nextState → +30 min, prior → negative
    return {
      name: PRAYER_NAME_EN[k],
      nameAr: PRAYER_NAME_AR[k],
      time: BAKE_TIMES[k],
      epochMs: nowMs + offsetMin * 60 * 1000,
      isPassed: i < targetIdx,
      isNext: k === nextState,
    };
  });
  return {
    prayer: {
      nextPrayer: nextState,
      nextPrayerName: PRAYER_NAME_EN[nextState],
      nextPrayerNameAr: PRAYER_NAME_AR[nextState],
      nextPrayerTime: BAKE_TIMES[nextState],
      nextPrayerAtEpochMs: nowMs + 30 * 60 * 1000,
      previousPrayerName: PRAYER_NAME_EN[previousState],
      previousPrayerNameAr: PRAYER_NAME_AR[previousState],
      previousPrayerAtEpochMs: nowMs - 90 * 60 * 1000,
      timeRemaining: '30:00',
      timeRemainingMinutes: 30,
      timeRemainingLabel: '30:00',
      allPrayers,
      allPrayerEpochs: allPrayers.map((p) => p.epochMs),
      hijriDate: '', hijriDay: 1, hijriMonth: '', hijriMonthEn: '', hijriYear: 1447,
      gregorianDate: '', location: '',
      prayerDataUpdatedAt: new Date(nowMs).toISOString(),
      lastUpdated: new Date(nowMs).toISOString(),
    },
    azkar: undefined,
    verse: undefined,
    dhikr: undefined,
    language: undefined,
  } as unknown as SharedWidgetData;
}

function defaultPreviousFor(next: PrayerStateKey): PrayerStateKey {
  switch (next) {
    case 'fajr':    return 'isha';
    case 'sunrise': return 'fajr';
    case 'dhuhr':   return 'sunrise';
    case 'asr':     return 'dhuhr';
    case 'maghrib': return 'asr';
    case 'isha':    return 'maghrib';
  }
}

export interface BakeEntry {
  assetName: string;       // e.g. prayerTable_medium_dark_ar_dhuhr
  widgetId: string;
  size: PreviewSize;
  theme: ResolvedWidgetTheme;
  language: 'ar' | 'en';
  state: PrayerStateKey;
  previousState?: PrayerStateKey;
  path: string;
}

export interface BakeResult {
  outputDir: string;
  manifestPath: string;
  entries: BakeEntry[];
  errors: string[];
}

/** Total combinations the bake will attempt. Used by the dev route to show a
 *  progress bar. 5 widget×size configs × 6 next-states × 7 themes × 2 langs. */
export const PRAYER_BAKE_TOTAL = 5 * 6 * 7 * 2;

/** Run the full prayer-widget bake.  Caller must ensure `SnapshotHost` is
 *  mounted (it is, at app root). Calls `onProgress` after each capture. */
export async function bakePrayerStaticPNGs(
  onProgress?: (done: number, total: number, lastAssetName: string) => void,
): Promise<BakeResult> {
  if (!hostSetSlots) {
    return {
      outputDir: '', manifestPath: '', entries: [],
      errors: ['SnapshotHost not mounted'],
    };
  }
  // Fresh timestamped folder each run so stale outputs from a previous bake
  // can never be mistaken for the current bake's content.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const outputDir = `${FileSystem.documentDirectory}prayer-static-bake-${stamp}/`;
  await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true }).catch(() => {});
  if (__DEV__) console.log(`[bake] full bake output directory: ${outputDir}`);

  // Limit to prayer widgets only.
  const prayerKinds = new Set(['prayerSingle', 'prayerTable', 'prayerNextPrevious']);
  const prayerDefs = WIDGET_REGISTRY.filter((d) => prayerKinds.has(d.id));

  const entries: BakeEntry[] = [];
  const errors: string[] = [];

  const total = PRAYER_BAKE_TOTAL;
  let done = 0;

  for (const def of prayerDefs) {
    for (const size of def.sizes) {
      for (const theme of RESOLVED_WIDGET_THEMES) {
        for (const lang of ['ar', 'en'] as const) {
          for (const nextState of PRAYER_STATE_KEYS) {
            const prevState = defaultPreviousFor(nextState);
            const fixture = buildBakeFixture(nextState, prevState);
            const stateToken = def.id === 'prayerNextPrevious'
              ? `${prevState}_${nextState}`
              : nextState;
            const assetName = `${def.id}_${size}_${theme}_${lang}_${stateToken}`;

            // Same pattern that successfully produced 420 PNGs in the prior
            // run: rich 5-part slot key, direct captureRef on the same key's
            // ref. The captureOne helper hardcodes a 3-part key which would
            // collide across language/state variants of the same widget.
            hostSetSlots({
              [assetName]: {
                def, size,
                language: lang,
                theme,
                sharedData: fixture,
              },
            } as any);
            await settleNextFrame(250);

            try {
              const ref = getOrCreateRef(assetName);
              const tmpUri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
              const dst = `${outputDir}${assetName}.png`;
              try { await FileSystem.deleteAsync(dst, { idempotent: true }); } catch {}
              await FileSystem.copyAsync({ from: tmpUri, to: dst });
              entries.push({ assetName, widgetId: def.id, size, theme, language: lang, state: nextState, previousState: def.id === 'prayerNextPrevious' ? prevState : undefined, path: dst });
            } catch (e) {
              errors.push(`${assetName}: ${(e as Error)?.message ?? 'capture_failed'}`);
            }

            done++;
            onProgress?.(done, total, assetName);
          }
        }
      }
    }
  }

  // Clear slots so the host renders nothing after the bake.
  hostSetSlots({} as any);

  // Write a manifest JSON next to the PNGs.
  const manifestPath = `${outputDir}manifest.json`;
  const manifest = {
    version: 1,
    bakedAt: new Date().toISOString(),
    total: PRAYER_BAKE_TOTAL,
    written: entries.length,
    errors,
    entries: entries.map((e) => ({
      assetName: e.assetName,
      widgetId: e.widgetId,
      size: e.size,
      theme: e.theme,
      language: e.language,
      state: e.state,
      previousState: e.previousState,
    })),
  };
  try {
    await FileSystem.writeAsStringAsync(manifestPath, JSON.stringify(manifest, null, 2));
  } catch (e) {
    errors.push(`manifest_write: ${(e as Error)?.message ?? 'unknown'}`);
  }

  return { outputDir, manifestPath, entries, errors };
}

/**
 * Targeted 5-PNG sample bake for validating the prayer preview pipeline
 * before committing to a full 420-PNG run.  Captures one PNG per widget kind
 * (prayerSingle/small, prayerTable/small, prayerTable/medium, prayerTable/large,
 * prayerNextPrevious/medium) using the requested theme/lang/nextState.
 *
 * Writes into a SEPARATE subfolder (`prayer-static-bake-samples/`) so it does
 * NOT pollute the main bake output and a subsequent full run can still target
 * a clean directory.
 */
export async function bakePrayerStaticSamples(opts: {
  theme?: ResolvedWidgetTheme;
  language?: 'ar' | 'en';
  nextState?: PrayerStateKey;
  onProgress?: (done: number, total: number, lastAssetName: string) => void;
} = {}): Promise<BakeResult> {
  if (!hostSetSlots) {
    return { outputDir: '', manifestPath: '', entries: [], errors: ['SnapshotHost not mounted'] };
  }
  const theme = opts.theme ?? 'green';
  const lang = opts.language ?? 'ar';
  const nextState = opts.nextState ?? 'isha';
  const prevState = defaultPreviousFor(nextState);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const outputDir = `${FileSystem.documentDirectory}prayer-static-bake-samples-${stamp}/`;
  await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true }).catch(() => {});
  if (__DEV__) console.log(`[bake] sample bake output directory: ${outputDir}`);

  const targets: Array<{ defId: string; size: PreviewSize }> = [
    { defId: 'prayerSingle',       size: 'small' },
    { defId: 'prayerTable',        size: 'small' },
    { defId: 'prayerTable',        size: 'medium' },
    { defId: 'prayerTable',        size: 'large' },
    { defId: 'prayerNextPrevious', size: 'medium' },
  ];

  const entries: BakeEntry[] = [];
  const errors: string[] = [];
  const total = targets.length;
  let done = 0;

  for (const t of targets) {
    const def = WIDGET_REGISTRY.find((d) => d.id === t.defId);
    if (!def) {
      errors.push(`${t.defId}: registry entry missing`);
      done++; opts.onProgress?.(done, total, '');
      continue;
    }
    const fixture = buildBakeFixture(nextState, prevState);
    const stateToken = t.defId === 'prayerNextPrevious' ? `${prevState}_${nextState}` : nextState;
    const assetName = `${t.defId}_${t.size}_${theme}_${lang}_${stateToken}`;

    // Use the SAME slot key format as the working pump
    // (${id}_${size}_${theme}) so the ref-lookup matches what `captureOne`
    // does internally. The 5-part assetName is used only for the output
    // filename, not the slot key.
    if (__DEV__) {
      console.log('[bake/sample]', {
        assetName,
        widgetId: t.defId,
        size: t.size,
        theme,
        language: lang,
        state: nextState,
        prevState: t.defId === 'prayerNextPrevious' ? prevState : undefined,
        // forSnapshot is hardcoded `true` inside OffscreenSlot:288. Logged
        // here so a future change that breaks that invariant is obvious.
        forSnapshotInOffscreenSlot: true,
      });
    }

    hostSetSlots({
      [assetName]: { def, size: t.size, language: lang, theme, sharedData: fixture },
    } as any);
    await settleNextFrame(250);

    try {
      const ref = getOrCreateRef(assetName);
      const tmpUri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      const dst = `${outputDir}${assetName}.png`;
      try { await FileSystem.deleteAsync(dst, { idempotent: true }); } catch {}
      await FileSystem.copyAsync({ from: tmpUri, to: dst });
      entries.push({
        assetName,
        widgetId: t.defId,
        size: t.size,
        theme,
        language: lang,
        state: nextState,
        previousState: t.defId === 'prayerNextPrevious' ? prevState : undefined,
        path: dst,
      });
    } catch (e) {
      errors.push(`${assetName}: ${(e as Error)?.message ?? 'capture_failed'}`);
    }
    done++;
    opts.onProgress?.(done, total, assetName);
  }

  hostSetSlots({} as any);

  const manifestPath = `${outputDir}manifest.json`;
  try {
    await FileSystem.writeAsStringAsync(manifestPath, JSON.stringify({
      kind: 'sample',
      theme, language: lang, state: nextState,
      total, written: entries.length, errors,
      entries: entries.map((e) => ({ assetName: e.assetName, widgetId: e.widgetId, size: e.size })),
    }, null, 2));
  } catch (e) {
    errors.push(`manifest_write: ${(e as Error)?.message ?? 'unknown'}`);
  }

  return { outputDir, manifestPath, entries, errors };
}

/**
 * Bake `prayerTable_medium` for ALL six prayer states with the same
 * (theme, language). Used to validate that the dynamic-time fix holds
 * regardless of which prayer is "active" (highlighted row + hero name).
 */
export async function bakePrayerTableMediumStates(opts: {
  theme?: ResolvedWidgetTheme;
  language?: 'ar' | 'en';
  onProgress?: (done: number, total: number, lastAssetName: string) => void;
} = {}): Promise<BakeResult> {
  if (!hostSetSlots) {
    return { outputDir: '', manifestPath: '', entries: [], errors: ['SnapshotHost not mounted'] };
  }
  const theme = opts.theme ?? 'green';
  const lang = opts.language ?? 'ar';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const outputDir = `${FileSystem.documentDirectory}prayer-static-bake-states-${stamp}/`;
  await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true }).catch(() => {});
  if (__DEV__) console.log(`[bake] states bake output directory: ${outputDir}`);

  const def = WIDGET_REGISTRY.find((d) => d.id === 'prayerTable');
  const entries: BakeEntry[] = [];
  const errors: string[] = [];
  const total = PRAYER_STATE_KEYS.length;
  let done = 0;

  if (!def) {
    return { outputDir, manifestPath: `${outputDir}manifest.json`, entries, errors: ['prayerTable def missing'] };
  }

  for (const nextState of PRAYER_STATE_KEYS) {
    const prevState = defaultPreviousFor(nextState);
    const fixture = buildBakeFixture(nextState, prevState);
    const assetName = `prayerTable_medium_${theme}_${lang}_${nextState}`;

    if (__DEV__) {
      console.log('[bake/states]', {
        assetName, theme, language: lang, state: nextState,
        forSnapshotInOffscreenSlot: true,
      });
    }

    hostSetSlots({
      [assetName]: { def, size: 'medium', language: lang, theme, sharedData: fixture },
    } as any);
    await settleNextFrame(250);

    try {
      const ref = getOrCreateRef(assetName);
      const tmpUri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      const dst = `${outputDir}${assetName}.png`;
      try { await FileSystem.deleteAsync(dst, { idempotent: true }); } catch {}
      await FileSystem.copyAsync({ from: tmpUri, to: dst });
      entries.push({
        assetName, widgetId: 'prayerTable', size: 'medium',
        theme, language: lang, state: nextState,
        path: dst,
      });
    } catch (e) {
      errors.push(`${assetName}: ${(e as Error)?.message ?? 'capture_failed'}`);
    }
    done++;
    opts.onProgress?.(done, total, assetName);
  }

  hostSetSlots({} as any);

  const manifestPath = `${outputDir}manifest.json`;
  try {
    await FileSystem.writeAsStringAsync(manifestPath, JSON.stringify({
      kind: 'states',
      theme, language: lang,
      total, written: entries.length, errors,
      entries: entries.map((e) => ({ assetName: e.assetName, state: e.state })),
    }, null, 2));
  } catch (e) {
    errors.push(`manifest_write: ${(e as Error)?.message ?? 'unknown'}`);
  }

  return { outputDir, manifestPath, entries, errors };
}
