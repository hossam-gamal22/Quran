// components/widgets/android/RoohSmallWidget.tsx
// Phase D — thin shell delegating to SnapshotWidget. Existing home-screen
// placements continue to work because the provider name `RoohSmall` is still
// registered in the manifest; only the body is replaced with a PNG-backed view.

import React from 'react';
import type { SharedWidgetData } from '@/lib/widget-data';
import { SnapshotWidget, legacyProviderToRegistry } from './SnapshotWidget';

export function RoohSmallWidget({ data }: { data: SharedWidgetData }) {
  const target = legacyProviderToRegistry('RoohSmall')!;
  return (
    <SnapshotWidget
      widgetId={target.widgetId}
      size={target.size}
      data={data}
      clickAction="OPEN_APP"
    />
  );
}
