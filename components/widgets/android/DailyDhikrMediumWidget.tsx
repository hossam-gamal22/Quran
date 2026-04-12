// components/widgets/android/DailyDhikrMediumWidget.tsx
// 4×2 widget: Full dhikr text + category + count

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function DailyDhikrMediumWidget({ data }: { data: SharedWidgetData }) {
  const { dhikr } = data;
  const showBenefit = (data.settings?.dhikrWidget?.showBenefit ?? true);
  const showTranslation = (data.settings?.dhikrWidget?.showTranslation ?? false);
  const showExtra = (showBenefit && dhikr.benefit) || (showTranslation && dhikr.translation);
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(undefined, 'dhikr');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const textColor = useTheme ? theme.textColor : sc.white;
  const mutedColor = useTheme ? theme.mutedColor : sc.whiteMuted;
  const accent = useTheme ? theme.accentColor : sc.tealLight;
  const grayColor = useTheme ? theme.mutedColor : sc.gray;
  const cardBg = useTheme ? theme.badgeBg : sc.cardBg;
  const badgeBg = useTheme ? theme.badgeBg : sc.badgeBg;
  const badgeText = useTheme ? theme.badgeText : sc.gold;
  const brandColor = useTheme ? theme.accentColor : sc.teal;

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
      clickActionData={{ uri: 'rooh-almuslim://daily-dhikr' }}
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
            text="ذكر اليوم"
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
            backgroundColor: cardBg,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={dhikr.categoryName}
            style={{
              fontSize: 10,
              color: grayColor,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Dhikr text */}
      <TextWidget
        text={dhikr.arabic}
        style={{
          fontSize: 17,
          color: textColor,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginVertical: 4,
        }}
        maxLines={showExtra ? 2 : 3}
        truncate="END"
      />

      {/* Benefit */}
      {showBenefit && dhikr.benefit ? (
        <TextWidget
          text={dhikr.benefit}
          style={{
            fontSize: 11,
            color: mutedColor,
            fontFamily: FONT.amiri,
            textAlign: 'center',
          }}
          maxLines={1}
          truncate="END"
        />
      ) : null}

      {/* Translation */}
      {showTranslation && dhikr.translation ? (
        <TextWidget
          text={dhikr.translation}
          style={{
            fontSize: 11,
            color: mutedColor,
            fontFamily: FONT.amiri,
            textAlign: 'center',
          }}
          maxLines={1}
          truncate="END"
        />
      ) : null}

      {/* Footer: count + branding */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {dhikr.count > 0 ? (
          <FlexWidget
            style={{
              backgroundColor: badgeBg,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <TextWidget
              text={`${dhikr.count} ${dhikr.timesLabel || 'مرة'}`}
              style={{
                fontSize: 11,
                color: badgeText,
                fontFamily: FONT.amiri,
              }}
            />
          </FlexWidget>
        ) : (
          <TextWidget text="" style={{ fontSize: 1 }} />
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
    </FlexWidget>
  );
}
