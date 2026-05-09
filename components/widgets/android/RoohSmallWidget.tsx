// components/widgets/android/RoohSmallWidget.tsx
// Glassify-style small Android widget — day number + month. Respects per-type calendar.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT, GLASS, applyNumerals, paletteFor, resolveIsArabic } from './shared';

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function resolveCalendar(pref: string | undefined, isArabic: boolean): 'gregorian' | 'hijri' {
  if (pref === 'gregorian') return 'gregorian';
  if (pref === 'hijri') return 'hijri';
  return isArabic ? 'hijri' : 'gregorian';
}

export function RoohSmallWidget({ data }: { data: SharedWidgetData }) {
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const cal = resolveCalendar(data.widgetDayCalendar ?? data.widgetCalendar, isAr);
  const todayLabel = isAr ? 'اليوم' : 'Today';

  let dayNum: number;
  let month: string;

  if (cal === 'hijri' && data.prayer.hijriDay) {
    dayNum = data.prayer.hijriDay;
    month = isAr
      ? (data.prayer.hijriMonth || 'محرم')
      : (data.prayer.hijriMonthEn || data.prayer.hijriMonth || 'Muharram');
  } else {
    const today = new Date();
    dayNum = today.getDate();
    month = isAr ? MONTHS_AR[today.getMonth()] : MONTHS_EN[today.getMonth()];
  }

  const day = applyNumerals(dayNum, numerals, isAr);

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
      clickActionData={{ uri: 'rooh-almuslim://widget' }}
    >
      <TextWidget text={todayLabel} style={{ fontSize: 18, color: p.muted, fontFamily: FONT.widget }} />
      <TextWidget text={day} style={{ fontSize: 56, color: p.text, fontFamily: FONT.rubikBold, marginTop: 4 }} />
      <TextWidget text={month} style={{ fontSize: 18, color: p.muted, fontFamily: FONT.widget, marginTop: 2 }} />
    </FlexWidget>
  );
}
