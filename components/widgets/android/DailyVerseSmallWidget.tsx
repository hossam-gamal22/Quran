// components/widgets/android/DailyVerseSmallWidget.tsx
// 2×2 widget: First line of verse + surah name

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function DailyVerseSmallWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;
  const truncated = verse.arabic.length > 60
    ? verse.arabic.substring(0, 60) + '…'
    : verse.arabic;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: GRADIENTS.verse,
        borderRadius: 20,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://daily-ayah' }}
    >
      {/* Icon */}
      <TextWidget
        text="📖"
        style={{ fontSize: 22 }}
      />

      {/* Verse text */}
      <TextWidget
        text={truncated}
        style={{
          fontSize: 14,
          color: COLORS.white,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginTop: 4,
        }}
        maxLines={3}
        truncate="END"
      />

      {/* Surah name */}
      <TextWidget
        text={verse.surahName}
        style={{
          fontSize: 11,
          color: COLORS.gold,
          fontFamily: FONT.amiri,
          marginTop: 4,
        }}
      />

      {/* Branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: BRANDING.color,
          fontFamily: FONT.amiri,
        }}
      />
    </FlexWidget>
  );
}
