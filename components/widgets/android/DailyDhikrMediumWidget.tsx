// components/widgets/android/DailyDhikrMediumWidget.tsx
// 4×2 widget: Full dhikr text + source/category

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT } from './shared';

export function DailyDhikrMediumWidget({ data }: { data: SharedWidgetData }) {
  const { dhikr } = data;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundGradient: {
          from: '#0a1a14',
          to: '#0a0f0d',
          orientation: 'LEFT_RIGHT',
        },
        borderRadius: 16,
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
          marginBottom: 6,
        }}
      >
        <TextWidget
          text="📿 ذكر اليوم"
          style={{
            fontSize: 12,
            color: COLORS.green,
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
          marginTop: 2,
        }}
        maxLines={3}
        truncate="END"
      />

      {/* Footer: count + benefit */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginTop: 6,
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
        {dhikr.benefit ? (
          <TextWidget
            text={dhikr.benefit}
            style={{
              fontSize: 10,
              color: COLORS.gray,
              fontFamily: FONT.amiri,
            }}
            maxLines={1}
            truncate="END"
          />
        ) : (
          <TextWidget text="" style={{ fontSize: 1 }} />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
