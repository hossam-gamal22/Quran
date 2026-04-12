// components/widgets/android/AzkarProgressMediumWidget.tsx
// 4×2 widget: Morning/Evening progress + random zikr

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, getWidgetTheme, resolveColorScheme } from './shared';

export function AzkarProgressMediumWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;
  const zikrText = azkar.randomZikr?.text || '';
  const truncatedZikr = zikrText.length > 80
    ? zikrText.substring(0, 80) + '…'
    : zikrText;
  const theme = getWidgetTheme(data.settings?.widgetTheme);
  const { colors: sc, gradient } = resolveColorScheme(undefined, 'azkar');

  const useTheme = theme.id !== 'default_dark' && theme.id !== 'default_light';
  const bg = useTheme ? theme.gradient : gradient;
  const textColor = useTheme ? theme.textColor : sc.white;
  const mutedColor = useTheme ? theme.mutedColor : sc.whiteMuted;
  const accent = useTheme ? theme.accentColor : sc.tealLight;
  const grayDarkColor = useTheme ? theme.mutedColor : sc.grayDark;
  const grayLightColor = useTheme ? theme.mutedColor : sc.grayLight;
  const badgeBg = useTheme ? theme.badgeBg : sc.badgeBg;
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
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
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
            text="الأذكار اليومية"
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
        {/* Left: progress */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: 90,
            marginRight: 10,
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: azkar.morningCompleted ? badgeBg : cardBg,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginBottom: 6,
            }}
          >
            <TextWidget
              text={azkar.morningCompleted ? '✓' : '○'}
              style={{ fontSize: 12, color: azkar.morningCompleted ? accent : grayDarkColor, marginRight: 4 }}
            />
            <TextWidget
              text="الصباح"
              style={{
                fontSize: 12,
                color: azkar.morningCompleted ? accent : grayLightColor,
                fontFamily: FONT.amiri,
              }}
            />
          </FlexWidget>
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: azkar.eveningCompleted ? badgeBg : cardBg,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <TextWidget
              text={azkar.eveningCompleted ? '✓' : '○'}
              style={{ fontSize: 12, color: azkar.eveningCompleted ? accent : grayDarkColor, marginRight: 4 }}
            />
            <TextWidget
              text="المساء"
              style={{
                fontSize: 12,
                color: azkar.eveningCompleted ? accent : grayLightColor,
                fontFamily: FONT.amiri,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Divider */}
        <FlexWidget
          style={{
            width: 1,
            height: 'match_parent',
            backgroundColor: dividerColor,
            marginRight: 10,
          }}
        />

        {/* Right: random zikr */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <TextWidget
            text={truncatedZikr}
            style={{
              fontSize: 15,
              color: textColor,
              fontFamily: FONT.amiri,
              textAlign: 'right',
            }}
            maxLines={(data.settings?.azkarWidget?.showTranslation && azkar.randomZikr?.translation) ? 2 : 3}
            truncate="END"
          />
          {(data.settings?.azkarWidget?.showTranslation ?? false) && azkar.randomZikr?.translation ? (
            <TextWidget
              text={azkar.randomZikr.translation}
              style={{
                fontSize: 11,
                color: mutedColor,
                fontFamily: FONT.amiri,
                textAlign: 'right',
                marginTop: 4,
              }}
              maxLines={2}
              truncate="END"
            />
          ) : null}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
