// components/widgets/android/ritual/PrayerSimple.tsx
// "Prayer Simple" — 2×2 vertical glass card.
// Time on top, stretched prayer name in the middle, "in Xh Ym" below.
// Variant of Compact with reversed time/name order to match the mockup.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT } from '../shared';
import { stretchArabic } from '@/lib/stretch-arabic';
import { RITUAL, formatCountdown, prayerLabel } from './shared';

export function PrayerSimple({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isArabic = (data.language || 'ar') === 'ar';

  const rawName = isArabic ? prayer.nextPrayerNameAr : prayerLabel(prayer.nextPrayerNameAr, false);
  const name = isArabic ? stretchArabic(rawName, 5) : rawName;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: RITUAL.glassBg,
        borderRadius: RITUAL.radius,
        paddingHorizontal: 14,
        paddingVertical: 16,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      <TextWidget
        text={prayer.nextPrayerTime || '--:--'}
        style={{
          fontSize: 26,
          color: RITUAL.text,
          fontFamily: FONT.widget,
        }}
      />
      <TextWidget
        text={name}
        style={{
          fontSize: 22,
          color: RITUAL.text,
          fontFamily: FONT.widget,
          letterSpacing: isArabic ? 0 : 3,
          marginTop: 4,
        }}
      />
      <TextWidget
        text={formatCountdown(prayer.timeRemaining, isArabic)}
        style={{
          fontSize: 12,
          color: RITUAL.textMuted,
          fontFamily: FONT.rubik,
          marginTop: 6,
        }}
      />
    </FlexWidget>
  );
}
