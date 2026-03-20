// components/widgets/android/DailyVerseSmallWidget.tsx
// 2×2 widget: First line of verse + surah name

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT } from './shared';

export function DailyVerseSmallWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;
  // Truncate to ~60 chars for small widget
  const truncated = verse.arabic.length > 60
    ? verse.arabic.substring(0, 60) + '…'
    : verse.arabic;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://daily-ayah' }}
    >
      <TextWidget
        text="📖"
        style={{ fontSize: 20 }}
      />
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
      <TextWidget
        text={verse.surahName}
        style={{
          fontSize: 11,
          color: COLORS.gold,
          fontFamily: FONT.amiri,
          marginTop: 6,
        }}
      />
    </FlexWidget>
  );
}
