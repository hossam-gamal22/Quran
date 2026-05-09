// components/widgets/android/PrayerTimesSmallWidget.tsx
// 2×2 widget — dispatches to Compact or Simple style based on settings.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { PrayerCompact } from './ritual/PrayerCompact';
import { PrayerSimple } from './ritual/PrayerSimple';

export function PrayerTimesSmallWidget({ data }: { data: SharedWidgetData }) {
  const style = data.settings?.prayerWidget?.smallStyle ?? 'compact';
  if (style === 'simple') return <PrayerSimple data={data} />;
  return <PrayerCompact data={data} />;
}
