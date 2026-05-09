// components/widgets/android/RoohLargeWidget.tsx
// Glassify-style large Android widget — prayer table. Respects theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT, GLASS, applyNumerals, paletteFor, prayerLabelEn, resolveIsArabic } from './shared';

const ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function RoohLargeWidget({ data }: { data: SharedWidgetData }) {
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const prayers = (data.prayer.allPrayers || [])
    .filter(item => ORDER.includes(item.name))
    .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
  const heading = isAr ? 'جدول مواقيت الصلاة' : 'Prayer Times';
  const highlightBg = p.isLight ? '#19000000' : '#1FFFFFFF';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: p.bg,
        borderRadius: GLASS.radius,
        padding: GLASS.padding,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://widget' }}
    >
      <TextWidget
        text={heading}
        style={{ fontSize: 16, color: p.text, fontFamily: FONT.widget, marginBottom: 8, textAlign: isAr ? 'right' : 'left' }}
      />
      {prayers.map(item => (
        <FlexWidget
          key={item.name}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: item.isNext ? highlightBg : '#00000000',
            borderRadius: GLASS.radiusInner,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginBottom: 2,
          }}
        >
          <TextWidget
            text={applyNumerals(item.time || '--:--', numerals, isAr)}
            style={{ fontSize: 16, color: item.isNext ? p.text : p.muted, fontFamily: FONT.rubikBold }}
          />
          <TextWidget
            text={isAr ? (item.nameAr || item.name) : (item.name || prayerLabelEn(item.nameAr || ''))}
            style={{ fontSize: 16, color: item.isNext ? p.text : p.muted, fontFamily: FONT.rubikBold }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
