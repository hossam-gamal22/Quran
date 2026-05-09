// components/widgets/android/RoohMediumWidget.tsx
// Glassify-style medium Android widget — next prayer. Respects theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT, GLASS, applyNumerals, formatCountdown, paletteFor, prayerLabelEn, resolveIsArabic } from './shared';

export function RoohMediumWidget({ data }: { data: SharedWidgetData }) {
  const prayer = data.prayer;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const labelAr = prayer.nextPrayerNameAr || 'الفجر';
  const label = isAr ? labelAr : prayerLabelEn(labelAr);
  const time = applyNumerals(prayer.nextPrayerTime || '--:--', numerals, isAr);

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
      clickActionData={{ uri: 'rooh-almuslim://widget' }}
    >
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <TextWidget text={time} style={{ fontSize: 34, color: p.text, fontFamily: FONT.rubikBold }} />
        <TextWidget text={formatCountdown(prayer.timeRemaining, isAr, numerals)} style={{ fontSize: 14, color: p.muted, fontFamily: FONT.rubik, marginTop: 2 }} />
      </FlexWidget>
      <TextWidget text={label} style={{ fontSize: 32, color: p.text, fontFamily: FONT.rubikBold }} />
    </FlexWidget>
  );
}
