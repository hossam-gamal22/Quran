// components/widgets/android/AzkarProgressSmallWidget.tsx
// 2×2 widget: Morning/Evening azkar completion

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function AzkarProgressSmallWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;
  const morningIcon = azkar.morningCompleted ? '✅' : '○';
  const eveningIcon = azkar.eveningCompleted ? '✅' : '○';

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
      <TextWidget
        text="🤲 الأذكار"
        style={{
          fontSize: 14,
          color: COLORS.tealLight,
          fontFamily: FONT.amiriBold,
        }}
      />

      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
        {/* Morning */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 6,
          }}
        >
          <TextWidget
            text={morningIcon}
            style={{ fontSize: 14, marginRight: 6 }}
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
          }}
        >
          <TextWidget
            text={eveningIcon}
            style={{ fontSize: 14, marginRight: 6 }}
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
          color: BRANDING.color,
          fontFamily: FONT.amiri,
        }}
      />
    </FlexWidget>
  );
}
