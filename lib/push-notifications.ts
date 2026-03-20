// lib/push-notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '@/lib/i18n';

// ==================== Firebase Config ====================

const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

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
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return false;
    }

    // Android specific channel setup
    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// ==================== Android Channels ====================

const setupAndroidChannels = async (): Promise<void> => {
  // Prayer Times Channel
  await Notifications.setNotificationChannelAsync('prayer-times', {
    name: t('notifications.prayerTimesChannel'),
    description: t('notifications.prayerTimesDesc'),
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'general_reminder.mp3',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });

  // Azkar Channel
  await Notifications.setNotificationChannelAsync('azkar', {
    name: t('notifications.azkarChannel'),
    description: t('notifications.azkarDesc'),
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'general_reminder.mp3',
    vibrationPattern: [0, 250, 250, 250],
  });

  // Daily Ayah Channel
  await Notifications.setNotificationChannelAsync('daily-ayah', {
    name: t('notifications.dailyVerseChannel'),
    description: t('notifications.dailyVerseDesc'),
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'general_reminder.mp3',
    vibrationPattern: [0, 250, 250, 250],
  });

  // General Updates Channel
  await Notifications.setNotificationChannelAsync('general', {
    name: t('notifications.generalChannel'),
    description: t('notifications.generalDesc'),
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'general_reminder.mp3',
  });

  // Seasonal Content Channel
  await Notifications.setNotificationChannelAsync('seasonal', {
    name: t('notifications.seasonalChannel'),
    description: t('notifications.seasonalChannelDesc'),
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'general_reminder.mp3',
  });
};

/**
 * Create or get a dynamic Android notification channel for a specific sound.
 * Android channels are immutable after creation — so we create one per sound type.
 * Returns the channelId to use when scheduling the notification.
 */
export const getOrCreateSoundChannel = async (
  baseChannel: string,
  soundType?: string,
): Promise<string> => {
  if (Platform.OS !== 'android') return baseChannel;
  if (!soundType || soundType === 'default' || soundType === 'general_reminder') return baseChannel;

  const channelId = `${baseChannel}_${soundType}`;
  const soundFile = `${soundType}.mp3`;

  // Channel names for user display
  const channelNames: Record<string, string> = {
    'prayer-times': t('notifications.prayerTimesChannel'),
    azkar: t('notifications.azkarChannel'),
    'daily-ayah': t('notifications.dailyVerseChannel'),
    general: t('notifications.generalChannel'),
  };

  try {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: `${channelNames[baseChannel] || baseChannel} (${soundType})`,
      importance: Notifications.AndroidImportance.HIGH,
      sound: soundFile,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (e) {
    console.warn(`Failed to create channel ${channelId}:`, e);
    return baseChannel; // fallback to default channel
  }

  return channelId;
};

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
  // Extract channelId from trigger (if present) and move it to content
  let channelId: string | undefined;
  if (trigger && typeof trigger === 'object' && 'channelId' in trigger) {
    channelId = (trigger as any).channelId;
    const { channelId: _, ...triggerWithoutChannel } = trigger as any;
    trigger = triggerWithoutChannel;
  }

  const soundEnabled = options?.sound !== false;
  const vibrationEnabled = options?.vibration !== false;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' && channelId && { channelId }),
      ...(Platform.OS === 'android' && !vibrationEnabled && { vibrate: [0] }),
    },
    trigger,
  });
  return id;
};

export const schedulePrayerNotification = async (
  prayerName: string,
  prayerTime: Date,
  minutesBefore: number = 0
): Promise<string> => {
  const triggerDate = new Date(prayerTime);
  triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);

  // Don't schedule if time is in the past
  if (triggerDate <= new Date()) return '';

  const notification: PushNotificationData = {
    title: minutesBefore > 0 
      ? `⏰ ${prayerName} ${t('notifications.afterMinutes').replace('{0}', String(minutesBefore))}`
      : `🕌 ${t('notifications.prayerTimeArrived')} ${prayerName}`,
    body: minutesBefore > 0
      ? `${t('notifications.prepareForPrayer')} ${prayerName}`
      : t('notifications.prayNow'),
    data: { type: 'prayer', prayer: prayerName },
  };

  return scheduleLocalNotification(notification, {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: triggerDate,
    channelId: 'prayer-times',
  });
};

export const scheduleAzkarReminder = async (
  azkarType: 'morning' | 'evening' | 'sleep',
  time: Date
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
    channelId: 'azkar',
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
