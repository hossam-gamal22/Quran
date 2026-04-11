// components/widgets/android/DailyDhikrMediumWidget.tsx
// 4×2 widget: Full dhikr text + category + count

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING, APP_ICON, ICON_SIZE } from './shared';

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
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ImageWidget
            image={APP_ICON}
            imageWidth={ICON_SIZE.header}
            imageHeight={ICON_SIZE.header}
            radius={6}
          />
          <TextWidget
            text="ذكر اليوم"
            style={{
              fontSize: 13,
              color: COLORS.tealLight,
              fontFamily: FONT.amiriBold,
              marginLeft: 6,
            }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            backgroundColor: COLORS.cardBg,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={dhikr.categoryName}
            style={{
              fontSize: 10,
              color: COLORS.gray,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Dhikr text */}
      <TextWidget
        text={dhikr.arabic}
        style={{
          fontSize: 17,
          color: COLORS.white,
          fontFamily: FONT.amiri,
          textAlign: 'center',
          marginVertical: 4,
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
        }}
      >
        {dhikr.count > 0 ? (
          <FlexWidget
            style={{
              backgroundColor: COLORS.badgeBg,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <TextWidget
              text={`${dhikr.count} ${dhikr.timesLabel || 'مرة'}`}
              style={{
                fontSize: 11,
                color: COLORS.gold,
                fontFamily: FONT.amiri,
              }}
            />
          </FlexWidget>
        ) : (
          <TextWidget text="" style={{ fontSize: 1 }} />
        )}
        <TextWidget
          text={BRANDING.name}
          style={{
            fontSize: BRANDING.fontSize,
            color: COLORS.teal,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
