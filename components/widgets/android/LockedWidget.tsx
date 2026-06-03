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
}

function lockSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
  <path fill="${color}" d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm3 9.73V17a1 1 0 1 1-2 0v-1.27a2 2 0 1 1 2 0Z"/>
</svg>`;
}

export function LockedWidget({ widgetName: _widgetName, data }: LockedWidgetProps) {
  const theme = resolveWidgetTheme(data?.widgetTheme, Appearance.getColorScheme());
  const p = paletteFor(theme);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: p.bg,
        borderRadius: 32,
        padding: 14,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://subscription' }}
    >
      <SvgWidget svg={lockSvg(p.muted)} style={{ width: 28, height: 28, marginBottom: 6 }} />
      <TextWidget
        text="اشترك للوصول"
        style={{ fontFamily: FONT.rubikBold, fontSize: 14, color: p.text, textAlign: 'center' }}
        maxLines={1}
        truncate="END"
        allowFontScaling={false}
      />
      <TextWidget
        text="افتح التطبيق للاشتراك"
        style={{ fontFamily: FONT.rubikMedium, fontSize: 11, color: p.muted, marginTop: 4, textAlign: 'center' }}
        maxLines={1}
        truncate="END"
        allowFontScaling={false}
      />
    </FlexWidget>
  );
}
