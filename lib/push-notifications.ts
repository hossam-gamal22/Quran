// lib/push-notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from './i18n';
import { dirText } from './notification-text-direction';
import { getAdhanChannelId, getReminderChannelId } from '../services/notifications/channels';
import { markPermissionRequested } from './permission-recovery';

// ==================== Types ====================

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  prayerReminders: boolean;
  azkarReminders: boolean;
  dailyAyah: boolean;
  seasonalContent: boolean;
  generalUpdates: boolean;
}

// Storage Keys
const STORAGE_KEYS = {
  FCM_TOKEN: '@fcm_token',
  NOTIFICATION_SETTINGS: '@notification_settings',
  DEVICE_REGISTERED: '@device_registered',
};

// ==================== Configure Notifications ====================

// Note: setNotificationHandler is configured in app/_layout.tsx

// ==================== Permission Functions ====================

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      if (Platform.OS === 'android') {
        await markPermissionRequested('notifications');
      }
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return false;
    }

    // Android channels are pre-created at startup in services/notifications/channels.ts
    // via initializeAllNotificationChannels() called from app/_layout.tsx

    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// ==================== Android Channels ====================
// Channels are pre-created at startup in services/notifications/channels.ts
// Use getAdhanChannelId() / getReminderChannelId() to resolve the correct channel.

// ==================== FCM Token Functions ====================

export const getFCMToken = async (): Promise<string | null> => {
  try {
    // Check cached token first
    const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
    if (cachedToken) {
      return cachedToken;
    }

    // Get Expo push token (works with FCM on Android, APNs on iOS)
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '12ffec15-6357-43b4-a309-8e71cc2afc8c',
    });

    if (token.data) {
      await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token.data);
      return token.data;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const refreshFCMToken = async (): Promise<string | null> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
    return await getFCMToken();
  } catch (error) {
    console.error('Error refreshing FCM token:', error);
    return null;
  }
};

// ==================== Register Device ====================

export const registerDeviceForPushNotifications = async (): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> => {
  try {
    // Check if already registered
    const isRegistered = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_REGISTERED);
    if (isRegistered === 'true') {
      const token = await getFCMToken();
      return { success: true, token: token || undefined };
    }

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      return { success: false, error: 'Failed to get FCM token' };
    }

    // TODO: Send token to your backend server
    // await sendTokenToServer(token);

    // Mark as registered
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_REGISTERED, 'true');

    return { success: true, token };
  } catch (error) {
    console.error('Error registering device:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// ==================== Notification Settings ====================

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error('Error getting notification settings:', error);
  }

  // Default settings
  return {
    enabled: true,
    prayerReminders: true,
    azkarReminders: true,
    dailyAyah: true,
    seasonalContent: true,
    generalUpdates: true,
  };
};

export const saveNotificationSettings = async (
  settings: NotificationSettings
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.NOTIFICATION_SETTINGS,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
};

// ==================== Local Notifications ====================

export const scheduleLocalNotification = async (
  notification: PushNotificationData,
  trigger: Notifications.NotificationTriggerInput,
  options?: { sound?: boolean; vibration?: boolean }
): Promise<string> => {
  const soundEnabled = options?.sound !== false;
  const vibrationEnabled = options?.vibration !== false;

  // Mirror channelId from trigger into content for Android belt-and-suspenders
  const triggerChannelId = trigger && typeof trigger === 'object' && 'channelId' in trigger
    ? (trigger as { channelId?: string }).channelId
    : undefined;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(notification.title),
        body: dirText(notification.body),
        data: notification.data,
        sound: soundEnabled ? 'default' : undefined,
        ...(Platform.OS === 'android' && !vibrationEnabled && { vibrate: [0] }),
        ...(Platform.OS === 'android' && triggerChannelId && { channelId: triggerChannelId }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger,
    });
    return id;
  } catch (e) {
    console.warn('[PushNotifications] scheduleLocalNotification failed:', e);
    return '';
  }
};

export const schedulePrayerNotification = async (
  prayerName: string,
  prayerTime: Date,
  minutesBefore: number = 0,
  soundKey?: string,
): Promise<string> => {
  const triggerDate = new Date(prayerTime);
  triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);

  // Don't schedule if time is in the past
  if (triggerDate <= new Date()) return '';

  const effectiveSoundKey = (!soundKey || soundKey === 'default') ? 'makkah' : soundKey.replace(/\.mp3$/, '');
  // Layer 2 safety net: always play short adhan via system notification channel.
  // Patched expo-notifications additionally starts AdhanPlaybackService when
  // androidFullAdhan='true', so the full recording plays in parallel via STREAM_ALARM.
  // If the service fails for any reason, the user still hears the short adhan.
  const shouldUseAndroidFullAdhan = Platform.OS === 'android' && effectiveSoundKey !== 'silent';

  const notification: PushNotificationData = {
    title: minutesBefore > 0
      ? `⏰ ${prayerName} ${t('notifications.afterMinutes').replace('{0}', String(minutesBefore))}`
      : `🕌 ${t('notifications.prayerTimeArrived')} ${prayerName}`,
    body: minutesBefore > 0
      ? `${t('notifications.prepareForPrayer')} ${prayerName}`
      : t('notifications.prayNow'),
    data: {
      type: 'prayer',
      prayer: prayerName,
      soundType: effectiveSoundKey,
      ...(shouldUseAndroidFullAdhan && { androidFullAdhan: 'true' }),
    },
  };

  return scheduleLocalNotification(notification, {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: triggerDate,
    channelId: getAdhanChannelId(effectiveSoundKey),
  });
};

export const scheduleAzkarReminder = async (
  azkarType: 'morning' | 'evening' | 'sleep',
  time: Date,
  soundKey?: string,
): Promise<string> => {
  // Don't schedule if time is in the past
  if (time <= new Date()) return '';

  const titles = {
    morning: '☀️ ' + t('home.morningAzkar'),
    evening: '🌅 ' + t('home.eveningAzkar'),
    sleep: '🌙 ' + t('home.sleepAzkar'),
  };

  const notification: PushNotificationData = {
    title: titles[azkarType],
    body: t('notifications.timeForAzkar'),
    data: { type: 'azkar', category: azkarType },
  };

  return scheduleLocalNotification(notification, {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: time,
    channelId: getReminderChannelId(soundKey),
  });
};

// ==================== Cancel Notifications ====================

export const cancelNotification = async (id: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(id);
};

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// ==================== Notification Listeners ====================

export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription => {
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// ==================== Badge ====================

export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

export const clearBadge = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
};

// ==================== Get Scheduled Notifications ====================

export const getScheduledNotifications = async (): Promise<
  Notifications.NotificationRequest[]
> => {
  return Notifications.getAllScheduledNotificationsAsync();
};
