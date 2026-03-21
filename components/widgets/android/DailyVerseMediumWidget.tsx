// components/widgets/android/DailyVerseMediumWidget.tsx
// 4×2 widget: Full verse text + surah name + ayah number

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

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
      clickActionData={{ uri: `rooh-almuslim://surah/${verse.ayahNumber}` }}
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
        <TextWidget
          text="📖 آية اليوم"
          style={{
            fontSize: 12,
            color: COLORS.tealLight,
            fontFamily: FONT.amiriBold,
          }}
        />
        <TextWidget
          text={`${verse.surahName} ﴿${verse.numberInSurah}﴾`}
          style={{
            fontSize: 11,
            color: COLORS.gold,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>

      {/* Verse text */}
      <TextWidget
        text={verse.arabic}
        style={{
          fontSize: 16,
          color: COLORS.white,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginTop: 6,
        }}
        maxLines={4}
        truncate="END"
      />

      {/* Branding footer */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: BRANDING.color,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
