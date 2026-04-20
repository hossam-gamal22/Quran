// components/widgets/android/LockedWidget.tsx
// Locked widget shown to non-premium users for premium widget types.
// Displays app branding + lock message + upgrade prompt.

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { COLORS, FONT, BRANDING, APP_ICON, ICON_SIZE, GRADIENTS } from './shared';

interface LockedWidgetProps {
  widgetName: string;
}

/** Map widget names to their gradient key */
function getGradientKey(widgetName: string): string {
  if (widgetName.startsWith('PrayerTimes')) return 'prayer';
  if (widgetName.startsWith('DailyVerse')) return 'verse';
  if (widgetName.startsWith('DailyDhikr')) return 'dhikr';
  if (widgetName.startsWith('AzkarProgress')) return 'azkar';
  if (widgetName.startsWith('HijriDate')) return 'hijri';
  return 'prayer';
}

export function LockedWidget({ widgetName }: LockedWidgetProps) {
  const gradientKey = getGradientKey(widgetName);
  const gradient = GRADIENTS[gradientKey] || GRADIENTS.prayer;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundGradient: gradient,
        borderRadius: 20,
        padding: 16,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://subscription' }}
    >
      {/* App Icon */}
      <ImageWidget
        image={APP_ICON}
        imageWidth={ICON_SIZE.small}
        imageHeight={ICON_SIZE.small}
        radius={7}
      />

      {/* Lock icon text */}
      <TextWidget
        text="🔒"
        style={{
          fontSize: 28,
          color: COLORS.white,
          marginTop: 8,
        }}
      />

      {/* Upgrade message */}
      <TextWidget
        text="اشترك للحصول على هذه الودجت"
        style={{
          fontSize: 13,
          color: COLORS.whiteMuted,
          fontFamily: FONT.amiri,
          marginTop: 6,
        }}
      />

      {/* App branding */}
      <TextWidget
        text={BRANDING.name}
        style={{
          fontSize: BRANDING.fontSize,
          color: COLORS.teal,
          fontFamily: FONT.amiri,
          marginTop: 8,
        }}
      />
    </FlexWidget>
  );
}
