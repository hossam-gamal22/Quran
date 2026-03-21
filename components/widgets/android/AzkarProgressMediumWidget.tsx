// components/widgets/android/AzkarProgressMediumWidget.tsx
// 4×2 widget: Morning/Evening progress + random zikr text

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING } from './shared';

export function AzkarProgressMediumWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;
  const zikrText = azkar.randomZikr?.text || '';
  const truncatedZikr = zikrText.length > 80
    ? zikrText.substring(0, 80) + '…'
    : zikrText;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        backgroundGradient: GRADIENTS.azkar,
        borderRadius: 20,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      {/* Left side: progress */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: 90,
          marginRight: 10,
        }}
      >
        <TextWidget
          text="🤲"
          style={{ fontSize: 20, marginBottom: 6 }}
        />
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <TextWidget
            text={azkar.morningCompleted ? '✅' : '○'}
            style={{ fontSize: 12, marginRight: 4 }}
          />
          <TextWidget
            text="الصباح"
            style={{
              fontSize: 12,
              color: azkar.morningCompleted ? COLORS.tealLight : COLORS.grayLight,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={azkar.eveningCompleted ? '✅' : '○'}
            style={{ fontSize: 12, marginRight: 4 }}
          />
          <TextWidget
            text="المساء"
            style={{
              fontSize: 12,
              color: azkar.eveningCompleted ? COLORS.tealLight : COLORS.grayLight,
              fontFamily: FONT.amiri,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{
          width: 1,
          height: 'match_parent',
          backgroundColor: COLORS.divider,
          marginRight: 10,
        }}
      />

      {/* Right side: random zikr */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
        <TextWidget
          text="ذكر عشوائي"
          style={{
            fontSize: 10,
            color: COLORS.tealLight,
            fontFamily: FONT.amiriBold,
            marginBottom: 4,
          }}
        />
        <TextWidget
          text={truncatedZikr}
          style={{
            fontSize: 14,
            color: COLORS.white,
            fontFamily: FONT.amiri,
            textAlign: 'right',
          }}
          maxLines={3}
          truncate="END"
        />
        <TextWidget
          text={BRANDING.name}
          style={{
            fontSize: BRANDING.fontSize,
            color: BRANDING.color,
            fontFamily: FONT.amiri,
            textAlign: 'right',
            marginTop: 2,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
