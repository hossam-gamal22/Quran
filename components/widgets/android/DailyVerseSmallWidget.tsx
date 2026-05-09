// components/widgets/android/DailyVerseSmallWidget.tsx
// 2×2 — short verse + surah ref. Respects user theme.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, paletteFor, applyNumerals } from './shared';

export function DailyVerseSmallWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const text = (verse.arabic || '').length > 60 ? verse.arabic.substring(0, 60) + '…' : verse.arabic;
  const surah = isAr ? verse.surahName : verse.surahNameEn || verse.surahName;

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
      clickActionData={{ uri: 'rooh-almuslim://daily-ayah' }}
    >
      <TextWidget
        text={text || '…'}
        style={{
          fontSize: 14,
          color: p.text,
          fontFamily: FONT.uthmanic,
          textAlign: 'center',
        }}
        maxLines={4}
        truncate="END"
      />
      <TextWidget
        text={`${surah} • ${applyNumerals(verse.numberInSurah || verse.ayahNumber, numerals, isAr)}`}
        style={{
          fontSize: 11,
          color: p.muted,
          fontFamily: FONT.rubikMedium,
          marginTop: 8,
          textAlign: 'center',
        }}
      />
    </FlexWidget>
  );
}
