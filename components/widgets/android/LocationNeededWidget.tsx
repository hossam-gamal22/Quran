// components/widgets/android/LocationNeededWidget.tsx
// Shown on prayer widgets when no location has been stored yet (PrayerInputs
// absent). Prevents showing wrong/default prayer times before the user enables
// location. Same visual style as LockedWidget. Mirrors iOS LocationNeededView.

import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { FONT, paletteFor } from './shared';

interface LocationNeededWidgetProps {
  /** Resolved theme key (already collapsed from 'auto'). */
  theme?: string;
  isArabic?: boolean;
  clickUri?: string;
}

function pinSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
  <path fill="${color}" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/>
</svg>`;
}

export function LocationNeededWidget({ theme, isArabic = true, clickUri }: LocationNeededWidgetProps) {
  const p = paletteFor(theme);
  const title = isArabic ? 'فعّل الموقع' : 'Enable location';
  const subtitle = isArabic
    ? 'افتح التطبيق وفعّل الموقع لعرض مواقيت الصلاة الصحيحة'
    : 'Open the app and enable location to show prayer times';

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
        padding: 16,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: clickUri ?? 'rooh-almuslim://prayer' }}
    >
      <SvgWidget svg={pinSvg(p.muted)} style={{ width: 28, height: 28, marginBottom: 6 }} />
      <TextWidget
        text={title}
        style={{ fontFamily: FONT.rubikBold, fontSize: 14, color: p.text, textAlign: 'center' }}
        maxLines={1}
        truncate="END"
        allowFontScaling={false}
      />
      <TextWidget
        text={subtitle}
        style={{ fontFamily: FONT.rubikMedium, fontSize: 11, color: p.muted, marginTop: 4, textAlign: 'center' }}
        maxLines={2}
        truncate="END"
        allowFontScaling={false}
      />
    </FlexWidget>
  );
}
