// components/widgets/android/ArabicOnlyWidget.tsx
// Shown (in English) when a non-Arabic app language places a widget that has no
// English version (forcedLanguage: 'ar' — the curated verse/azkar widgets and
// the calligraphic day/month-thuluth widgets). Same visual style as the premium
// LockedWidget, mirrors iOS ArabicOnlyView.
//
// Size-aware: like CuratedImageWidget / SnapshotWidget / WidgetFallbackNotice it
// renders a centred tile at the size class's intrinsic aspect ratio (scaled to
// the launcher-reported bounds), so the fallback occupies the SAME footprint as
// its same-size neighbours instead of bleeding to the full RemoteViews cell.

import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { FONT, paletteFor } from './shared';

type AndroidSize = 'small' | 'medium' | 'large';

// Mirrors SIZE_DIMS in CuratedImageWidget / SnapshotWidget / the preview generator.
const SIZE_DIMS: Record<AndroidSize, { width: number; height: number }> = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
};

const TILE_RADIUS: Record<AndroidSize, number> = { small: 28, medium: 32, large: 32 };

interface ArabicOnlyWidgetProps {
  /** Size class of the placement — drives the tile footprint. */
  size?: AndroidSize;
  /** Resolved theme key (already collapsed from 'auto'). */
  theme?: string;
  clickUri?: string;
  /** Launcher-reported bounds in dp (mirrors CuratedImageWidget scaling). */
  widgetWidth?: number;
  widgetHeight?: number;
}

function globeSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
  <path fill="${color}" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8ZM12 4c.83 1.2 1.48 2.53 1.91 4h-3.82A12.6 12.6 0 0 1 12 4ZM4.26 14a7.8 7.8 0 0 1 0-4h3.38a16.6 16.6 0 0 0 0 4H4.26Zm.81 2h2.95c.35 1.27.82 2.47 1.38 3.56A8.03 8.03 0 0 1 5.07 16Zm2.95-8H5.07a8.03 8.03 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.02 8ZM12 20c-.83-1.2-1.48-2.53-1.91-4h3.82A12.6 12.6 0 0 1 12 20Zm2.34-6H9.66a14.6 14.6 0 0 1 0-4h4.68a14.6 14.6 0 0 1 0 4Zm.27 5.56c.56-1.09 1.03-2.29 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14a16.6 16.6 0 0 0 0-4h3.38a7.8 7.8 0 0 1 0 4h-3.38Z"/>
</svg>`;
}

export function ArabicOnlyWidget({
  size = 'medium',
  theme,
  clickUri,
  widgetWidth,
  widgetHeight,
}: ArabicOnlyWidgetProps) {
  const p = paletteFor(theme);
  const { width: logicalWidth, height: logicalHeight } = SIZE_DIMS[size] ?? SIZE_DIMS.medium;
  const targetWidth = Number.isFinite(widgetWidth) && (widgetWidth ?? 0) > 0 ? widgetWidth! : logicalWidth;
  const targetHeight = Number.isFinite(widgetHeight) && (widgetHeight ?? 0) > 0 ? widgetHeight! : logicalHeight;
  const renderScale = Math.min(targetWidth / logicalWidth, targetHeight / logicalHeight);
  const tileWidth = logicalWidth * renderScale;
  const tileHeight = logicalHeight * renderScale;
  const tileRadius = (TILE_RADIUS[size] ?? 32) * renderScale;
  const iconSize = Math.round(28 * renderScale);

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000000',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: clickUri ?? 'rooh-almuslim://settings/language' }}
    >
      <FlexWidget
        style={{
          width: tileWidth,
          height: tileHeight,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: p.bg,
          borderRadius: tileRadius,
          padding: Math.round(16 * renderScale),
        }}
      >
        <SvgWidget
          svg={globeSvg(p.muted)}
          style={{ width: iconSize, height: iconSize, marginBottom: Math.round(6 * renderScale) }}
        />
        <TextWidget
          text="Arabic only"
          style={{ fontFamily: FONT.rubikBold, fontSize: Math.round(14 * renderScale), color: p.text, textAlign: 'center' }}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
        />
        <TextWidget
          text="Switch the app to Arabic to use this widget"
          style={{ fontFamily: FONT.rubikMedium, fontSize: Math.round(11 * renderScale), color: p.muted, marginTop: Math.round(4 * renderScale), textAlign: 'center' }}
          maxLines={2}
          truncate="END"
          allowFontScaling={false}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
