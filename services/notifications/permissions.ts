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
import { Platform, Linking, NativeModules, PermissionsAndroid } from 'react-native';
import { markPermissionRequested } from '@/lib/permission-recovery';

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
    const FullAdhan = (NativeModules as any)?.FullAdhanModule;
    if (FullAdhan?.canScheduleExactAlarms) {
      return (await FullAdhan.canScheduleExactAlarms()) === true;
    }
  } catch {}

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
 * On iOS, request regular alert/sound permissions only. Critical Alerts require
 * an Apple-approved entitlement and are intentionally not part of the default path.
 * Returns true if granted. Never shows an Alert on every launch —
 * if the user already denied, PermissionBanner handles re-engagement.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  // Already denied permanently — don't re-prompt or show an Alert here.
  // The PermissionBanner inside the app guides the user to Settings.
  if (existingStatus === 'denied' && !canAskAgain) return false;

  if (Platform.OS === 'android') {
    await markPermissionRequested('notifications');
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return status === 'granted';
}
