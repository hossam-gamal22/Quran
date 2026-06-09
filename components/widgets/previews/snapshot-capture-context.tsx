import React from 'react';
import type { WidgetThemeKey } from './shared';
import type { SharedWidgetData } from '@/lib/widget-data';

/**
 * Anchor manifest entry. One record per dynamic text region the native widget
 * extension must paint live (current time, prayer time, countdown, day number,
 * etc). Coordinates are in dp relative to the captured PNG's bounding rect, so
 * native side can scale by `widgetFrame.width / capturedWidth`.
 *
 * Emitted by `<AnchorReporter>` inside each Preview component during the
 * off-screen snapshot capture; written by the snapshot pump as a JSON file
 * next to the PNG.
 */
export interface CaptureAnchor {
  /** Stable id the native side uses to look up which live value to draw.
   *  e.g. "prayerHeroTime", "prayerHeroCountdown", "prayerRowTime.fajr",
   *  "currentTime", "dayNumber", "hijriDay", "hijriMonth", "hijriYear". */
  id: string;
  /** x of the anchor's top-left corner, in dp, relative to the captured frame. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  /** SwiftUI weight token: "regular" | "medium" | "semibold" | "bold". */
  fontWeight: 'regular' | 'medium' | 'semibold' | 'bold';
  /** Hex color string, e.g. "#0f987f". */
  color: string;
  /** Horizontal alignment inside the rect. */
  alignment: 'leading' | 'center' | 'trailing';
  /** Reading direction for the live text. */
  direction: 'ltr' | 'rtl';
  /** Whether the live value is the compact-duration countdown string
   *  ("1 س 52 د" / "1H 52M"). Native side picks the right formatter. */
  isCountdown?: boolean;
}

/**
 * Snapshot-capture context.
 *
 * When `capturing` is true, previews:
 *   - Drop shadow / elevation (those are baked into the PNG and look wrong on
 *     the home screen because iOS adds its own shadow).
 *   - Hide dynamic text via `<AnchorReporter>` so the live value is overlaid
 *     by the native widget extension instead of baked into the PNG.
 *   - Call `registerAnchor` for every hidden region so the native side knows
 *     where to draw which live value.
 *
 * Outside capture (`capturing=false`), previews render normally (gallery path).
 */
export interface SnapshotCaptureContextValue {
  capturing: boolean;
  /** No-op when `capturing` is false. The pump installs a real collector
   *  during capture; the gallery path leaves it as a no-op. */
  registerAnchor: (anchor: CaptureAnchor) => void;
  /** Ref to the slot's root View. AnchorReporter measures its rect relative to
   *  this so the reported x/y are FRAME-relative (not parent-relative), which is
   *  what the native overlay / manifest consumers expect. */
  rootRef?: React.RefObject<any> | null;
  /** True ONLY for the gallery-snapshot pump (`runSnapshotPass`). When set, the
   *  prayer previews decouple ALL state-dependent visuals from the Android bake
   *  (hero/next/prev NAME, active-row HIGHLIGHT, active row COLORS) — exactly the
   *  way iOS already does — so the gallery PNG is a clean chrome-only fallback.
   *  The home overlay then draws those live. The per-state template bake leaves
   *  this false, so those PNGs keep name + highlight + colors baked (the PRIMARY
   *  path, pixel-identical to the gallery). */
  blankPrayerState?: boolean;
}

const NOOP_CONTEXT: SnapshotCaptureContextValue = {
  capturing: false,
  registerAnchor: () => {},
  rootRef: null,
  blankPrayerState: false,
};

export const WidgetSnapshotCaptureContext =
  React.createContext<SnapshotCaptureContextValue>(NOOP_CONTEXT);

export function useWidgetSnapshotCapture(): boolean {
  return React.useContext(WidgetSnapshotCaptureContext).capturing;
}

export function useAnchorRegistrar(): (anchor: CaptureAnchor) => void {
  return React.useContext(WidgetSnapshotCaptureContext).registerAnchor;
}

export function useSnapshotRootRef(): React.RefObject<any> | null {
  return React.useContext(WidgetSnapshotCaptureContext).rootRef ?? null;
}

export function useBlankPrayerState(): boolean {
  return React.useContext(WidgetSnapshotCaptureContext).blankPrayerState ?? false;
}

/**
 * When set (only during the per-theme capture loop), every preview must render
 * with this exact theme regardless of `display.widgetTheme` from settings.
 * Drives the foreground colour palette baked into the PNG so it matches the
 * concrete `<id>_<size>_<theme>.png` filename.
 *
 * `null` means "no override — read theme from settings as usual" (the gallery
 * preview path).
 */
export const WidgetForcedThemeContext = React.createContext<WidgetThemeKey | null>(null);

export function useWidgetForcedTheme(): WidgetThemeKey | null {
  return React.useContext(WidgetForcedThemeContext);
}

export const WidgetPreviewDataContext = React.createContext<SharedWidgetData | null>(null);

export function useWidgetPreviewData(): SharedWidgetData | null {
  return React.useContext(WidgetPreviewDataContext);
}
