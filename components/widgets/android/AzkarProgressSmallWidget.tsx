// components/widgets/android/AzkarProgressSmallWidget.tsx
// 2×2 widget: Morning/Evening azkar completion tracker

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING, APP_ICON, ICON_SIZE } from './shared';

export function AzkarProgressSmallWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: GRADIENTS.azkar,
        borderRadius: 20,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      <ImageWidget
        image={APP_ICON}
        imageWidth={ICON_SIZE.small}
        imageHeight={ICON_SIZE.small}
        radius={7}
      />

      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center', width: 'match_parent' }}>
        {/* Morning */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: azkar.morningCompleted ? COLORS.badgeBg : COLORS.cardBg,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginBottom: 6,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={azkar.morningCompleted ? '✓' : '○'}
            style={{
              fontSize: 14,
              color: azkar.morningCompleted ? COLORS.tealLight : COLORS.grayDark,
              marginRight: 6,
            }}
          />
          <TextWidget
            text="أذكار الصباح"
            style={{
              fontSize: 13,
              color: azkar.morningCompleted ? COLORS.tealLight : COLORS.grayLight,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>

        {/* Evening */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: azkar.eveningCompleted ? COLORS.badgeBg : COLORS.cardBg,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 5,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={azkar.eveningCompleted ? '✓' : '○'}
            style={{
              fontSize: 14,
              color: azkar.eveningCompleted ? COLORS.tealLight : COLORS.grayDark,
              marginRight: 6,
            }}
          />
          <TextWidget
            text="أذكار المساء"
            style={{
              fontSize: 13,
              color: azkar.eveningCompleted ? COLORS.tealLight : COLORS.grayLight,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>
      </FlexWidget>

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
