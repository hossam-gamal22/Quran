// components/widgets/android/AzkarProgressMediumWidget.tsx
// 4×2 widget: Morning/Evening progress + random zikr

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { COLORS, GRADIENTS, FONT, BRANDING, APP_ICON, ICON_SIZE } from './shared';

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
        flexDirection: 'column',
        backgroundGradient: GRADIENTS.azkar,
        borderRadius: 20,
        padding: 12,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
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
            text="الأذكار اليومية"
            style={{
              fontSize: 13,
              color: COLORS.tealLight,
              fontFamily: FONT.amiriBold,
              marginLeft: 6,
            }}
          />
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

      {/* Content row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          flex: 1,
          width: 'match_parent',
        }}
      >
        {/* Left: progress */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: 90,
            marginRight: 10,
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: azkar.morningCompleted ? COLORS.badgeBg : COLORS.cardBg,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginBottom: 6,
            }}
          >
            <TextWidget
              text={azkar.morningCompleted ? '✓' : '○'}
              style={{ fontSize: 12, color: azkar.morningCompleted ? COLORS.tealLight : COLORS.grayDark, marginRight: 4 }}
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
              backgroundColor: azkar.eveningCompleted ? COLORS.badgeBg : COLORS.cardBg,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <TextWidget
              text={azkar.eveningCompleted ? '✓' : '○'}
              style={{ fontSize: 12, color: azkar.eveningCompleted ? COLORS.tealLight : COLORS.grayDark, marginRight: 4 }}
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

        {/* Right: random zikr */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <TextWidget
            text={truncatedZikr}
            style={{
              fontSize: 15,
              color: COLORS.white,
              fontFamily: FONT.amiri,
              textAlign: 'right',
            }}
            maxLines={3}
            truncate="END"
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
