// components/widgets/android/PrayerTimesMediumWidget.tsx
// 4×2 — [time + countdown] · [icon disc] · [prayer name]. Respects user theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, prayerLabelEn, formatCountdown, paletteFor, applyNumerals } from './shared';

function prayerGlyph(arName: string): string {
  if (arName.includes('فجر')) return '☼';
  if (arName.includes('شروق')) return '☀';
  if (arName.includes('ظهر')) return '☀';
  if (arName.includes('عصر')) return '☼';
  if (arName.includes('مغرب')) return '☾';
  if (arName.includes('عشاء')) return '☾';
  return '☀';
}

export function PrayerTimesMediumWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const arName = prayer.nextPrayerNameAr || 'الظهر';
  const enName = prayerLabelEn(arName);
  const time = applyNumerals(prayer.nextPrayerTime || '—', numerals, isAr);
  const countdown = formatCountdown(prayer.timeRemaining || '', isAr, numerals);
  const glyph = prayerGlyph(arName);

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
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {/* Left — time + countdown */}
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <TextWidget
          text={time}
          style={{ fontSize: 26, color: p.text, fontFamily: FONT.rubikBold }}
        />
        <TextWidget
          text={countdown}
          style={{ fontSize: 12, color: p.muted, fontFamily: FONT.rubik, marginTop: 2 }}
        />
      </FlexWidget>

      {/* Center — icon disc */}
      <FlexWidget
        style={{
          width: 40,
          height: 40,
          backgroundColor: p.surface,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
          marginHorizontal: 10,
        }}
      >
        <TextWidget text={glyph} style={{ fontSize: 18, color: p.text }} />
      </FlexWidget>

      {/* Right — prayer name */}
      <TextWidget
        text={isAr ? arName : enName}
        style={{
          fontSize: isAr ? 28 : 22,
          color: p.text,
          fontFamily: FONT.rubikBold,
        }}
      />
    </FlexWidget>
  );
}
