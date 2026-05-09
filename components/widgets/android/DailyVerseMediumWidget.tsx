// components/widgets/android/DailyVerseMediumWidget.tsx
// 4×2 — full verse + surah ref + (optional translation when non-Arabic). Respects user theme.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, paletteFor, applyNumerals } from './shared';

export function DailyVerseMediumWidget({ data }: { data: SharedWidgetData }) {
  const { verse } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const surah = isAr ? verse.surahName : verse.surahNameEn || verse.surahName;
  const showTranslation = !isAr && !!verse.translation;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: p.bg,
        borderRadius: GLASS.radius,
        padding: GLASS.padding,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://daily-ayah' }}
    >
      <TextWidget
        text={verse.arabic || '…'}
        style={{
          fontSize: 16,
          color: p.text,
          fontFamily: FONT.uthmanic,
          textAlign: 'right',
        }}
        maxLines={showTranslation ? 2 : 4}
        truncate="END"
      />
      {showTranslation ? (
        <TextWidget
          text={verse.translation || ''}
          style={{
            fontSize: 11,
            color: p.muted,
            fontFamily: FONT.rubik,
            textAlign: 'left',
            marginTop: 4,
          }}
          maxLines={2}
          truncate="END"
        />
      ) : null}
      <TextWidget
        text={`${surah} • ${applyNumerals(verse.numberInSurah || verse.ayahNumber, numerals, isAr)}`}
        style={{
          fontSize: 12,
          color: p.muted,
          fontFamily: FONT.rubikMedium,
          marginTop: 6,
          textAlign: 'right',
        }}
      />
    </FlexWidget>
  );
}
