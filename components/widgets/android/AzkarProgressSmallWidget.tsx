// components/widgets/android/AzkarProgressSmallWidget.tsx
// 2×2 widget: Morning/Evening azkar completion rings

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, FONT } from './shared';

export function AzkarProgressSmallWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;
  const morningPct = azkar.morningCompleted ? '✅' : '○';
  const eveningPct = azkar.eveningCompleted ? '✅' : '○';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      <TextWidget
        text="🤲 الأذكار"
        style={{
          fontSize: 14,
          color: COLORS.green,
          fontFamily: FONT.amiriBold,
          marginBottom: 8,
        }}
      />

      {/* Morning */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <TextWidget
          text={morningPct}
          style={{ fontSize: 14, marginRight: 6 }}
        />
        <TextWidget
          text="أذكار الصباح"
          style={{
            fontSize: 13,
            color: azkar.morningCompleted ? COLORS.green : COLORS.grayLight,
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
          text={eveningPct}
          style={{ fontSize: 14, marginRight: 6 }}
        />
        <TextWidget
          text="أذكار المساء"
          style={{
            fontSize: 13,
            color: azkar.eveningCompleted ? COLORS.green : COLORS.grayLight,
            fontFamily: FONT.amiri,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
