// components/widgets/android/ritual/PrayerBanner.tsx
// "Prayer Banner" — 4×2 split into TWO equal cards side by side:
// left = Sunrise (الشروق) time   |   right = Dhuhr (الظهر) time.
// Each card shows label on top + big time below in a glass rounded box.
// We use the next two upcoming prayers from the day's list (or fallback to Sunrise+Dhuhr).

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { FONT } from '../shared';
import { RITUAL, prayerLabel } from './shared';

export function PrayerBanner({ data }: { data: SharedWidgetData }) {
  const { prayer } = data;
  const isArabic = (data.language || 'ar') === 'ar';

  // Pick the next 2 upcoming prayers (current + next), fallback to first two
  const upcoming = prayer.allPrayers.filter((p) => !p.isPassed);
  const a = upcoming[0] ?? prayer.allPrayers[0];
  const b = upcoming[1] ?? prayer.allPrayers[1] ?? a;

  const renderCard = (item: typeof a, key: string) => {
    if (!item) return null;
    const label = isArabic ? item.nameAr : prayerLabel(item.nameAr, false);
    return (
      <FlexWidget
        key={key}
        style={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: RITUAL.glassBg,
          borderRadius: RITUAL.radius,
          paddingHorizontal: 12,
          paddingVertical: 18,
        }}
      >
        <TextWidget
          text={label}
          style={{
            fontSize: 13,
            color: RITUAL.textMuted,
            fontFamily: FONT.widget,
            letterSpacing: isArabic ? 0 : 2,
          }}
        />
        <TextWidget
          text={item.time}
          style={{
            fontSize: 30,
            color: RITUAL.text,
            fontFamily: FONT.widget,
            marginTop: 4,
          }}
        />
      </FlexWidget>
    );
  };

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#00000000',
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://prayer' }}
    >
      {renderCard(a, 'a')}
      <FlexWidget style={{ width: 8 }} />
      {renderCard(b, 'b')}
    </FlexWidget>
  );
}
