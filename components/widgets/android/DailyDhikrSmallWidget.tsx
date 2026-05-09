// components/widgets/android/DailyDhikrSmallWidget.tsx
// 2×2 — dhikr text + count. Respects user theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, paletteFor, applyNumerals, AZKAR_FONT_FAMILY } from './shared';

export function DailyDhikrSmallWidget({ data }: { data: SharedWidgetData }) {
  const { dhikr } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const text = (dhikr.arabic || '').length > 50 ? dhikr.arabic.substring(0, 50) + '…' : dhikr.arabic;

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
      clickActionData={{ uri: 'rooh-almuslim://daily-dhikr' }}
    >
      <TextWidget
        text={text || '…'}
        style={{ fontSize: 14, color: p.text, fontFamily: AZKAR_FONT_FAMILY, textAlign: 'center' }}
        maxLines={3}
        truncate="END"
      />
      {!isAr && dhikr.translation ? (
        <TextWidget
          text={dhikr.translation}
          style={{ fontSize: 10, color: p.muted, fontFamily: FONT.rubik, textAlign: 'center', marginTop: 4 }}
          maxLines={2}
          truncate="END"
        />
      ) : null}
      {dhikr.count > 1 ? (
        <TextWidget
          text={`${applyNumerals(dhikr.count, numerals, isAr)}× ${dhikr.timesLabel || ''}`}
          style={{ fontSize: 11, color: p.muted, fontFamily: FONT.rubikMedium, marginTop: 6 }}
        />
      ) : null}
    </FlexWidget>
  );
}
