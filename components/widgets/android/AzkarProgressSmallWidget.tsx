// components/widgets/android/AzkarProgressSmallWidget.tsx
// 2×2 widget: Morning/Evening azkar completion tracker

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function AzkarProgressSmallWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(undefined, 'azkar');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const accent = useTheme ? theme.accentColor : sc.tealLight;
  const grayDarkColor = useTheme ? theme.mutedColor : sc.grayDark;
  const grayLightColor = useTheme ? theme.mutedColor : sc.grayLight;
  const badgeBg = useTheme ? theme.badgeBg : sc.badgeBg;
  const cardBg = useTheme ? theme.badgeBg : sc.cardBg;
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
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      <ImageWidget
        image={APP_ICON}
        imageWidth={ICON_SIZE.small}
        imageHeight={ICON_SIZE.small}
        radius={7}
      />

      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center', width: 'match_parent' }}>
        {/* Morning */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: azkar.morningCompleted ? badgeBg : cardBg,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginBottom: 6,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={azkar.morningCompleted ? '✓' : '○'}
            style={{
              fontSize: 14,
              color: azkar.morningCompleted ? accent : grayDarkColor,
              marginRight: 6,
            }}
          />
          <TextWidget
            text="أذكار الصباح"
            style={{
              fontSize: 13,
              color: azkar.morningCompleted ? accent : grayLightColor,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>

        {/* Evening */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: azkar.eveningCompleted ? badgeBg : cardBg,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 5,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={azkar.eveningCompleted ? '✓' : '○'}
            style={{
              fontSize: 14,
              color: azkar.eveningCompleted ? accent : grayDarkColor,
              marginRight: 6,
            }}
          />
          <TextWidget
            text="أذكار المساء"
            style={{
              fontSize: 13,
              color: azkar.eveningCompleted ? accent : grayLightColor,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>
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
  );
}
