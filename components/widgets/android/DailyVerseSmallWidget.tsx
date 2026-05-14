// components/widgets/android/DailyVerseSmallWidget.tsx
// Phase D — thin shell.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { SnapshotWidget, legacyProviderToRegistry } from './SnapshotWidget';

export function DailyVerseSmallWidget({ data }: { data: SharedWidgetData }) {
  const target = legacyProviderToRegistry('DailyVerseSmall')!;
  return (
    <SnapshotWidget widgetId={target.widgetId} size={target.size} data={data} clickAction="OPEN_APP" />
  );
}
