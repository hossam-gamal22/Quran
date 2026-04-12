// components/widgets/android/PrayerTimesMediumWidget.tsx
// 4×2 widget: All 5 prayer times with next prayer highlighted

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function PrayerTimesMediumWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const prayers = prayer.allPrayers.filter(p => p.name !== 'Sunrise');
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(data.settings?.prayerWidget?.colorScheme, 'prayer');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const accentColor = useTheme ? theme.accentColor : (data.settings?.prayerWidget?.accentColor || COLORS.teal) as `#${string}`;
  const accent = useTheme ? theme.accentColor : sc.tealLight;
  const textColor = useTheme ? theme.textColor : sc.white;
  const mutedColor = useTheme ? theme.mutedColor : sc.whiteMuted;
  const grayColor = useTheme ? theme.mutedColor : sc.gray;
  const grayDarkColor = useTheme ? theme.mutedColor : sc.grayDark;
  const brandColor = useTheme ? theme.accentColor : sc.teal;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundGradient: useTheme ? theme.gradient : gradient,
        borderRadius: 20,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 6,
          paddingHorizontal: 2,
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
            text="مواقيت الصلاة"
            style={{
              fontSize: 13,
              color: accent,
              fontFamily: FONT.amiriBold,
              marginLeft: 6,
            }}
          />
        </FlexWidget>
        {(data.settings?.prayerWidget?.showHijriDate ?? true) && (
          <TextWidget
            text={prayer.hijriDate}
            style={{
              fontSize: 10,
              color: grayColor,
              fontFamily: FONT.amiri,
            }}
          />
        )}
        {(data.settings?.prayerWidget?.showLocation ?? true) && prayer.location ? (
          <TextWidget
            text={prayer.location}
            style={{
              fontSize: 10,
              color: grayDarkColor,
              fontFamily: FONT.amiri,
              marginLeft: 4,
            }}
          />
        ) : null}
      </FlexWidget>

      {/* Prayer times row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          width: 'match_parent',
          flex: 1,
        }}
      >
        {prayers.map((p) => {
          const isNext = p.isNext;
          const isPassed = p.isPassed;
          return (
            <FlexWidget
              key={p.name}
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isNext ? accentColor : '#00000000',
                borderRadius: 14,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <TextWidget
                text={p.nameAr}
                style={{
                  fontSize: 12,
                  color: isNext ? textColor : isPassed ? grayDarkColor : mutedColor,
                  fontFamily: FONT.amiriBold,
                }}
              />
              <TextWidget
                text={p.time}
                style={{
                  fontSize: 14,
                  color: isNext ? textColor : isPassed ? grayDarkColor : (useTheme ? theme.textColor : sc.whiteAlt),
                  fontFamily: FONT.amiri,
                  marginTop: 2,
                }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>

      {/* Branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: brandColor,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
