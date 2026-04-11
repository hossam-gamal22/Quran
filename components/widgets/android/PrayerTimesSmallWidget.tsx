// components/widgets/android/PrayerTimesSmallWidget.tsx
// 2×2 widget: Next prayer name + time + countdown

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING, APP_ICON, ICON_SIZE } from './shared';

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
      {/* App Icon */}
      <ImageWidget
        image={APP_ICON}
        imageWidth={ICON_SIZE.small}
        imageHeight={ICON_SIZE.small}
        radius={7}
      />

      {/* Prayer Name */}
      <TextWidget
        text={prayerName}
        style={{
          fontSize: 18,
          color: COLORS.white,
          fontFamily: FONT.amiriBold,
        }}
      />

      {/* Time */}
      <TextWidget
        text={prayer.nextPrayerTime}
        style={{
          fontSize: 26,
          color: COLORS.tealLight,
          fontFamily: FONT.amiriBold,
        }}
      />

      {/* Remaining badge */}
      <FlexWidget
        style={{
          backgroundColor: COLORS.badgeBg,
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <TextWidget
          text={prayer.timeRemaining}
          style={{
            fontSize: 13,
            color: COLORS.gold,
            fontFamily: FONT.amiriBold,
          }}
        />
      </FlexWidget>

      {/* Branding */}
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
