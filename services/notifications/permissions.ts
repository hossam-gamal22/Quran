/**
 * Notification Permissions — أذونات الإشعارات
 *
 * Handles:
 * 1. Notification permission requests (iOS + Android)
 * 2. SCHEDULE_EXACT_ALARM check (Android 12+)
 *
 * Note: Battery optimization, autostart, and OEM permission prompts have been
 * removed. Android scheduling now uses setAlarmClock() (patched via
 * plugins/with-alarm-clock-scheduling.js) which bypasses Doze and OEM
 * restrictions without user intervention.
 */

import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import { t } from '@/lib/i18n';

/**
 * Check if exact alarms can be scheduled.
 *
 * - Not needed below Android 12 (API < 31) — returns true.
 * - Android 12+ (API >= 31): PermissionsAndroid.check for SCHEDULE_EXACT_ALARM.
 */
export async function checkExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const apiLevel = Platform.Version as number;
  if (apiLevel < 31) return true;

  try {
    const granted = await (PermissionsAndroid as any).check(
      'android.permission.SCHEDULE_EXACT_ALARM',
    );
    return granted === true;
  } catch {
    return false;
  }
}

/**
 * Open the system "Alarms & Reminders" settings page so the user can
 * grant SCHEDULE_EXACT_ALARM.
 */
export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const IntentLauncher = require('expo-intent-launcher');
    await IntentLauncher.startActivityAsync(
      'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
      { data: 'package:com.rooh.almuslim' },
    );
  } catch {
    await Linking.openSettings();
  }
}

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
      t('notifications.permissionRequired') || '\u26A0\uFE0F الإشعارات مطلوبة',
      t('notifications.permissionBody') || 'يرجى السماح بالإشعارات لاستقبال مواعيد الصلاة والأذكار',
      [
        { text: t('common.later') || 'لاحقًا', style: 'cancel' },
        { text: t('common.settings') || 'الإعدادات', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }

  return true;
}
