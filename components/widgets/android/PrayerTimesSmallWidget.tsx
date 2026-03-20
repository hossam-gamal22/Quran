// components/widgets/android/PrayerTimesSmallWidget.tsx
// 2×2 widget: Next prayer name + time + countdown

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT } from './shared';

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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      <TextWidget
        text="🕌"
        style={{ fontSize: 24 }}
      />
      <TextWidget
        text={prayerName}
        style={{
          fontSize: 18,
          color: COLORS.green,
          fontFamily: FONT.amiriBold,
          marginTop: 4,
        }}
      />
      <TextWidget
        text={prayer.nextPrayerTime}
        style={{
          fontSize: 22,
          color: COLORS.white,
          fontFamily: FONT.amiriBold,
          marginTop: 2,
        }}
      />
      <TextWidget
        text={prayer.timeRemaining}
        style={{
          fontSize: 14,
          color: COLORS.gold,
          fontFamily: FONT.amiri,
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
