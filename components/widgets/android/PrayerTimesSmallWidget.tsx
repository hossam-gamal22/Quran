// components/widgets/android/PrayerTimesSmallWidget.tsx
// 2×2 widget: Next prayer name + time + countdown

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function PrayerTimesSmallWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isArabic = data.language === 'ar';
  const prayerName = isArabic ? prayer.nextPrayerNameAr : prayer.nextPrayerName;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: GRADIENTS.prayer,
        borderRadius: 20,
        padding: 14,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {/* Icon + Prayer Name */}
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
        <TextWidget
          text="🕌"
          style={{ fontSize: 26 }}
        />
        <TextWidget
          text={prayerName}
          style={{
            fontSize: 18,
            color: COLORS.tealLight,
            fontFamily: FONT.amiriBold,
            marginTop: 4,
          }}
        />
      </FlexWidget>

      {/* Time + Remaining */}
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
        <TextWidget
          text={prayer.nextPrayerTime}
          style={{
            fontSize: 22,
            color: COLORS.white,
            fontFamily: FONT.amiriBold,
          }}
        />
        <TextWidget
          text={prayer.timeRemaining}
          style={{
            fontSize: 13,
            color: COLORS.gold,
            fontFamily: FONT.amiri,
            marginTop: 2,
          }}
        />
      </FlexWidget>

      {/* Branding */}
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
