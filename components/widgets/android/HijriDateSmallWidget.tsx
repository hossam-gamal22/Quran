// components/widgets/android/HijriDateSmallWidget.tsx
// 2×2 widget: Hijri date with large day number

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING, APP_ICON, ICON_SIZE } from './shared';

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
      <ImageWidget
        image={APP_ICON}
        imageWidth={ICON_SIZE.small}
        imageHeight={ICON_SIZE.small}
        radius={7}
      />

      <TextWidget
        text={day}
        style={{
          fontSize: 36,
          color: COLORS.gold,
          fontFamily: FONT.amiriBold,
        }}
      />

      <FlexWidget
        style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 3,
        }}
      >
        <TextWidget
          text={monthYear}
          style={{
            fontSize: 12,
            color: COLORS.whiteMuted,
            fontFamily: FONT.amiri,
            textAlign: 'center',
          }}
          maxLines={2}
        />
      </FlexWidget>

      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: COLORS.teal,
          fontFamily: FONT.amiri,
        }}
      />
    </FlexWidget>
  );
}
