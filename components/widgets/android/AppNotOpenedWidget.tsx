// components/widgets/android/AppNotOpenedWidget.tsx
// Android widget empty state for a placement created before the app has ever
// written real shared widget data.

import React from 'react';
import { I18nManager } from 'react-native';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { APP_ICON, FONT, paletteFor } from './shared';

// Mirrors SIZE_DIMS in SnapshotWidget — contain-fit tile, transparent outside,
// so a 2×2 placement never stretches into a tall portrait card.
const SIZE_DIMS = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
} as const;

export function AppNotOpenedWidget({
  size = 'medium',
  widgetWidth,
  widgetHeight,
}: {
  /** Registry size — drives the tile's intrinsic aspect (matches the gallery). */
  size?: 'small' | 'medium' | 'large';
  /** Allocated cell size from the launcher (dp). Falls back to intrinsic dims. */
  widgetWidth?: number;
  widgetHeight?: number;
} = {}) {
  const isAr = I18nManager.isRTL;
  const p = paletteFor('dark');

  const dims = SIZE_DIMS[size] ?? SIZE_DIMS.medium;
  const targetWidth = Number.isFinite(widgetWidth) && (widgetWidth ?? 0) > 0 ? widgetWidth! : dims.width;
  const targetHeight = Number.isFinite(widgetHeight) && (widgetHeight ?? 0) > 0 ? widgetHeight! : dims.height;
  const scale = Math.min(targetWidth / dims.width, targetHeight / dims.height);
  const tileWidth = dims.width * scale;
  const tileHeight = dims.height * scale;
  const tileRadius = (size === 'small' ? 28 : 32) * scale;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000000',
      }}
      clickAction="OPEN_APP"
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
        padding: 12,
      }}
    >
      <ImageWidget image={APP_ICON} imageWidth={30} imageHeight={30} radius={7} />
      <TextWidget
        text={isAr ? 'افتح تطبيق روح المسلم' : 'Open Rooh Al Muslim'}
        style={{
          fontSize: 13,
          color: p.text,
          fontFamily: isAr ? FONT.rubikBold : FONT.rubikBold,
          marginTop: 8,
          textAlign: 'center',
        }}
        maxLines={2}
        truncate="END"
      />
      <TextWidget
        text={isAr ? 'حتى تظهر بيانات الويدجت' : 'to load widget data'}
        style={{
          fontSize: 10,
          color: p.muted,
          fontFamily: FONT.rubik,
          marginTop: 4,
          textAlign: 'center',
        }}
        maxLines={2}
        truncate="END"
      />
    </FlexWidget>
    </FlexWidget>
  );
}
