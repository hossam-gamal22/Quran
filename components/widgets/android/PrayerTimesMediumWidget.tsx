// components/widgets/android/PrayerTimesMediumWidget.tsx
// 4×2 widget: All 5 prayer times in a row, next highlighted green

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT } from './shared';

export function PrayerTimesMediumWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  // Filter out sunrise — show only 5 obligatory prayers
  const prayers = prayer.allPrayers.filter(p => p.name !== 'Sunrise');

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 10,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 6,
          paddingHorizontal: 4,
        }}
      >
        <TextWidget
          text="🕌 مواقيت الصلاة"
          style={{
            fontSize: 13,
            color: COLORS.green,
            fontFamily: FONT.amiriBold,
          }}
        />
        <TextWidget
          text={prayer.hijriDate}
          style={{
            fontSize: 11,
            color: COLORS.gray,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>

      {/* Prayer times row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          width: 'match_parent',
          flex: 1,
        }}
      >
        {prayers.map((p) => {
          const isNext = p.isNext;
          const isPassed = p.isPassed;
          return (
            <FlexWidget
              key={p.name}
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isNext ? COLORS.green : '#00000000',
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 6,
              }}
            >
              <TextWidget
                text={p.nameAr}
                style={{
                  fontSize: 12,
                  color: isNext ? COLORS.bg : isPassed ? COLORS.grayDark : COLORS.grayLight,
                  fontFamily: FONT.amiriBold,
                }}
              />
              <TextWidget
                text={p.time}
                style={{
                  fontSize: 13,
                  color: isNext ? COLORS.bg : isPassed ? COLORS.grayDark : COLORS.white,
                  fontFamily: FONT.amiri,
                  marginTop: 2,
                }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
    </FlexWidget>
  );
}
