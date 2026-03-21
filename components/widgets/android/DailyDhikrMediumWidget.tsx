// components/widgets/android/DailyDhikrMediumWidget.tsx
// 4×2 widget: Full dhikr text + source/category

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function DailyDhikrMediumWidget({ data }: { data: SharedWidgetData }) {
  const { dhikr } = data;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundGradient: GRADIENTS.dhikr,
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
        <TextWidget
          text="📿 ذكر اليوم"
          style={{
            fontSize: 12,
            color: COLORS.tealLight,
            fontFamily: FONT.amiriBold,
          }}
        />
        <TextWidget
          text={dhikr.categoryName}
          style={{
            fontSize: 11,
            color: COLORS.gray,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>

      {/* Dhikr text */}
      <TextWidget
        text={dhikr.arabic}
        style={{
          fontSize: 16,
          color: COLORS.white,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginTop: 4,
        }}
        maxLines={3}
        truncate="END"
      />

      {/* Footer: count + branding */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginTop: 4,
        }}
      >
        {dhikr.count > 0 ? (
          <TextWidget
            text={`${dhikr.count} ${dhikr.timesLabel || 'مرة'}`}
            style={{
              fontSize: 11,
              color: COLORS.gold,
              fontFamily: FONT.amiri,
            }}
          />
        ) : (
          <TextWidget text="" style={{ fontSize: 1 }} />
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
    </FlexWidget>
  );
}
