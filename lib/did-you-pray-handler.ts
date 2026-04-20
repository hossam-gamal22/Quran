// lib/did-you-pray-handler.ts
// Handles the interactive "هل صليت؟" notification:
// - Registers the notification category with two action buttons.
// - Processes responses: "نعم، صليت" logs the prayer; "سأصلي قريباً" reschedules.
// Scoped strictly to `data.type === 'did_you_pray'` so other notifications are unaffected.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dirText } from './notification-text-direction';
import { t } from './i18n';
import { resolveNotificationSound } from './resolve-notification-sound';
import { getReminderChannelId } from '../services/notifications/channels';
import { getNotificationIconAttachment } from './notification-icons';
import { updatePrayerStatus, getTodayDate, type PrayerName } from './worship-storage';

export const DID_YOU_PRAY_CATEGORY = 'did_you_pray';
export const DID_YOU_PRAY_ACTION_PRAYED = 'prayed';
export const DID_YOU_PRAY_ACTION_WILL_PRAY = 'will_pray';
const WILL_PRAY_SNOOZE_MINUTES = 15;

let categoryRegistered = false;

export async function registerDidYouPrayCategory(): Promise<void> {
  if (categoryRegistered) return;
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setNotificationCategoryAsync(DID_YOU_PRAY_CATEGORY, [
      {
        identifier: DID_YOU_PRAY_ACTION_PRAYED,
        buttonTitle: t('notifications.didYouPrayYes'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: DID_YOU_PRAY_ACTION_WILL_PRAY,
        buttonTitle: t('notifications.didYouPrayLater'),
        options: { opensAppToForeground: false },
      },
    ]);
    categoryRegistered = true;
  } catch (e) {
    console.warn('[did-you-pray] Failed to register category:', e);
  }
}

const VALID_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function toPrayerName(v: unknown): PrayerName | null {
  if (typeof v !== 'string') return null;
  return (VALID_PRAYERS as string[]).includes(v) ? (v as PrayerName) : null;
}

export async function handleDidYouPrayResponse(
  response: Notifications.NotificationResponse,
): Promise<boolean> {
  const data = response.notification.request.content.data;
  if (!data || data.type !== 'did_you_pray') return false;

  const action = response.actionIdentifier;
  const prayer = toPrayerName(data.prayer);
  if (!prayer) return false;

  const notifId = response.notification.request.identifier;

  if (action === DID_YOU_PRAY_ACTION_PRAYED) {
    try {
      await updatePrayerStatus(getTodayDate(), prayer, 'prayed');
    } catch (e) {
      console.warn('[did-you-pray] Failed to log prayer:', e);
    }
    try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
    try { await Notifications.dismissNotificationAsync(notifId); } catch {}
    return true;
  }

  if (action === DID_YOU_PRAY_ACTION_WILL_PRAY) {
    try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
    try { await Notifications.dismissNotificationAsync(notifId); } catch {}
    const snooze = typeof data.snoozeMinutes === 'number' && data.snoozeMinutes > 0
      ? data.snoozeMinutes
      : WILL_PRAY_SNOOZE_MINUTES;
    await scheduleDidYouPrayIn(prayer, snooze);
    return true;
  }

  return false;
}

async function scheduleDidYouPrayIn(prayer: PrayerName, minutes: number): Promise<void> {
  const trigger = new Date(Date.now() + minutes * 60 * 1000);
  const channelId = getReminderChannelId('notif_after_prayer');
  const sound = resolveNotificationSound('notif_after_prayer', true);
  const mosqueAttachments = await getNotificationIconAttachment('mosque');
  const identifier = `did_you_pray_${prayer}`;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: dirText(t('notifications.didYouPray')),
        body: dirText(t('notifications.didYouPrayBody')),
        data: { type: 'did_you_pray', prayer, snoozeMinutes: minutes },
        sound,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: DID_YOU_PRAY_CATEGORY,
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
        ...(Platform.OS === 'ios' && mosqueAttachments && { attachments: mosqueAttachments }),
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        ...(Platform.OS === 'android' && { channelId }),
      },
    });
  } catch (e) {
    console.warn('[did-you-pray] Failed to snooze:', e);
  }
}
