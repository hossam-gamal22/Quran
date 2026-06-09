// components/widgets/android/WidgetFallbackNotice.tsx
// Graceful fallback rendered whenever a widget has no baked snapshot PNG on disk
// (fresh add before the first foreground bake, cleared cache, generation failure)
// OR the normal render throws. It shows the bundled per-widget preview image so
// the widget still LOOKS like the real thing, plus a banner telling the user to
// open the app so the widget refreshes with live data. This is the universal
// "never show a raw error" state — keep its logic minimal so it is itself
// extremely unlikely to throw.

import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import { APP_ICON, FONT, WIDGET_FALLBACK_PREVIEWS, paletteFor } from './shared';

// Mirrors SIZE_DIMS in SnapshotWidget / the preview-image generator. The bundled
// previews are baked at these intrinsic dimensions, so we contain-fit against
// them to avoid cropping or distortion.
const SIZE_DIMS: Record<string, { width: number; height: number }> = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
};

export interface WidgetFallbackNoticeProps {
  widgetId: string;
  size: string;
  /** Resolved (concrete) widget theme — drives the background + text palette. */
  theme: string;
  /** True when the app/widget language is Arabic. */
  isArabic: boolean;
  /** Allocated cell size from the launcher (px). Falls back to intrinsic dims. */
  widgetWidth?: number;
  widgetHeight?: number;
  clickAction?: 'OPEN_APP' | 'OPEN_URI';
  clickUri?: string;
}

export function WidgetFallbackNotice({
  widgetId,
  size,
  theme,
  isArabic,
  widgetWidth,
  widgetHeight,
  clickAction = 'OPEN_APP',
  clickUri,
}: WidgetFallbackNoticeProps) {
  const p = paletteFor(theme as any);
  const notice = isArabic ? 'افتح التطبيق لتحديث الودجت' : 'Open the app to refresh';
  const clickActionData = clickAction === 'OPEN_URI' && clickUri ? { uri: clickUri } : undefined;
  const preview = WIDGET_FALLBACK_PREVIEWS[`${widgetId}_${size}`];

  // No bundled preview for this widget id/size — show the branded card with the
  // same "open the app" hint.
  if (!preview) {
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: p.bg,
          borderRadius: 0,
          padding: 12,
        }}
        clickAction={clickAction}
        clickActionData={clickActionData}
      >
        <ImageWidget image={APP_ICON} imageWidth={28} imageHeight={28} radius={6} />
        <TextWidget
          text="روح المسلم"
          style={{ fontSize: 13, color: p.text, fontFamily: FONT.widget, marginTop: 8, textAlign: 'center' }}
        />
        <TextWidget
          text={notice}
          style={{ fontSize: 10, color: p.muted, fontFamily: FONT.rubikMedium, marginTop: 4, textAlign: 'center' }}
          maxLines={2}
          truncate="END"
        />
      </FlexWidget>
    );
  }

  const dims = SIZE_DIMS[size] ?? SIZE_DIMS.medium;
  const targetWidth = Number.isFinite(widgetWidth) && (widgetWidth ?? 0) > 0 ? widgetWidth! : dims.width;
  const targetHeight = Number.isFinite(widgetHeight) && (widgetHeight ?? 0) > 0 ? widgetHeight! : dims.height;
  const scale = Math.min(targetWidth / dims.width, targetHeight / dims.height);
  const imageWidth = dims.width * scale;
  const imageHeight = dims.height * scale;
  const offsetX = (targetWidth - imageWidth) / 2;
  const offsetY = (targetHeight - imageHeight) / 2;

  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: p.bg,
        borderRadius: 0,
        overflow: 'hidden',
      }}
      clickAction={clickAction}
      clickActionData={clickActionData}
    >
      <ImageWidget
        image={preview}
        style={{ width: imageWidth, height: imageHeight, marginLeft: offsetX, marginTop: offsetY }}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        radius={0}
      />
      {/* Bottom-anchored "open the app" banner overlaid on the preview. */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000000B3',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginBottom: 6,
          }}
        >
          <TextWidget
            text={notice}
            style={{ fontSize: 10, color: '#FFFFFF', fontFamily: FONT.rubikMedium, textAlign: 'center' }}
            maxLines={2}
            truncate="END"
          />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
