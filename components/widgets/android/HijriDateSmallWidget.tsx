// components/widgets/android/HijriDateSmallWidget.tsx
// 2×2 widget: Hijri date + day name

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function HijriDateSmallWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const hijriParts = prayer.hijriDate.split(' ');
  const day = hijriParts[0] || '';
  const monthYear = hijriParts.slice(1).join(' ');

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: GRADIENTS.hijri,
        borderRadius: 20,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://hijri' }}
    >
      <TextWidget
        text="🌙"
        style={{ fontSize: 22 }}
      />
      <TextWidget
        text={day}
        style={{
          fontSize: 32,
          color: COLORS.gold,
          fontFamily: FONT.amiriBold,
        }}
      />
      <TextWidget
        text={monthYear}
        style={{
          fontSize: 12,
          color: COLORS.grayLight,
          fontFamily: FONT.amiri,
          textAlign: 'center',
        }}
        maxLines={2}
      />
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: BRANDING.color,
          fontFamily: FONT.amiri,
        }}
      />
    </FlexWidget>
  );
}
