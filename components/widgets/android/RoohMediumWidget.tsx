// components/widgets/android/RoohMediumWidget.tsx
// Phase D — thin shell. See SnapshotWidget for rendering details.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { SnapshotWidget, legacyProviderToRegistry } from './SnapshotWidget';

export function RoohMediumWidget({ data }: { data: SharedWidgetData }) {
  const target = legacyProviderToRegistry('RoohMedium')!;
  return (
    <SnapshotWidget widgetId={target.widgetId} size={target.size} data={data} clickAction="OPEN_APP" />
  );
}
