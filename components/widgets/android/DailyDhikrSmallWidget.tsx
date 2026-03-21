// components/widgets/android/DailyDhikrSmallWidget.tsx
// 2×2 widget: Dhikr text (truncated)

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function DailyDhikrSmallWidget({ data }: { data: SharedWidgetData }) {
  const { dhikr } = data;
  const truncated = dhikr.arabic.length > 50
    ? dhikr.arabic.substring(0, 50) + '…'
    : dhikr.arabic;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: GRADIENTS.dhikr,
        borderRadius: 20,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://daily-dhikr' }}
    >
      <TextWidget
        text="📿"
        style={{ fontSize: 22 }}
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
      {dhikr.count > 0 && (
        <TextWidget
          text={`${dhikr.count}×`}
          style={{
            fontSize: 12,
            color: COLORS.tealLight,
            fontFamily: FONT.amiriBold,
            marginTop: 2,
          }}
        />
      )}
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
