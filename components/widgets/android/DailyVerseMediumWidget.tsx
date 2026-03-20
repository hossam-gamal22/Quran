// components/widgets/android/DailyVerseMediumWidget.tsx
// 4×2 widget: Full verse text + surah name + ayah number

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT } from './shared';

export function DailyVerseMediumWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundGradient: {
          from: '#0a1628',
          to: '#0a1a20',
          orientation: 'LEFT_RIGHT',
        },
        borderRadius: 16,
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
          marginBottom: 6,
        }}
      >
        <TextWidget
          text="📖 آية اليوم"
          style={{
            fontSize: 12,
            color: COLORS.green,
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
          marginTop: 4,
        }}
        maxLines={4}
        truncate="END"
      />
    </FlexWidget>
  );
}
