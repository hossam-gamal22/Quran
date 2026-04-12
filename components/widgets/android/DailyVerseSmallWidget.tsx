// components/widgets/android/DailyVerseSmallWidget.tsx
// 2×2 widget: Verse preview + surah name

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function DailyVerseSmallWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: schemeColors, gradient } = resolveColorScheme(data.settings?.verseWidget?.colorScheme, 'verse');
  const showTranslation = (data.settings?.verseWidget?.showTranslation ?? false) && !!verse.translation;
  const truncated = verse.arabic.length > 60
    ? verse.arabic.substring(0, 60) + '…'
    : verse.arabic;

  // Premium theme overrides colorScheme
  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const textColor = useTheme ? theme.textColor : schemeColors.white;
  const mutedColor = useTheme ? theme.mutedColor : schemeColors.whiteMuted;
  const badgeBg = useTheme ? theme.badgeBg : schemeColors.badgeBgAlt;
  const badgeText = useTheme ? theme.badgeText : schemeColors.gold;
  const accent = useTheme ? theme.accentColor : COLORS.teal;

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
      clickActionData={{ uri: 'rooh-almuslim://daily-ayah' }}
    >
      {/* App Icon */}
      <ImageWidget
        image={APP_ICON}
        imageWidth={ICON_SIZE.small}
        imageHeight={ICON_SIZE.small}
        radius={7}
      />

      {/* Verse text */}
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
          text={verse.translation!}
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

      {/* Surah badge */}
      <FlexWidget
        style={{
          backgroundColor: badgeBg,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 3,
        }}
      >
        <TextWidget
          text={verse.surahName}
          style={{
            fontSize: 11,
            color: badgeText,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>

      {/* Branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: accent,
          fontFamily: FONT.amiri,
        }}
      />
    </FlexWidget>
  );
}
