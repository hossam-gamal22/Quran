// lib/widget-add-helper.ts
// Helper to request adding widgets to home screen

import { Platform, Alert } from 'react-native';
import { t } from '@/lib/i18n';

/**
 * Widget name → Android provider class mapping
 * These must match the receivers in AndroidManifest.xml
 */
const WIDGET_CLASS_MAP: Record<string, string> = {
  prayer_small: 'com.rooh.almuslim.widget.PrayerTimesSmall',
  prayer_medium: 'com.rooh.almuslim.widget.PrayerTimesMedium',
  ayah_small: 'com.rooh.almuslim.widget.DailyVerseSmall',
  ayah_medium: 'com.rooh.almuslim.widget.DailyVerseMedium',
  dhikr_small: 'com.rooh.almuslim.widget.DailyDhikrSmall',
  dhikr_medium: 'com.rooh.almuslim.widget.DailyDhikrMedium',
  azkar_small: 'com.rooh.almuslim.widget.AzkarProgressSmall',
  azkar_medium: 'com.rooh.almuslim.widget.AzkarProgressMedium',
  hijri_small: 'com.rooh.almuslim.widget.HijriDateSmall',
  hijri_medium: 'com.rooh.almuslim.widget.HijriDateMedium',
};

/**
 * Request adding a widget to the home screen.
 * - Android 8.0+: Uses requestPinAppWidget via IntentLauncher
 * - iOS: Shows step-by-step instructions (no programmatic API)
 */
export async function requestAddWidget(
  categoryId: string,
  size: 'small' | 'medium',
): Promise<void> {
  const widgetKey = `${categoryId}_${size}`;

  if (Platform.OS === 'android') {
    await requestAndroidWidget(widgetKey);
  } else {
    showIOSWidgetInstructions();
  }
}

async function requestAndroidWidget(widgetKey: string): Promise<void> {
  const widgetClass = WIDGET_CLASS_MAP[widgetKey];
  if (!widgetClass) {
    Alert.alert(t('widgets.addWidget'), t('widgets.addWidgetAndroidInstructions'));
    return;
  }

  try {
    const IntentLauncher = require('expo-intent-launcher');
    // Open the Widgets picker on Android
    // ACTION_APPWIDGET_PICK is the closest system intent for widget selection
    await IntentLauncher.startActivityAsync('android.appwidget.action.APPWIDGET_PICK', {
      extra: {
        'android.appwidget.extra.APPWIDGET_ID': 0,
      },
    });
  } catch {
    // If intent fails, show manual instructions
    Alert.alert(
      t('widgets.addWidget'),
      t('widgets.addWidgetAndroidInstructions'),
      [{ text: t('common.ok'), style: 'default' }],
    );
  }
}

function showIOSWidgetInstructions(): void {
  Alert.alert(
    t('widgets.addWidget'),
    t('widgets.addWidgetIosInstructions'),
    [{ text: t('common.ok'), style: 'default' }],
  );
}
