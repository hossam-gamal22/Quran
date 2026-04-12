// components/widgets/android/PrayerTimesSmallWidget.tsx
// 2×2 widget: Next prayer name + time + countdown

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function PrayerTimesSmallWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isArabic = data.language === 'ar';
  const prayerName = isArabic ? prayer.nextPrayerNameAr : prayer.nextPrayerName;
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(data.settings?.prayerWidget?.colorScheme, 'prayer');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const accentColor = useTheme ? theme.accentColor : (data.settings?.prayerWidget?.accentColor || COLORS.teal) as `#${string}`;
  const textColor = useTheme ? theme.textColor : sc.white;
  const accent = useTheme ? theme.accentColor : sc.tealLight;
  const badgeText = useTheme ? theme.badgeText : sc.gold;
  const brandColor = useTheme ? theme.accentColor : sc.teal;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: useTheme ? theme.gradient : gradient,
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
          color: textColor,
          fontFamily: FONT.amiriBold,
        }}
      />

      {/* Time */}
      <TextWidget
        text={prayer.nextPrayerTime}
        style={{
          fontSize: 26,
          color: accent,
          fontFamily: FONT.amiriBold,
        }}
      />

      {/* Remaining badge */}
      <FlexWidget
        style={{
          backgroundColor: accentColor,
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <TextWidget
          text={prayer.timeRemaining}
          style={{
            fontSize: 13,
            color: badgeText,
            fontFamily: FONT.amiriBold,
          }}
        />
      </FlexWidget>

      {/* Branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: brandColor,
          fontFamily: FONT.amiri,
        }}
      />
    </FlexWidget>
  );
}
