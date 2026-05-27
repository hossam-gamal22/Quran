// lib/eid-notifications.ts
// جدولة إشعار صلاة العيد - يُجدول مساء اليوم السابق

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { scheduleLocalNotification } from '@/lib/push-notifications';
import { getUpcomingEid, calculateEidPrayerTime, type EidType } from '@/lib/eid-prayer';
import { getCachedPrayerTimes, getTodayDateString, formatPrayerTime } from '@/lib/prayer-times';
import { t } from '@/lib/i18n';

const STORAGE_KEY = '@eid_notification_scheduled';
const NOTIFY_HOUR = 20; // 8 PM the night before
const NOTIFY_MINUTE = 0;

interface ScheduledRecord {
  /** ISO date of the Eid day (YYYY-MM-DD) — used to detect duplicates. */
  eidDate: string;
  /** Eid type, recorded so a Fitr→Adha transition reschedules. */
  type: EidType;
  /** The notification identifier returned by expo-notifications. */
  notificationId: string;
}

/**
 * Schedule (or re-schedule) a one-shot reminder at 8 PM the day before Eid.
 * Safe to call repeatedly — duplicates are skipped via AsyncStorage marker.
 *
 * Returns true when a notification was scheduled this call.
 */
export async function scheduleEidNotification(): Promise<boolean> {
  try {
    const upcoming = getUpcomingEid();
    // Need at least 1 day notice; if Eid is today already, nothing to schedule.
    if (!upcoming || upcoming.daysUntil < 1) return false;

    const eidDateKey = upcoming.date.toISOString().slice(0, 10);

    // Skip if already scheduled for this exact Eid
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
    if (existingRaw) {
      try {
        const existing: ScheduledRecord = JSON.parse(existingRaw);
        if (existing.eidDate === eidDateKey && existing.type === upcoming.type) {
          return false;
        }
        // Different Eid — cancel the old one before scheduling new
        if (existing.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(existing.notificationId).catch(() => {});
        }
      } catch { /* corrupted marker, overwrite */ }
    }

    // Trigger: 8 PM the day before Eid
    const triggerDate = new Date(upcoming.date);
    triggerDate.setDate(triggerDate.getDate() - 1);
    triggerDate.setHours(NOTIFY_HOUR, NOTIFY_MINUTE, 0, 0);
    if (triggerDate <= new Date()) return false;

    // Try to enrich the body with the actual prayer time
    let timeFragment = '';
    try {
      const cached = await getCachedPrayerTimes(getTodayDateString());
      const calc = cached?.sunrise ? calculateEidPrayerTime(cached.sunrise, upcoming.type) : null;
      if (calc) {
        timeFragment = ` — ${formatPrayerTime(calc, false)}`;
      }
    } catch { /* best-effort */ }

    const titleKey = upcoming.type === 'fitr' ? 'eidPrayer.fitrTitle' : 'eidPrayer.adhaTitle';
    const title = t(titleKey);
    const body = `${t('eidPrayer.notificationBody')}${timeFragment}`;

    const notificationId = await scheduleLocalNotification(
      {
        title: `🕌 ${title}`,
        body,
        data: {
          type: 'eid',
          eidType: upcoming.type,
          deeplink: '/seasonal/eid',
        },
      },
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: 'seasonal',
      }
    );

    if (notificationId) {
      const record: ScheduledRecord = {
        eidDate: eidDateKey,
        type: upcoming.type,
        notificationId,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      return true;
    }
    return false;
  } catch (err) {
    if (__DEV__) console.log('[eid-notifications] schedule failed:', err);
    return false;
  }
}

/**
 * Cancel any pending Eid notification and clear the marker. Useful when the
 * user disables seasonal notifications.
 */
export async function cancelEidNotification(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const record: ScheduledRecord = JSON.parse(raw);
    if (record.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(record.notificationId).catch(() => {});
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* swallow */ }
}
