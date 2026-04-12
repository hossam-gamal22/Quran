// components/widgets/android/DailyVerseMediumWidget.tsx
// 4×2 widget: Full verse text + surah name + ayah number

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function DailyVerseMediumWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: schemeColors, gradient } = resolveColorScheme(data.settings?.verseWidget?.colorScheme, 'verse');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const textColor = useTheme ? theme.textColor : schemeColors.white;
  const mutedColor = useTheme ? theme.mutedColor : schemeColors.whiteMuted;
  const badgeBg = useTheme ? theme.badgeBg : schemeColors.badgeBgAlt;
  const badgeText = useTheme ? theme.badgeText : schemeColors.gold;
  const accent = useTheme ? theme.accentColor : schemeColors.tealLight;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundGradient: bg,
        borderRadius: 20,
        padding: 14,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://daily-ayah' }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
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
            text="آية اليوم"
            style={{
              fontSize: 13,
              color: accent,
              fontFamily: FONT.amiriBold,
              marginLeft: 6,
            }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            backgroundColor: badgeBg,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={`${verse.surahName} ﴿${verse.numberInSurah}﴾`}
            style={{
              fontSize: 11,
              color: badgeText,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Verse text */}
      <TextWidget
        text={verse.arabic}
        style={{
          fontSize: 17,
          color: textColor,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginVertical: 6,
        }}
        maxLines={(data.settings?.verseWidget?.showTranslation && verse.translation) ? 3 : 4}
        truncate="END"
      />

      {/* Translation */}
      {(data.settings?.verseWidget?.showTranslation ?? false) && verse.translation ? (
        <TextWidget
          text={verse.translation}
          style={{
            fontSize: 11,
            color: mutedColor,
            fontFamily: FONT.amiri,
            textAlign: 'center',
          }}
          maxLines={2}
          truncate="END"
        />
      ) : null}

      {/* Branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: accent,
          fontFamily: FONT.amiri,
          textAlign: 'center',
        }}
      />
    </FlexWidget>
  );
}
