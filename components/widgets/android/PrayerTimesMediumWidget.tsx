// components/widgets/android/PrayerTimesMediumWidget.tsx
// 4×2 widget: All 5 prayer times in a row, next highlighted

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function PrayerTimesMediumWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const prayers = prayer.allPrayers.filter(p => p.name !== 'Sunrise');

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundGradient: GRADIENTS.prayer,
        borderRadius: 20,
        padding: 12,
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
          marginBottom: 8,
          paddingHorizontal: 4,
        }}
      >
        <TextWidget
          text="🕌 مواقيت الصلاة"
          style={{
            fontSize: 13,
            color: COLORS.tealLight,
            fontFamily: FONT.amiriBold,
          }}
        />
        <TextWidget
          text={BRANDING.name}
          style={{
            fontSize: BRANDING.fontSize,
            color: BRANDING.color,
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
                backgroundColor: isNext ? COLORS.teal : '#00000000',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 6,
              }}
            >
              <TextWidget
                text={p.nameAr}
                style={{
                  fontSize: 12,
                  color: isNext ? COLORS.white : isPassed ? COLORS.grayDark : COLORS.grayLight,
                  fontFamily: FONT.amiriBold,
                }}
              />
              <TextWidget
                text={p.time}
                style={{
                  fontSize: 13,
                  color: isNext ? COLORS.white : isPassed ? COLORS.grayDark : COLORS.whiteAlt,
                  fontFamily: FONT.amiri,
                  marginTop: 2,
                }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>

      {/* Hijri date footer */}
      <TextWidget
        text={prayer.hijriDate}
        style={{
          fontSize: 10,
          color: COLORS.gray,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
