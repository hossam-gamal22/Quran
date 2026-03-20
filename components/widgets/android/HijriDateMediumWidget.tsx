// components/widgets/android/HijriDateMediumWidget.tsx
// 4×2 widget: Full Hijri date + Gregorian date + location

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT } from './shared';

export function HijriDateMediumWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const hijriParts = prayer.hijriDate.split(' ');
  const day = hijriParts[0] || '';
  const monthYear = hijriParts.slice(1).join(' ');

  const today = new Date();
  const gregorian = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        backgroundGradient: {
          from: '#1a1a0a',
          to: '#0a0f0d',
          orientation: 'LEFT_RIGHT',
        },
        borderRadius: 16,
        padding: 14,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://hijri' }}
    >
      {/* Left: large day number */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
        }}
      >
        <TextWidget
          text="🌙"
          style={{ fontSize: 18 }}
        />
        <TextWidget
          text={day}
          style={{
            fontSize: 36,
            color: COLORS.gold,
            fontFamily: FONT.amiriBold,
          }}
        />
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{
          width: 1,
          height: 'match_parent',
          backgroundColor: COLORS.grayDark,
          marginHorizontal: 10,
        }}
      />

      {/* Right: month + gregorian */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <TextWidget
          text="التقويم الهجري"
          style={{
            fontSize: 11,
            color: COLORS.green,
            fontFamily: FONT.amiriBold,
            marginBottom: 4,
          }}
        />
        <TextWidget
          text={monthYear}
          style={{
            fontSize: 16,
            color: COLORS.white,
            fontFamily: FONT.amiriBold,
          }}
        />
        <TextWidget
          text={gregorian}
          style={{
            fontSize: 13,
            color: COLORS.gray,
            fontFamily: FONT.amiri,
            marginTop: 4,
          }}
        />
        {prayer.location ? (
          <TextWidget
            text={`📍 ${prayer.location}`}
            style={{
              fontSize: 10,
              color: COLORS.grayDark,
              fontFamily: FONT.amiri,
              marginTop: 2,
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
