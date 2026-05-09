// components/widgets/android/ritual/PrayerPair.tsx
// "Prayer Pair" — 4×2 horizontal glass card.
// Big time (left)  •  glyph circle (center)  •  stretched prayer name (right).
// Mirrors the "Prayer Pair" mockup from Ritual design.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT } from '../shared';
import { stretchArabic } from '@/lib/stretch-arabic';
import { RITUAL, formatCountdown, prayerGlyph, prayerLabel } from './shared';

export function PrayerPair({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isArabic = (data.language || 'ar') === 'ar';

  const rawName = isArabic ? prayer.nextPrayerNameAr : prayerLabel(prayer.nextPrayerNameAr, false);
  const stretchedName = isArabic ? stretchArabic(rawName, 5) : rawName;
  const glyph = prayerGlyph(prayer.nextPrayer);
  const countdown = formatCountdown(prayer.timeRemaining, isArabic);

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
        paddingHorizontal: 22,
        paddingVertical: 16,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {/* LEFT: time + countdown */}
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <TextWidget
          text={prayer.nextPrayerTime || '--:--'}
          style={{
            fontSize: 32,
            color: RITUAL.text,
            fontFamily: FONT.widget,
          }}
        />
        <TextWidget
          text={countdown}
          style={{
            fontSize: 13,
            color: RITUAL.textMuted,
            fontFamily: FONT.rubik,
            marginTop: 2,
          }}
        />
      </FlexWidget>

      {/* CENTER: glyph circle */}
      <FlexWidget
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: RITUAL.highlightBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={glyph}
          style={{ fontSize: 22, color: RITUAL.text, fontFamily: FONT.widget }}
        />
      </FlexWidget>

      {/* RIGHT: stretched prayer name */}
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
        <TextWidget
          text={stretchedName}
          style={{
            fontSize: 26,
            color: RITUAL.text,
            fontFamily: FONT.widget,
            letterSpacing: isArabic ? 0 : 4,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
