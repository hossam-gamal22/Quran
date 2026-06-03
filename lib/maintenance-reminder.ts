/**
 * Global notification maintenance reminder.
 *
 * All scheduled notifications (prayers, adhkar, smart alarm, …) are armed for a
 * limited window (e.g. 7 days). If the user never reopens the app, that window
 * eventually empties and they silently stop getting ANY notification. This
 * module schedules a single app-wide reminder shortly before the *farthest*
 * scheduled notification, nudging the user to reopen so the whole schedule
 * refreshes — not just the Fajr alarm.
 *
 * Call scheduleGlobalMaintenanceReminder() AFTER all other scheduling has run
 * (background task tail + a delayed call on app foreground).
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { dirText } from './notification-text-direction';
import { getScheduledNotificationFireMs } from './notification-trigger-time';
import { uiText } from './ui-text';

const MAINTENANCE_KEY = '@app_maintenance_reminder_id';
export const MAINTENANCE_TYPE = 'app_maintenance';

// Fire the reminder this long before the farthest scheduled notification, so
// the user has time to reopen before the window empties.
const LEAD_TIME_MS = 18 * 60 * 60 * 1000; // 18 hours

/** Defensively extract a future fire-time (ms epoch) from any trigger shape. */
const triggerToMs = getScheduledNotificationFireMs;

async function cancelExisting(): Promise<void> {
  try {
    const prev = await AsyncStorage.getItem(MAINTENANCE_KEY);
    if (prev) {
      await Notifications.cancelScheduledNotificationAsync(prev).catch(() => {});
      await AsyncStorage.removeItem(MAINTENANCE_KEY);
    }
  } catch {}
}

/**
 * Reads every pending notification, finds the farthest fire-time (ignoring the
 * maintenance reminder itself), and schedules a reminder ~18h before it. If the
 * farthest is too soon (< ~1.5 days) we skip — a reminder wouldn't help and
 * would just be noise.
 */
export async function scheduleGlobalMaintenanceReminder(): Promise<void> {
  await cancelExisting();

  let all: Notifications.NotificationRequest[] = [];
  try {
    all = await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return;
  }
  if (!all.length) return;

  const now = Date.now();
  let farthest = 0;
  for (const req of all) {
    const type = (req.content?.data as any)?.type;
    if (type === MAINTENANCE_TYPE) continue; // never count ourselves
    const ms = triggerToMs(req.trigger as any);
    if (ms && ms > farthest) farthest = ms;
  }

  if (farthest <= now) return;

  // Only bother if the window is reasonably long (> ~1.5 days), otherwise the
  // app is being opened often enough that the schedule self-renews.
  if (farthest - now < 36 * 60 * 60 * 1000) return;

  let remindAt = farthest - LEAD_TIME_MS;
  // Keep it at least an hour in the future.
  if (remindAt <= now + 60 * 60 * 1000) remindAt = now + 60 * 60 * 1000;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(uiText({ ar: 'حافظ على تنبيهاتك', en: 'Keep your reminders active' })),
        body: dirText(uiText({
          ar: 'افتح التطبيق ليتحدّث جدول الصلاة والأذكار والمنبه للأيام القادمة',
          en: 'Open the app to refresh your prayer, adhkar and alarm schedule for the coming days',
        })),
        data: { type: MAINTENANCE_TYPE },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(remindAt),
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
    });
    await AsyncStorage.setItem(MAINTENANCE_KEY, id);
  } catch (e) {
    if (__DEV__) console.warn('[maintenance-reminder] schedule failed', e);
  }
}

export async function cancelGlobalMaintenanceReminder(): Promise<void> {
  await cancelExisting();
}
