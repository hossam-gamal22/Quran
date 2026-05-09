// components/widgets/android/PrayerTimesLargeWidget.tsx
// 4×4 — header card (next prayer) + full 6-prayer list. Respects user theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, prayerLabelEn, formatCountdown, paletteFor, applyNumerals } from './shared';

const ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function PrayerTimesLargeWidget({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const arName = prayer.nextPrayerNameAr || 'الظهر';
  const enName = prayerLabelEn(arName);
  const time = applyNumerals(prayer.nextPrayerTime || '—', numerals, isAr);
  const countdown = formatCountdown(prayer.timeRemaining || '', isAr, numerals);
  const headline = isAr
    ? `الصلاة القادمة ${countdown}`
    : `Next prayer ${countdown}`;

  const items = (prayer.allPrayers || [])
    .filter((pp) => ORDER.includes(pp.name))
    .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));

  const highlightBg = p.isLight ? '#19000000' : '#1FFFFFFF';
  const faintColor = p.isLight ? '#99000000' : '#80FFFFFF';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#00000000',
        padding: 6,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {/* Header card */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          backgroundColor: p.bg,
          borderRadius: GLASS.radius,
          paddingHorizontal: 18,
          paddingVertical: 14,
          marginBottom: 8,
        }}
      >
        <TextWidget text="☀" style={{ fontSize: 28, color: p.muted, marginRight: 12 }} />
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end', flex: 1 }}>
          <TextWidget
            text={isAr ? arName : enName}
            style={{ fontSize: 16, color: p.text, fontFamily: FONT.rubikBold }}
          />
          <TextWidget
            text={time}
            style={{ fontSize: 32, color: p.text, fontFamily: FONT.rubikBold, marginTop: 2 }}
          />
          <TextWidget
            text={headline}
            style={{ fontSize: 12, color: p.muted, fontFamily: FONT.rubik, marginTop: 4 }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* List card — all prayers */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          flexDirection: 'column',
          backgroundColor: p.bg,
          borderRadius: GLASS.radius,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        {items.map((pp) => {
          const dim = pp.isPassed && !pp.isNext;
          const labelAr = pp.nameAr;
          const labelEn = prayerLabelEn(labelAr);
          const pTime = applyNumerals(pp.time, numerals, isAr);
          return (
            <FlexWidget
              key={pp.name}
              style={{
                width: 'match_parent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: pp.isNext ? highlightBg : '#00000000',
                borderRadius: GLASS.radiusInner,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginVertical: 1,
              }}
            >
              <TextWidget
                text={pTime}
                style={{
                  fontSize: 14,
                  color: dim ? faintColor : p.text,
                  fontFamily: FONT.rubikBold,
                }}
              />
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextWidget
                  text={isAr ? labelAr : labelEn}
                  style={{
                    fontSize: 14,
                    color: dim ? faintColor : p.text,
                    fontFamily: FONT.rubikBold,
                  }}
                />
                {!isAr ? (
                  <TextWidget
                    text={`  ${labelAr}`}
                    style={{
                      fontSize: 11,
                      color: dim ? faintColor : p.muted,
                      fontFamily: FONT.rubik,
                    }}
                  />
                ) : null}
              </FlexWidget>
            </FlexWidget>
          );
        })}
      </FlexWidget>
    </FlexWidget>
  );
}
