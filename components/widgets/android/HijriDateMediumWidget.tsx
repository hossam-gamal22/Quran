// components/widgets/android/HijriDateMediumWidget.tsx
// 4×2 widget: Full Hijri date + Gregorian date + location

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

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
        backgroundGradient: GRADIENTS.hijri,
        borderRadius: 20,
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
          backgroundColor: COLORS.divider,
          marginHorizontal: 10,
        }}
      />

      {/* Right: month + gregorian */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
        <TextWidget
          text="التقويم الهجري"
          style={{
            fontSize: 11,
            color: COLORS.tealLight,
            fontFamily: FONT.amiriBold,
          }}
        />
        <FlexWidget style={{ flexDirection: 'column' }}>
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
              marginTop: 2,
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
