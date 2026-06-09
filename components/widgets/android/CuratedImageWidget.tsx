// components/widgets/android/CuratedImageWidget.tsx
// Renders the bundled, Arabic-only curated image widgets
// (verseOfDay / azkarMorning / azkarEvening / dailyDhikr).
//
// The owner ships single-colour transparent PNGs (assets/widget-images/*). We
// draw the themed background natively and tint the transparent image to the
// active theme's text colour (via the patched ImageWidget `tintColor` prop), so
// every appearance setting keeps working. The image is picked purely from the
// date/time inside the headless task, so the widget rotates with no network and
// without the app ever being opened.

import React from 'react';
import { FlexWidget, ImageWidget } from 'react-native-android-widget';
import { paletteFor } from './shared';
import {
  curatedImageSource,
  type CuratedWidgetId,
} from '@/lib/widgets/curated-images';

type AndroidSize = 'small' | 'medium' | 'large';

const SIZE_DIMS: Record<AndroidSize, { width: number; height: number }> = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
};

const TILE_RADIUS: Record<AndroidSize, number> = { small: 28, medium: 32, large: 32 };

interface CuratedImageWidgetProps {
  widgetId: CuratedWidgetId;
  size: AndroidSize;
  /** Resolved theme key (already collapsed from 'auto'). */
  theme?: string;
  clickUri?: string;
  /** Launcher-reported bounds in dp (mirrors SnapshotWidget scaling). */
  widgetWidth?: number;
  widgetHeight?: number;
  /** Override for tests; defaults to now. */
  now?: Date;
}

export function CuratedImageWidget({
  widgetId,
  size,
  theme,
  clickUri,
  widgetWidth,
  widgetHeight,
  now,
}: CuratedImageWidgetProps) {
  const p = paletteFor(theme);
  const { width: logicalWidth, height: logicalHeight } = SIZE_DIMS[size];
  const targetWidth = Number.isFinite(widgetWidth) && (widgetWidth ?? 0) > 0 ? widgetWidth! : logicalWidth;
  const targetHeight = Number.isFinite(widgetHeight) && (widgetHeight ?? 0) > 0 ? widgetHeight! : logicalHeight;
  const renderScale = Math.min(targetWidth / logicalWidth, targetHeight / logicalHeight);
  const tileWidth = logicalWidth * renderScale;
  const tileHeight = logicalHeight * renderScale;
  const tileRadius = TILE_RADIUS[size] * renderScale;

  const src = curatedImageSource(widgetId, now ?? new Date());

  // The PNGs are authored at the tile's aspect ratio (1080×510 ≈ medium), so we
  // fill the tile edge-to-edge — the widget shows the design at 100%, no inset.
  // `tintColor` is added by scripts/patch-react-native-android-widget.js; it is
  // not in the shipped .d.ts, so build the props object as `any`.
  const imgProps: any = {
    image: src,
    imageWidth: tileWidth,
    imageHeight: tileHeight,
    // Unified per-theme ink (gold on olive/desert, white on dark/green/blue/
    // slate, black on light/auto) so every widget matches.
    tintColor: p.ink,
    radius: tileRadius,
  };

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000000',
      }}
      clickAction={clickUri ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={clickUri ? { uri: clickUri } : undefined}
    >
      <FlexWidget
        style={{
          width: tileWidth,
          height: tileHeight,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: p.bg,
          borderRadius: tileRadius,
        }}
      >
        <ImageWidget {...imgProps} />
      </FlexWidget>
    </FlexWidget>
  );
}
