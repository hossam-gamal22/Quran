// components/widgets/android/PrayerTimesSmallWidget.tsx
// Phase D — thin shell. Routes legacy `PrayerTimesSmall` provider to the
// `prayerSingle` snapshot.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { SnapshotWidget, legacyProviderToRegistry } from './SnapshotWidget';

export function PrayerTimesSmallWidget({ data }: { data: SharedWidgetData }) {
  const target = legacyProviderToRegistry('PrayerTimesSmall')!;
  return (
    <SnapshotWidget widgetId={target.widgetId} size={target.size} data={data} clickAction="OPEN_APP" />
  );
}
