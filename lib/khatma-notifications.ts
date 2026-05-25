import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Khatma } from './khatma-storage';
import { t } from './i18n';
import { dirText } from './notification-text-direction';
import { getReminderChannelId } from '../services/notifications/channels';

// Sound file mapping (must match app.json expo-notifications sounds)
const SOUND_FILES: Record<string, string> = {
  complete: 'notif_daily_summary.mp3',
  salawat: 'salawat.mp3',
  istighfar: 'istighfar.mp3',
  tasbih: 'tasbih.mp3',
  notif_khatma: 'notif_khatma.mp3',
  notif_verse: 'notif_verse.mp3',
};

/**
 * Resolve sound for khatma notifications
 * Returns false for silent, 'default' for system sound, or filename for custom sound
 */
function resolveKhatmaSound(soundType?: string, soundEnabled?: boolean): string | false {
  // Silent notification
  if (soundEnabled === false || soundType === 'silent') {
    return false;
  }

  // Default system sound
  if (!soundType || soundType === 'default') return 'default';

  // Lookup custom sound file — fall back to system default if unknown
  const file = SOUND_FILES[soundType];
  if (!file) return 'default';

  // Android: no extension, iOS: with extension
  if (Platform.OS === 'android') return file.replace(/\.mp3$/, '');
  return file;
}

// ===== STORAGE KEY =====
const KHATMA_NOTIFICATION_IDS_KEY = '@rooh_muslim_khatma_notification_ids';

// ===== TYPES =====
interface KhatmaNotificationIds {
  [khatmaId: string]: string; // khatmaId -> notificationId
}

// Notification handler is configured in app/_layout.tsx (single source of truth)

// ===== REQUEST PERMISSIONS =====
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Android channels are pre-created at startup in services/notifications/channels.ts

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// ===== GET STORED NOTIFICATION IDS =====
const getStoredNotificationIds = async (): Promise<KhatmaNotificationIds> => {
  try {
    const data = await AsyncStorage.getItem(KHATMA_NOTIFICATION_IDS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting notification IDs:', error);
    return {};
  }
};

// ===== SAVE NOTIFICATION ID =====
const saveNotificationId = async (khatmaId: string, notificationId: string): Promise<void> => {
  try {
    const ids = await getStoredNotificationIds();
    ids[khatmaId] = notificationId;
    await AsyncStorage.setItem(KHATMA_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error('Error saving notification ID:', error);
  }
};

// ===== REMOVE NOTIFICATION ID =====
const removeNotificationId = async (khatmaId: string): Promise<void> => {
  try {
    const ids = await getStoredNotificationIds();
    delete ids[khatmaId];
    await AsyncStorage.setItem(KHATMA_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error('Error removing notification ID:', error);
  }
};

// ===== SCHEDULE KHATMA REMINDER =====
export const scheduleKhatmaReminder = async (khatma: Khatma): Promise<string | null> => {
  try {
    if (!khatma.reminderEnabled || !khatma.reminderTime) {
      return null;
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permission');
      return null;
    }

    // Cancel existing reminder for this khatma
    await cancelKhatmaReminder(khatma.id);

    // Parse reminder time (format: "HH:mm")
    const parts = khatma.reminderTime.split(':').map(Number);
    const hours = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 0;
    const minutes = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;

    // Schedule daily notification with proper sound resolution
    const khatmaSoundKey = 'notif_khatma';
    const soundValue = resolveKhatmaSound(khatmaSoundKey, true);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(`📖 ${t('notifications.dailyWirdTitle')}`),
        body: dirText(`${t('notifications.dailyWirdBody')} - "${khatma.name}" - ${khatma.pagesPerDay}`),
        data: { 
          type: 'khatma_reminder', 
          khatmaId: khatma.id,
        },
        sound: soundValue,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId: getReminderChannelId(khatmaSoundKey) }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
        ...(Platform.OS === 'android' && { channelId: getReminderChannelId(khatmaSoundKey) }),
      },
    });

    // Save notification ID
    await saveNotificationId(khatma.id, notificationId);

    console.log(`Scheduled khatma reminder: ${notificationId} at ${hours}:${minutes}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling khatma reminder:', error);
    return null;
  }
};

// ===== CANCEL KHATMA REMINDER =====
export const cancelKhatmaReminder = async (khatmaId: string): Promise<boolean> => {
  try {
    const ids = await getStoredNotificationIds();
    const notificationId = ids[khatmaId];

    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await removeNotificationId(khatmaId);
      console.log(`Cancelled khatma reminder: ${notificationId}`);
    }

    return true;
  } catch (error) {
    console.error('Error cancelling khatma reminder:', error);
    return false;
  }
};

// ===== UPDATE KHATMA REMINDER =====
export const updateKhatmaReminder = async (khatma: Khatma): Promise<string | null> => {
  // Cancel existing and schedule new
  await cancelKhatmaReminder(khatma.id);
  
  if (khatma.reminderEnabled && khatma.reminderTime && !khatma.isCompleted) {
    return await scheduleKhatmaReminder(khatma);
  }
  
  return null;
};

// ===== CANCEL ALL KHATMA REMINDERS =====
export const cancelAllKhatmaReminders = async (): Promise<void> => {
  try {
    const ids = await getStoredNotificationIds();
    
    for (const notificationId of Object.values(ids)) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
    
    await AsyncStorage.removeItem(KHATMA_NOTIFICATION_IDS_KEY);
    console.log('Cancelled all khatma reminders');
  } catch (error) {
    console.error('Error cancelling all khatma reminders:', error);
  }
};

// ===== SEND IMMEDIATE NOTIFICATION (FOR TESTING) =====
export const sendTestKhatmaNotification = async (): Promise<void> => {
  if (!__DEV__) return;
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(`📖 ${t('notifications.testTitle')}`),
        body: dirText(t('notifications.testBody')),
        sound: resolveKhatmaSound('default', true),
        ...(Platform.OS === 'android' && { channelId: getReminderChannelId('default') }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: Platform.OS === 'android'
        ? { channelId: getReminderChannelId('default') }
        : null,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};

// ===== SEND COMPLETION NOTIFICATION =====
export const sendKhatmaCompletionNotification = async (khatmaName: string): Promise<void> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const completionSoundKey = 'complete';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(`🎉 ${t('notifications.khatmaComplete')}`),
        body: dirText(`${t('khatma.khatmaCompletedMsg')} - "${khatmaName}"`),
        sound: resolveKhatmaSound(completionSoundKey, true),
        data: { type: 'khatma_complete', soundType: completionSoundKey },
        ...(Platform.OS === 'android' && { channelId: getReminderChannelId(completionSoundKey) }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: Platform.OS === 'android'
        ? { channelId: getReminderChannelId(completionSoundKey) }
        : null,
    });
  } catch (error) {
    console.error('Error sending completion notification:', error);
  }
};

// ===== SEND WIRD COMPLETION NOTIFICATION =====
export const sendWirdCompletionNotification = async (): Promise<void> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const completionSoundKey = 'complete';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(`✅ ${t('notifications.wellDone')}`),
        body: dirText(t('khatma.wirdCompletedMsg')),
        sound: resolveKhatmaSound(completionSoundKey, true),
        data: { type: 'khatma_wird_complete', soundType: completionSoundKey },
        ...(Platform.OS === 'android' && { channelId: getReminderChannelId(completionSoundKey) }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: Platform.OS === 'android'
        ? { channelId: getReminderChannelId(completionSoundKey) }
        : null,
    });
  } catch (error) {
    console.error('Error sending wird completion notification:', error);
  }
};

// ===== GET SCHEDULED NOTIFICATIONS (FOR DEBUGGING) =====
export const getScheduledKhatmaNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return allNotifications.filter(
      (n) => n.content.data?.type === 'khatma_reminder'
    );
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};
