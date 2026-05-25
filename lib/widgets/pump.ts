// lib/widgets/pump.ts
//
// Glue between SettingsContext / widget data and the snapshot orchestrator.
// Computes a stable signature for the data inputs (so the hash in
// computeSnapshotHash is meaningful) and exposes a single call site:
//
//   await pumpFromCurrentState();
//
// Called from:
//   - app/_layout.tsx after fonts load (foreground pump)
//   - SettingsContext when display preferences change
//   - widget-data-bridge after data refresh
//
// Implements the C5/C6/C7 constraints: hash-based skip, debounced, persistent.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  pumpWidgetSnapshots,
  pumpWidgetSnapshotsForThemes,
  type SnapshotInput,
  type WidgetSnapshotResult,
  type ResolvedWidgetTheme,
  invalidateSnapshotCache,
} from './snapshot';
import type { SharedWidgetData } from '@/lib/widget-data';

// 14 — Verse preview starts from a larger fit-to-width font and tighter side
//       inset so short/medium ayat fill the space between ornaments.
// 13 — Verse QCF ornaments/brackets get wider side inset from the ayah text.
// 12 — Verse widget now takes the app's actual `sharedData.verse` first
//       (including admin override), so tapping widget and app agree.
// 11 — Verse fallback is now short, QCF brackets have more side breathing,
//       and English translation is pulled closer to the Arabic line.
// 10 — Verse widget now samples only very short ayat and enlarges Arabic /
//       English text to match the approved black reference composition.
// 9 — Verse text spacing tightened and verse pool now rejects long QCF ayat.
//      Regenerate PNGs and data-driven snapshots on both home-widget platforms.
// 8 — Verse QCF line gets more real width + hair-space glyph separation, so
//      auto-fit no longer scales it back to the old visual size.
// 7 — Verse of Day Arabic QCF line enlarged to match the approved gallery
//      composition. Regenerate home-screen PNGs on iOS + Android.
// 6 — Verse QCF snapshot layout now uses spaced glyphs + external brackets.
//      Bump so old tightly-rendered verse PNGs regenerate on both platforms.
// 5 — Verse of Day PNG snapshots now bake true QCF page glyphs/fonts. Bump
//      forces old KFG/SwiftUI-era verse images to regenerate.
// 4 — adds anchor manifest emission (preview wraps dynamic regions with
//      `<AnchorReporter>`, snapshot pump attaches captured anchor rects to
//      `SharedWidgetData.snapshotManifest[routeKey].anchors`). Bumping forces
//      every cached PNG + manifest entry to regenerate so the new fields are
//      populated even when the user's content signature hasn't changed.
const SCHEMA_VERSION = 14;

export type DisplaySettingsLike = {
  widgetTheme?: string;
  widgetNumerals?: string;
  widgetCalendar?: string;
  widgetMonthCalendar?: string;
  widgetDayCalendar?: string;
  widgetFontVariant?: string;
  widgetDateFormat?: string;
  widgetLanguage?: string;
};

export interface PumpContext {
  language: 'ar' | 'en' | string;
  isPremium: boolean;
  display: DisplaySettingsLike;
  sharedData?: SharedWidgetData;
  snapshotVersion?: number;
  refreshProofMarker?: string;
  /** Stable identifier for today's prayer set (e.g. `${dateISO}-${nextPrayer}-${remainingMin // 5}`). */
  prayerSignature?: string;
  /** ISO date or ayah id — bumps when the daily verse changes. */
  verseSignature?: string;
  dhikrSignature?: string;
  azkarSignature?: string;
}

function buildInput(ctx: PumpContext): SnapshotInput {
  return {
    language: ctx.language,
    isPremium: ctx.isPremium,
    prayerSignature: ctx.prayerSignature ?? '',
    verseSignature: ctx.verseSignature ?? '',
    dhikrSignature: ctx.dhikrSignature ?? '',
    azkarSignature: ctx.azkarSignature ?? '',
    theme: ctx.display.widgetTheme ?? 'auto',
    numerals: ctx.display.widgetNumerals ?? 'auto',
    calendar: ctx.display.widgetCalendar ?? 'auto',
    dayCalendar: ctx.display.widgetDayCalendar ?? 'auto',
    monthCalendar: ctx.display.widgetMonthCalendar ?? 'auto',
    fontVariant: ctx.display.widgetFontVariant ?? 'widget1',
    dateFormat: ctx.display.widgetDateFormat ?? 'gregorian-ar',
    schemaVersion: SCHEMA_VERSION,
    sharedData: ctx.sharedData,
    snapshotVersion: ctx.snapshotVersion,
    refreshProofMarker: ctx.refreshProofMarker,
  };
}

/**
 * Latest "PumpContext" cached in module scope so external callers (e.g. the
 * widget-data-bridge) can pump without having to re-derive every input.
 *
 * Set by `setPumpContext()` from the React tree (typically in a `useEffect` in
 * `app/_layout.tsx`); read by `pumpFromCurrentState()`.
 */
let cachedCtx: PumpContext | null = null;

export function setPumpContext(ctx: PumpContext): void {
  cachedCtx = ctx;
}

export function getPumpContext(): PumpContext | null {
  return cachedCtx;
}

/**
 * Run the snapshot pump using the most recent cached context. Returns a
 * resolved no-op result when no context has been set yet (e.g. very early in
 * boot, before SettingsContext mounted).
 */
export async function pumpFromCurrentState(opts?: {
  force?: boolean;
  debounceMs?: number;
  includeRouteKeys?: ReadonlyArray<string>;
  cleanup?: boolean;
  commit?: boolean;
}): Promise<WidgetSnapshotResult | null> {
  if (!cachedCtx) return null;
  // Snapshot pipeline only runs on iOS / Android — skip on web.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const input = buildInput(cachedCtx);
  return pumpWidgetSnapshots(input, opts ?? {});
}

/**
 * Run the snapshot pump for a specific subset of themes (e.g. just the active
 * one) using the cached context. Used by SnapshotPumpController to render the
 * user's resolved theme first and defer the remaining themes to background
 * work. Returns a resolved no-op when no context is set.
 */
export async function pumpThemesFromCurrentState(
  themes: ReadonlyArray<ResolvedWidgetTheme>,
  opts?: {
    force?: boolean;
    debounceMs?: number;
    includeRouteKeys?: ReadonlyArray<string>;
    cleanup?: boolean;
    commit?: boolean;
  },
): Promise<WidgetSnapshotResult | null> {
  if (!cachedCtx) return null;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const input = buildInput(cachedCtx);
  return pumpWidgetSnapshotsForThemes(input, themes, opts ?? {});
}

/** Drop the persisted hash so the next pump regenerates everything (debug only). */
export async function clearSnapshotCache(): Promise<void> {
  await invalidateSnapshotCache();
  // Belt-and-braces: also drop pre-v2 keys if any landed in storage.
  try { await AsyncStorage.removeItem('@widget_snapshot_hash'); } catch {}
  try { await AsyncStorage.removeItem('@widget_snapshot_hash_v1'); } catch {}
}
