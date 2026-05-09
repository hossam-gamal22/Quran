// components/widgets/android/HijriDateMediumWidget.tsx
// 4×2 — Date display: primary + secondary line. Respects per-type monthCalendar.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, paletteFor, applyNumerals, widgetFontFamily } from './shared';

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function resolveCalendar(pref: string | undefined, isArabic: boolean): 'gregorian' | 'hijri' {
  if (pref === 'gregorian') return 'gregorian';
  if (pref === 'hijri') return 'hijri';
  return isArabic ? 'hijri' : 'gregorian';
}

export function HijriDateMediumWidget({ data }: { data: SharedWidgetData }) {
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const cal = resolveCalendar(data.widgetMonthCalendar ?? data.widgetCalendar, isAr);
  const family = widgetFontFamily(data.widgetFontVariant);
  const faintColor = p.isLight ? '#99000000' : '#80FFFFFF';

  let dayStr: string;
  let monthStr: string;
  let yearStr: string;
  let secondaryLine: string;

  if (cal === 'hijri') {
    const day = data.prayer.hijriDay || 1;
    const monthAr = data.prayer.hijriMonth || 'محرم';
    const monthEn = data.prayer.hijriMonthEn || '';
    dayStr = applyNumerals(day, numerals, isAr);
    monthStr = isAr ? monthAr : monthEn || monthAr;
    yearStr = `${applyNumerals(data.prayer.hijriYear || 1446, numerals, isAr)} ${isAr ? 'هـ' : 'AH'}`;
    secondaryLine = data.prayer.gregorianDate || '';
  } else {
    const today = new Date();
    dayStr = applyNumerals(today.getDate(), numerals, isAr);
    monthStr = isAr ? MONTHS_AR[today.getMonth()] : MONTHS_EN[today.getMonth()];
    yearStr = `${applyNumerals(today.getFullYear(), numerals, isAr)} ${isAr ? 'م' : ''}`.trim();
    const hijriDay = data.prayer.hijriDay || 1;
    const hijriMonthAr = data.prayer.hijriMonth || '';
    const hijriYear = data.prayer.hijriYear || 1446;
    secondaryLine = hijriMonthAr
      ? `${applyNumerals(hijriDay, numerals, isAr)} ${hijriMonthAr} ${applyNumerals(hijriYear, numerals, isAr)} ${isAr ? 'هـ' : 'AH'}`
      : '';
  }

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
      clickActionData={{ uri: 'rooh-almuslim://hijri' }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <TextWidget
          text={monthStr}
          style={{ fontSize: 30, color: p.text, fontFamily: family, marginRight: 10 }}
        />
        <TextWidget
          text={dayStr}
          style={{ fontSize: 44, color: p.text, fontFamily: family }}
        />
      </FlexWidget>
      <TextWidget
        text={yearStr}
        style={{ fontSize: 13, color: p.muted, fontFamily: FONT.rubikMedium, marginTop: 4 }}
      />
      {secondaryLine ? (
        <TextWidget
          text={secondaryLine}
          style={{ fontSize: 12, color: faintColor, fontFamily: FONT.rubik, marginTop: 4 }}
        />
      ) : null}
    </FlexWidget>
  );
}
