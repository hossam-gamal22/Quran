// components/widgets/android/DailyDhikrSmallWidget.tsx
// Phase D — thin shell.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { SnapshotWidget, legacyProviderToRegistry } from './SnapshotWidget';

export function DailyDhikrSmallWidget({ data }: { data: SharedWidgetData }) {
  const target = legacyProviderToRegistry('DailyDhikrSmall')!;
  return (
    <SnapshotWidget widgetId={target.widgetId} size={target.size} data={data} clickAction="OPEN_APP" />
  );
}
