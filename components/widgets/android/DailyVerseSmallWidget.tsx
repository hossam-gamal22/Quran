// components/widgets/android/DailyVerseSmallWidget.tsx
// 2×2 widget: Verse preview + surah name

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING, APP_ICON, ICON_SIZE } from './shared';

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
          color: COLORS.white,
          fontFamily: FONT.amiri,
          textAlign: 'center',
        }}
        maxLines={3}
        truncate="END"
      />

      {/* Surah badge */}
      <FlexWidget
        style={{
          backgroundColor: COLORS.badgeBgAlt,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 3,
        }}
      >
        <TextWidget
          text={verse.surahName}
          style={{
            fontSize: 11,
            color: COLORS.gold,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>

      {/* Branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: COLORS.teal,
          fontFamily: FONT.amiri,
        }}
      />
    </FlexWidget>
  );
}
