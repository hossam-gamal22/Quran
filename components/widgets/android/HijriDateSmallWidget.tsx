// components/widgets/android/HijriDateSmallWidget.tsx
// 2×2 — Date display: Hijri or Gregorian based on user's monthCalendar setting.

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

export function HijriDateSmallWidget({ data }: { data: SharedWidgetData }) {
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const cal = resolveCalendar(data.widgetMonthCalendar ?? data.widgetCalendar, isAr);
  const family = widgetFontFamily(data.widgetFontVariant);

  let dayStr: string;
  let monthStr: string;
  let yearStr: string;

  if (cal === 'hijri') {
    const day = data.prayer.hijriDay || 1;
    const monthAr = data.prayer.hijriMonth || 'محرم';
    const monthEn = data.prayer.hijriMonthEn || '';
    dayStr = applyNumerals(day, numerals, isAr);
    monthStr = isAr ? monthAr : monthEn || monthAr;
    yearStr = `${applyNumerals(data.prayer.hijriYear || 1446, numerals, isAr)} ${isAr ? 'هـ' : 'AH'}`;
  } else {
    const today = new Date();
    dayStr = applyNumerals(today.getDate(), numerals, isAr);
    monthStr = isAr ? MONTHS_AR[today.getMonth()] : MONTHS_EN[today.getMonth()];
    yearStr = `${applyNumerals(today.getFullYear(), numerals, isAr)} ${isAr ? 'م' : ''}`.trim();
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
          style={{ fontSize: 26, color: p.text, fontFamily: family, marginRight: 8 }}
        />
        <TextWidget
          text={dayStr}
          style={{ fontSize: 36, color: p.text, fontFamily: family }}
        />
      </FlexWidget>
      <TextWidget
        text={yearStr}
        style={{ fontSize: 12, color: p.muted, fontFamily: FONT.rubik, marginTop: 6 }}
      />
    </FlexWidget>
  );
}
