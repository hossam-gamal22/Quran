// components/widgets/android/PrayerTimesSmallWidget.tsx
// 2×2 — next prayer time + name + countdown. Respects user theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, prayerLabelEn, formatCountdown, paletteFor, applyNumerals } from './shared';

export function PrayerTimesSmallWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const arName = prayer.nextPrayerNameAr || 'الظهر';
  const enName = prayerLabelEn(arName);
  const time = applyNumerals(prayer.nextPrayerTime || '—', numerals, isAr);
  const countdown = formatCountdown(prayer.timeRemaining || '', isAr, numerals);

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
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      <TextWidget
        text={time}
        style={{ fontSize: 30, color: p.text, fontFamily: FONT.rubikBold }}
      />
      <TextWidget
        text={isAr ? arName : enName}
        style={{
          fontSize: isAr ? 22 : 18,
          color: p.text,
          fontFamily: FONT.rubikBold,
          marginTop: 4,
        }}
      />
      <TextWidget
        text={countdown}
        style={{ fontSize: 12, color: p.muted, fontFamily: FONT.rubik, marginTop: 4 }}
      />
    </FlexWidget>
  );
}
