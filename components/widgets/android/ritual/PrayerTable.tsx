// components/widgets/android/ritual/PrayerTable.tsx
// "Prayer Table" — 4×2 horizontal row of all 5 prayers (name on top, time below).
// Current/next prayer highlighted with a subtle pill.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT } from '../shared';
import { RITUAL, prayerLabel } from './shared';

const FIVE_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function PrayerTable({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isArabic = (data.language || 'ar') === 'ar';

  // Filter to the 5 obligatory (drop Sunrise) and keep order
  const items = prayer.allPrayers
    .filter((p) => FIVE_KEYS.includes(p.name))
    .sort((a, b) => FIVE_KEYS.indexOf(a.name) - FIVE_KEYS.indexOf(b.name));

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: RITUAL.glassBg,
        borderRadius: RITUAL.radius,
        paddingHorizontal: 14,
        paddingVertical: 16,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {items.map((p) => {
        const label = isArabic ? p.nameAr : prayerLabel(p.nameAr, false);
        return (
          <FlexWidget
            key={p.name}
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: p.isNext ? RITUAL.highlightBg : '#00000000',
              borderRadius: RITUAL.radiusInner,
              paddingHorizontal: 8,
              paddingVertical: 6,
            }}
          >
            <TextWidget
              text={label}
              style={{
                fontSize: 13,
                color: p.isPassed ? RITUAL.textFaint : RITUAL.text,
                fontFamily: FONT.widget,
              }}
            />
            <TextWidget
              text={p.time}
              style={{
                fontSize: 14,
                color: p.isPassed ? RITUAL.textFaint : RITUAL.textMuted,
                fontFamily: FONT.rubikMedium,
                marginTop: 4,
              }}
            />
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
