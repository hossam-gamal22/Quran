// lib/android-widget-task-handler.tsx
// Task handler for react-native-android-widget
// Reads widget_shared_data from AsyncStorage and renders the appropriate widget

import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SharedWidgetData } from './widget-data';

// Widget components (lazy imports to avoid circular deps)
import { PrayerTimesSmallWidget } from '@/components/widgets/android/PrayerTimesSmallWidget';
import { PrayerTimesMediumWidget } from '@/components/widgets/android/PrayerTimesMediumWidget';
import { DailyVerseSmallWidget } from '@/components/widgets/android/DailyVerseSmallWidget';
import { DailyVerseMediumWidget } from '@/components/widgets/android/DailyVerseMediumWidget';
import { DailyDhikrSmallWidget } from '@/components/widgets/android/DailyDhikrSmallWidget';
import { DailyDhikrMediumWidget } from '@/components/widgets/android/DailyDhikrMediumWidget';
import { AzkarProgressSmallWidget } from '@/components/widgets/android/AzkarProgressSmallWidget';
import { AzkarProgressMediumWidget } from '@/components/widgets/android/AzkarProgressMediumWidget';
import { HijriDateSmallWidget } from '@/components/widgets/android/HijriDateSmallWidget';
import { HijriDateMediumWidget } from '@/components/widgets/android/HijriDateMediumWidget';

const WIDGET_DATA_KEY = 'widget_shared_data';

async function loadWidgetData(): Promise<SharedWidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

const WIDGET_MAP: Record<string, React.FC<{ data: SharedWidgetData }>> = {
  PrayerTimesSmall: PrayerTimesSmallWidget,
  PrayerTimesMedium: PrayerTimesMediumWidget,
  DailyVerseSmall: DailyVerseSmallWidget,
  DailyVerseMedium: DailyVerseMediumWidget,
  DailyDhikrSmall: DailyDhikrSmallWidget,
  DailyDhikrMedium: DailyDhikrMediumWidget,
  AzkarProgressSmall: AzkarProgressSmallWidget,
  AzkarProgressMedium: AzkarProgressMediumWidget,
  HijriDateSmall: HijriDateSmallWidget,
  HijriDateMedium: HijriDateMediumWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  const widgetName = widgetInfo.widgetName;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let data = await loadWidgetData();

      // If no data yet (widget added before app opened), try to sync
      if (!data) {
        try {
          const { syncWidgetDataToNative } = require('./widget-native-sync');
          await syncWidgetDataToNative();
          data = await loadWidgetData();
        } catch {
          // sync failed — will show placeholder
        }
      }

      const WidgetComponent = WIDGET_MAP[widgetName];

      if (!WidgetComponent || !data) {
        const { FlexWidget, TextWidget } = require('react-native-android-widget');
        renderWidget(
          <FlexWidget
            style={{
              height: 'match_parent',
              width: 'match_parent',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#0a0f0d',
              borderRadius: 16,
            }}
          >
            <TextWidget
              text="روح المسلم"
              style={{
                fontSize: 16,
                color: '#22c55e',
                fontFamily: 'Amiri',
              }}
            />
            <TextWidget
              text="افتح التطبيق لتحميل البيانات"
              style={{
                fontSize: 12,
                color: '#9ca3af',
                fontFamily: 'Amiri',
              }}
            />
          </FlexWidget>
        );
        return;
      }

      renderWidget(<WidgetComponent data={data} />);
      return;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      return;
  }
}
