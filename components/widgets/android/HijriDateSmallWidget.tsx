// components/widgets/android/HijriDateSmallWidget.tsx
// Phase D — thin shell.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { SnapshotWidget, legacyProviderToRegistry } from './SnapshotWidget';

export function HijriDateSmallWidget({ data }: { data: SharedWidgetData }) {
  const target = legacyProviderToRegistry('HijriDateSmall')!;
  return (
    <SnapshotWidget widgetId={target.widgetId} size={target.size} data={data} clickAction="OPEN_APP" />
  );
}
