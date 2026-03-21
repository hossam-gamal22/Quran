/**
 * Notification Permissions — أذونات الإشعارات
 *
 * Handles:
 * 1. Notification permission requests (iOS + Android)
 * 2. Battery optimization exemption (Android) — critical for killed-app delivery
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, Linking } from 'react-native';
import { t } from '@/lib/i18n';

const BATTERY_OPT_ASKED_KEY = '@battery_opt_asked';

/**
 * Request notification permissions from the OS.
 * On iOS, also requests critical alerts for prayer-time adhan.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: true,
    },
  });

  if (status !== 'granted') {
    Alert.alert(
      t('notifications.permissionRequired') || '\u26A0\uFE0F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629',
      t('notifications.permissionBody') || '\u064A\u0631\u062C\u0649 \u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0645\u0648\u0627\u0639\u064A\u062F \u0627\u0644\u0635\u0644\u0627\u0629 \u0648\u0627\u0644\u0623\u0630\u0643\u0627\u0631',
      [
        { text: t('common.later') || '\u0644\u0627\u062D\u0642\u064B\u0627', style: 'cancel' },
        { text: t('common.settings') || '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }

  return true;
}

/**
 * Ask the user to disable battery optimization for this app (Android only).
 * Many OEMs (Xiaomi, Samsung, Huawei, Oppo) aggressively kill background apps,
 * preventing scheduled notifications from firing when the app is closed.
 *
 * This dialog is shown only ONCE. The user can dismiss it.
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Only ask once
  const asked = await AsyncStorage.getItem(BATTERY_OPT_ASKED_KEY);
  if (asked === 'true') return;

  Alert.alert(
    t('notifications.batteryTitle') || '\u26A0\uFE0F \u062A\u0646\u0628\u064A\u0647 \u0645\u0647\u0645 \u0644\u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0635\u0644\u0627\u0629',
    t('notifications.batteryBody') || '\u0628\u0639\u0636 \u0627\u0644\u0623\u062C\u0647\u0632\u0629 \u062A\u0645\u0646\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0639\u0646\u062F \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0637\u0628\u064A\u0642.\n\n\u0644\u0636\u0645\u0627\u0646 \u0648\u0635\u0648\u0644 \u0623\u0630\u0627\u0646 \u0627\u0644\u0635\u0644\u0627\u0629 \u0641\u064A \u0648\u0642\u062A\u0647\u060C \u064A\u0631\u062C\u0649 \u0625\u064A\u0642\u0627\u0641 \u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u0628\u0637\u0627\u0631\u064A\u0629 \u0644\u0644\u062A\u0637\u0628\u064A\u0642.',
    [
      {
        text: t('common.later') || '\u0644\u0627\u062D\u0642\u064B\u0627',
        style: 'cancel',
        onPress: async () => {
          await AsyncStorage.setItem(BATTERY_OPT_ASKED_KEY, 'true');
        },
      },
      {
        text: t('notifications.setupNow') || '\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0622\u0646 \u2705',
        onPress: async () => {
          await AsyncStorage.setItem(BATTERY_OPT_ASKED_KEY, 'true');
          try {
            // Try direct battery optimization intent
            const IntentLauncher = require('expo-intent-launcher');
            await IntentLauncher.startActivityAsync(
              IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              { data: 'package:com.rooh.almuslim' },
            );
          } catch {
            // Fallback: open general app settings
            await Linking.openSettings();
          }
        },
      },
    ],
  );
}
