// components/widgets/android/DailyDhikrSmallWidget.tsx
// 2×2 widget: Dhikr text + count badge

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function DailyDhikrSmallWidget({ data }: { data: SharedWidgetData }) {
  const { dhikr } = data;
  const showTranslation = (data.settings?.dhikrWidget?.showTranslation ?? false) && !!dhikr.translation;
  const truncated = dhikr.arabic.length > 50
    ? dhikr.arabic.substring(0, 50) + '…'
    : dhikr.arabic;
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(undefined, 'dhikr');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const textColor = useTheme ? theme.textColor : sc.white;
  const mutedColor = useTheme ? theme.mutedColor : sc.whiteMuted;
  const badgeBg = useTheme ? theme.badgeBg : sc.badgeBg;
  const accent = useTheme ? theme.accentColor : sc.tealLight;
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
      clickActionData={{ uri: 'rooh-almuslim://daily-dhikr' }}
    >
      <ImageWidget
        image={APP_ICON}
        imageWidth={ICON_SIZE.small}
        imageHeight={ICON_SIZE.small}
        radius={7}
      />

      <TextWidget
        text={truncated}
        style={{
          fontSize: 14,
          color: textColor,
          fontFamily: FONT.amiri,
          textAlign: 'center',
        }}
        maxLines={showTranslation ? 2 : 3}
        truncate="END"
      />

      {showTranslation ? (
        <TextWidget
          text={dhikr.translation!}
          style={{
            fontSize: 10,
            color: mutedColor,
            fontFamily: FONT.amiri,
            textAlign: 'center',
          }}
          maxLines={1}
          truncate="END"
        />
      ) : null}

      {dhikr.count > 0 && (
        <FlexWidget
          style={{
            backgroundColor: badgeBg,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={`${dhikr.count}×`}
            style={{
              fontSize: 12,
              color: accent,
              fontFamily: FONT.amiriBold,
            }}
          />
        </FlexWidget>
      )}

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
