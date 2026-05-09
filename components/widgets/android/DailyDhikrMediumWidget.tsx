// components/widgets/android/DailyDhikrMediumWidget.tsx
// 4×2 — dhikr + count chip + benefit (when present). Respects user theme/numerals.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { GLASS, FONT, resolveIsArabic, paletteFor, applyNumerals, AZKAR_FONT_FAMILY } from './shared';

export function DailyDhikrMediumWidget({ data }: { data: SharedWidgetData }) {
  const { dhikr } = data;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const p = paletteFor(data.widgetTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const benefit = dhikr.benefit;
  const showBenefit = !!benefit && benefit.length > 0;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: p.bg,
        borderRadius: GLASS.radius,
        padding: GLASS.padding,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://daily-dhikr' }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextWidget
          text={dhikr.arabic || '…'}
          style={{ fontSize: 16, color: p.text, fontFamily: AZKAR_FONT_FAMILY, textAlign: 'right' }}
          maxLines={2}
          truncate="END"
        />
        {dhikr.count > 1 ? (
          <FlexWidget
            style={{
              backgroundColor: p.surface,
              borderRadius: GLASS.radiusInner,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginLeft: 8,
            }}
          >
            <TextWidget
              text={`${applyNumerals(dhikr.count, numerals, isAr)}×`}
              style={{ fontSize: 12, color: p.text, fontFamily: FONT.rubikBold }}
            />
          </FlexWidget>
        ) : null}
      </FlexWidget>
      {!isAr && dhikr.translation ? (
        <TextWidget
          text={dhikr.translation}
          style={{ fontSize: 11, color: p.muted, fontFamily: FONT.rubik, textAlign: 'left', marginTop: 4 }}
          maxLines={1}
          truncate="END"
        />
      ) : null}
      {showBenefit ? (
        <TextWidget
          text={benefit || ''}
          style={{ fontSize: 11, color: p.muted, fontFamily: FONT.rubik, textAlign: 'right', marginTop: 6 }}
          maxLines={2}
          truncate="END"
        />
      ) : null}
    </FlexWidget>
  );
}
