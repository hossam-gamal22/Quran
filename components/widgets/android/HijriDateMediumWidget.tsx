// components/widgets/android/HijriDateMediumWidget.tsx
// 4×2 widget: Hijri + Gregorian date

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function HijriDateMediumWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const hijriParts = (prayer.hijriDate || '').split(' ');
  const day = hijriParts[0] || '';
  const monthYear = hijriParts.slice(1).join(' ');
  const gregorian = prayer.gregorianDate || '';
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(undefined, 'hijri');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const textColor = useTheme ? theme.textColor : sc.white;
  const dayColor = useTheme ? theme.badgeText : sc.gold;
  const accent = useTheme ? theme.accentColor : sc.tealLight;
  const grayColor = useTheme ? theme.mutedColor : sc.gray;
  const grayDarkColor = useTheme ? theme.mutedColor : sc.grayDark;
  const cardBg = useTheme ? theme.badgeBg : sc.cardBg;
  const dividerColor = useTheme ? theme.mutedColor : sc.divider;
  const brandColor = useTheme ? theme.accentColor : sc.teal;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundGradient: bg,
        borderRadius: 20,
        padding: 14,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://hijri' }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 6,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ImageWidget
            image={APP_ICON}
            imageWidth={ICON_SIZE.header}
            imageHeight={ICON_SIZE.header}
            radius={6}
          />
          <TextWidget
            text="التقويم الهجري"
            style={{
              fontSize: 13,
              color: accent,
              fontFamily: FONT.amiriBold,
              marginLeft: 6,
            }}
          />
        </FlexWidget>
        <TextWidget
          text={BRANDING.name}
          style={{
            fontSize: BRANDING.fontSize,
            color: brandColor,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>

      {/* Content row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          flex: 1,
          width: 'match_parent',
        }}
      >
        {/* Left: large day number */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
          }}
        >
          <TextWidget
            text={day}
            style={{
              fontSize: 40,
              color: dayColor,
              fontFamily: FONT.amiriBold,
            }}
          />
        </FlexWidget>

        {/* Divider */}
        <FlexWidget
          style={{
            width: 1,
            height: 'match_parent',
            backgroundColor: dividerColor,
            marginHorizontal: 10,
          }}
        />

        {/* Right: month + gregorian */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <TextWidget
            text={monthYear}
            style={{
              fontSize: 17,
              color: textColor,
              fontFamily: FONT.amiriBold,
            }}
          />
          {(data.settings?.hijriWidget?.showGregorian ?? true) && (
            <FlexWidget
              style={{
                backgroundColor: cardBg,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 3,
                marginTop: 6,
              }}
            >
              <TextWidget
                text={gregorian}
                style={{
                  fontSize: 13,
                  color: grayColor,
                  fontFamily: FONT.amiri,
                }}
              />
            </FlexWidget>
          )}
          {prayer.location ? (
            <TextWidget
              text={prayer.location}
              style={{
                fontSize: 11,
                color: grayDarkColor,
                fontFamily: FONT.amiri,
                marginTop: 4,
              }}
            />
          ) : null}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
