import React from 'react';
import type { WidgetThemeKey } from './shared';
import type { SharedWidgetData } from '@/lib/widget-data';

/** When true (only during off-screen snapshot capture), preview chrome must not
 * add drop shadow / elevation — those would be baked into PNGs and appear as
 * dark halos on the home screen.
 *
 * The capture branch also drops the root themed background and blur layer so
 * the PNG is a transparent foreground that composites on top of the native
 * widget shell's themed paint (see plan §A).
 */
export const WidgetSnapshotCaptureContext = React.createContext(false);

export function useWidgetSnapshotCapture(): boolean {
  return React.useContext(WidgetSnapshotCaptureContext);
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
