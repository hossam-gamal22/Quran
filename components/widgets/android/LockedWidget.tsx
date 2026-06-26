// components/widgets/android/LockedWidget.tsx
// Premium gate shown to non-premium users. Mirrors iOS PremiumLockedView.

import React from 'react';
import { Appearance } from 'react-native';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { resolveWidgetTheme } from '@/lib/widgets/snapshot';
import { FONT, paletteFor } from './shared';

interface LockedWidgetProps {
  widgetName: string;
  data?: SharedWidgetData | null;
  /** Registry size — drives the tile's intrinsic aspect (matches the gallery). */
  size?: 'small' | 'medium' | 'large';
  /** Allocated cell size from the launcher (dp). Falls back to intrinsic dims. */
  widgetWidth?: number;
  widgetHeight?: number;
}

// Mirrors SIZE_DIMS in SnapshotWidget — contain-fit tile, transparent outside,
// so a 2×2 placement never stretches into a tall portrait card.
const SIZE_DIMS = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
} as const;

function lockSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
  <path fill="${color}" d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm3 9.73V17a1 1 0 1 1-2 0v-1.27a2 2 0 1 1 2 0Z"/>
</svg>`;
}

export function LockedWidget({
  widgetName: _widgetName,
  data,
  size = 'medium',
  widgetWidth,
  widgetHeight,
}: LockedWidgetProps) {
  const theme = resolveWidgetTheme(data?.widgetTheme, Appearance.getColorScheme());
  const p = paletteFor(theme);

  const dims = SIZE_DIMS[size] ?? SIZE_DIMS.medium;
  const targetWidth = Number.isFinite(widgetWidth) && (widgetWidth ?? 0) > 0 ? widgetWidth! : dims.width;
  const targetHeight = Number.isFinite(widgetHeight) && (widgetHeight ?? 0) > 0 ? widgetHeight! : dims.height;
  const scale = Math.min(targetWidth / dims.width, targetHeight / dims.height);
  const tileWidth = dims.width * scale;
  const tileHeight = dims.height * scale;
  const tileRadius = (size === 'small' ? 28 : 32) * scale;
  const iconSize = Math.round(28 * scale);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000000',
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://subscription' }}
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
          padding: Math.round(14 * scale),
        }}
      >
        <SvgWidget svg={lockSvg(p.muted)} style={{ width: iconSize, height: iconSize, marginBottom: 6 }} />
        <TextWidget
          text="اشترك للوصول"
          style={{ fontFamily: FONT.rubikBold, fontSize: 14 * scale, color: p.text, textAlign: 'center' }}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
        />
        <TextWidget
          text="افتح التطبيق للاشتراك"
          style={{ fontFamily: FONT.rubikMedium, fontSize: 11 * scale, color: p.muted, marginTop: 4, textAlign: 'center' }}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
