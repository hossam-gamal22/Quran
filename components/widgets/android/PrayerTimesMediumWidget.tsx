// components/widgets/android/PrayerTimesMediumWidget.tsx
// 4×2 widget — dispatches to one of the Ritual prayer styles based on settings.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { PrayerPair } from './ritual/PrayerPair';
import { PrayerTable } from './ritual/PrayerTable';
import { PrayerBanner } from './ritual/PrayerBanner';

export function PrayerTimesMediumWidget({ data }: { data: SharedWidgetData }) {
  const style = data.settings?.prayerWidget?.style ?? 'pair';
  if (style === 'table') return <PrayerTable data={data} />;
  if (style === 'banner') return <PrayerBanner data={data} />;
  return <PrayerPair data={data} />;
}
