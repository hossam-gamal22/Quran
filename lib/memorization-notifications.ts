// lib/memorization-notifications.ts
// تذكير يومي بسيط لخطة الحفظ — يطلق notification يومي عند الوقت المحدد في الخطة.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MemorizationPlan } from '@/types/memorization';
import {
  getReminderChannelId,
  NOTIFICATION_SOUND_FILES,
  resolveSoundFile,
} from '@/services/notifications/channels';
import { markPermissionRequested } from '@/lib/permission-recovery';

const STORAGE_KEY = '@rooh_memorization_notif_ids';
const MEMORIZATION_REMINDER_SOUND = 'notif_verse';
const MEMORIZATION_REMINDER_AYAH =
  '﴿وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ﴾';

interface NotifMap {
  [planId: string]: string;
}

async function readMap(): Promise<NotifMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NotifMap;
  } catch {
    return {};
  }
}

async function writeMap(map: NotifMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export async function cancelMemorizationReminder(planId: string): Promise<void> {
  const map = await readMap();
  const id = map[planId];
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
  delete map[planId];
  await writeMap(map);
}

export async function scheduleMemorizationReminder(
  plan: MemorizationPlan,
): Promise<string | null> {
  if (!plan.reminderEnabled || !plan.reminderTime) {
    await cancelMemorizationReminder(plan.id);
    return null;
  }
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const req = await Notifications.requestPermissionsAsync();
      // Mark AFTER the prompt was actually shown (Android-gated banner).
      if (Platform.OS === 'android') {
        await markPermissionRequested('notifications');
      }
      if (!req.granted) return null;
    }

    await cancelMemorizationReminder(plan.id);

    const parts = plan.reminderTime.split(':').map((n) => Number(n));
    const hour = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 6;
    const minute = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;

    const soundFile =
      NOTIFICATION_SOUND_FILES[MEMORIZATION_REMINDER_SOUND] ?? 'notif_verse.mp3';
    const sound = resolveSoundFile(soundFile);
    const channelId =
      Platform.OS === 'android'
        ? getReminderChannelId(MEMORIZATION_REMINDER_SOUND)
        : undefined;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📖 وقت حفظ القرآن',
        body: `${MEMORIZATION_REMINDER_AYAH}\nوِردك من "${plan.name}" بانتظارك`,
        data: {
          type: 'memorization_reminder',
          planId: plan.id,
          soundType: MEMORIZATION_REMINDER_SOUND,
        },
        sound,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
      },
    });

    const map = await readMap();
    map[plan.id] = id;
    await writeMap(map);
    return id;
  } catch (e) {
    console.warn('scheduleMemorizationReminder failed', e);
    return null;
  }
}

export async function rescheduleAllMemorizationReminders(
  plans: MemorizationPlan[],
): Promise<void> {
  for (const p of plans) {
    if (p.reminderEnabled && p.reminderTime) {
      await scheduleMemorizationReminder(p);
    } else {
      await cancelMemorizationReminder(p.id);
    }
  }
}
