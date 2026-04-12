// components/widgets/android/HijriDateSmallWidget.tsx
// 2×2 widget: Hijri date with large day number

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function HijriDateSmallWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const hijriParts = (prayer.hijriDate || '').split(' ');
  const day = hijriParts[0] || '';
  const monthYear = hijriParts.slice(1).join(' ');
  const showGregorian = data.settings?.hijriWidget?.showGregorian ?? true;
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(undefined, 'hijri');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const dayColor = useTheme ? theme.badgeText : sc.gold;
  const mutedColor = useTheme ? theme.mutedColor : sc.whiteMuted;
  const cardBg = useTheme ? theme.badgeBg : sc.cardBg;
  const grayDarkColor = useTheme ? theme.mutedColor : sc.grayDark;
  const brandColor = useTheme ? theme.accentColor : sc.teal;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: bg,
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
          color: dayColor,
          fontFamily: FONT.amiriBold,
        }}
      />

      <FlexWidget
        style={{
          backgroundColor: cardBg,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 3,
        }}
      >
        <TextWidget
          text={monthYear}
          style={{
            fontSize: 12,
            color: mutedColor,
            fontFamily: FONT.amiri,
            textAlign: 'center',
          }}
          maxLines={2}
        />
      </FlexWidget>

      {showGregorian && prayer.gregorianDate ? (
        <TextWidget
          text={prayer.gregorianDate}
          style={{
            fontSize: 10,
            color: grayDarkColor,
            fontFamily: FONT.amiri,
            textAlign: 'center',
          }}
          maxLines={1}
        />
      ) : null}

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
