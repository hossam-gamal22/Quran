// components/widgets/android/AzkarProgressMediumWidget.tsx
// 4×2 — morning/evening progress chips + zikr text. Respects user theme.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, paletteFor, AZKAR_FONT_FAMILY } from './shared';

export function AzkarProgressMediumWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const zikrText = azkar.randomZikr?.text || '';
  const truncated = zikrText.length > 90 ? zikrText.substring(0, 90) + '…' : zikrText;
  const translation = azkar.randomZikr?.translation;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        backgroundColor: p.bg,
        borderRadius: GLASS.radius,
        padding: GLASS.padding,
        alignItems: 'center',
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      {/* Left — progress chips */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: 90,
          marginRight: 12,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: p.surface,
            borderRadius: GLASS.radiusInner,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginBottom: 6,
          }}
        >
          <TextWidget
            text={azkar.morningCompleted ? '✓' : '○'}
            style={{ fontSize: 12, color: p.text, marginRight: 6 }}
          />
          <TextWidget
            text={isAr ? 'الصباح' : 'Morning'}
            style={{ fontSize: 12, color: p.text, fontFamily: FONT.widget }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: p.surface,
            borderRadius: GLASS.radiusInner,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <TextWidget
            text={azkar.eveningCompleted ? '✓' : '○'}
            style={{ fontSize: 12, color: p.text, marginRight: 6 }}
          />
          <TextWidget
            text={isAr ? 'المساء' : 'Evening'}
            style={{ fontSize: 12, color: p.text, fontFamily: FONT.widget }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Right — random zikr */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <TextWidget
          text={truncated}
          style={{
            fontSize: 15,
            color: p.text,
            fontFamily: AZKAR_FONT_FAMILY,
            textAlign: 'right',
          }}
          maxLines={!isAr && translation ? 2 : 3}
          truncate="END"
        />
        {!isAr && translation ? (
          <TextWidget
            text={translation}
            style={{
              fontSize: 11,
              color: p.muted,
              fontFamily: FONT.rubik,
              textAlign: 'right',
              marginTop: 4,
            }}
            maxLines={2}
            truncate="END"
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
