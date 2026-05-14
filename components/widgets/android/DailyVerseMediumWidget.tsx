// components/widgets/android/DailyVerseMediumWidget.tsx
// Phase D — thin shell.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { SnapshotWidget, legacyProviderToRegistry } from './SnapshotWidget';

export function DailyVerseMediumWidget({ data }: { data: SharedWidgetData }) {
  const target = legacyProviderToRegistry('DailyVerseMedium')!;
  return (
    <SnapshotWidget widgetId={target.widgetId} size={target.size} data={data} clickAction="OPEN_APP" />
  );
}
