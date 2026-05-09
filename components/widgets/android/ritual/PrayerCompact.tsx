// components/widgets/android/ritual/PrayerCompact.tsx
// "Prayer Compact" — 2×2 vertical glass card.
// Stretched prayer name on top, big time in the middle, "in Xh Ym" below.
// (The mockup also shows a circular ring around it; rendering a real ring
//  inside RemoteViews is impossible — we approximate with a thick rounded
//  border which Android's BackgroundDrawable supports.)

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT } from '../shared';
import { stretchArabic } from '@/lib/stretch-arabic';
import { RITUAL, formatCountdown, prayerLabel } from './shared';

export function PrayerCompact({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isArabic = (data.language || 'ar') === 'ar';

  const rawName = isArabic ? prayer.nextPrayerNameAr : prayerLabel(prayer.nextPrayerNameAr, false);
  const name = isArabic ? stretchArabic(rawName, 3) : rawName;

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
        text={name}
        style={{
          fontSize: 16,
          color: RITUAL.text,
          fontFamily: FONT.widget,
          letterSpacing: isArabic ? 0 : 2,
        }}
      />
      <TextWidget
        text={prayer.nextPrayerTime || '--:--'}
        style={{
          fontSize: 30,
          color: RITUAL.text,
          fontFamily: FONT.widget,
          marginTop: 6,
        }}
      />
      <TextWidget
        text={formatCountdown(prayer.timeRemaining, isArabic)}
        style={{
          fontSize: 12,
          color: RITUAL.textMuted,
          fontFamily: FONT.rubik,
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
