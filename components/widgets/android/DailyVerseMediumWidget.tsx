// components/widgets/android/DailyVerseMediumWidget.tsx
// 4×2 widget: Full verse text + surah name + ayah number

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING, APP_ICON, ICON_SIZE } from './shared';

export function DailyVerseMediumWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundGradient: GRADIENTS.verse,
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
              color: COLORS.tealLight,
              fontFamily: FONT.amiriBold,
              marginLeft: 6,
            }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            backgroundColor: COLORS.badgeBgAlt,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={`${verse.surahName} ﴿${verse.numberInSurah}﴾`}
            style={{
              fontSize: 11,
              color: COLORS.gold,
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
          color: COLORS.white,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginVertical: 6,
        }}
        maxLines={4}
        truncate="END"
      />

      {/* Branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: COLORS.teal,
          fontFamily: FONT.amiri,
          textAlign: 'center',
        }}
      />
    </FlexWidget>
  );
}
