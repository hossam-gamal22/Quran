// components/widgets/android/AzkarProgressSmallWidget.tsx
// 2×2 — random dhikr text + count. Respects user theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, paletteFor, applyNumerals, AZKAR_FONT_FAMILY } from './shared';

export function AzkarProgressSmallWidget({ data }: { data: SharedWidgetData }) {
  const { azkar } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const zikrText = azkar.randomZikr?.text || '';
  const truncated = zikrText.length > 40 ? zikrText.substring(0, 40) + '…' : zikrText;
  const translation = azkar.randomZikr?.translation;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: p.bg,
        borderRadius: GLASS.radius,
        padding: GLASS.padding,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://azkar' }}
    >
      <TextWidget
        text={truncated}
        style={{ fontSize: 14, color: p.text, fontFamily: AZKAR_FONT_FAMILY, textAlign: 'center' }}
        maxLines={3}
        truncate="END"
      />
      {!isAr && translation ? (
        <TextWidget
          text={translation}
          style={{ fontSize: 10, color: p.muted, fontFamily: FONT.rubik, textAlign: 'center', marginTop: 4 }}
          maxLines={2}
          truncate="END"
        />
      ) : null}
      {(azkar.randomZikr?.count ?? 1) > 1 ? (
        <TextWidget
          text={`${applyNumerals(azkar.randomZikr?.count ?? 1, numerals, isAr)}× ${azkar.randomZikr?.timesLabel || ''}`}
          style={{ fontSize: 11, color: p.muted, fontFamily: FONT.rubikMedium, marginTop: 6 }}
        />
      ) : null}
    </FlexWidget>
  );
}
