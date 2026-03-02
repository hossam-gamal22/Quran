import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Khatma } from './khatma-storage';

// ===== STORAGE KEY =====
const KHATMA_NOTIFICATION_IDS_KEY = '@rooh_muslim_khatma_notification_ids';

// ===== TYPES =====
interface KhatmaNotificationIds {
  [khatmaId: string]: string; // khatmaId -> notificationId
}

// ===== CONFIGURE NOTIFICATIONS =====
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

    // Configure for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('khatma-reminders', {
        name: 'تذكيرات الختمة',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2f7659',
        sound: 'default',
      });
    }

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
    const [hours, minutes] = khatma.reminderTime.split(':').map(Number);

    // Schedule daily notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📖 وقت الورد اليومي',
        body: `حان وقت قراءة وردك من "${khatma.name}" - ${khatma.pagesPerDay} صفحة`,
        data: { 
          type: 'khatma_reminder', 
          khatmaId: khatma.id,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'khatma-reminders' : undefined,
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
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📖 تجربة إشعار الختمة',
        body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات',
        sound: 'default',
      },
      trigger: null, // Immediate
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

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 مبارك! أتممت الختمة',
        body: `تهانينا! لقد أتممت "${khatmaName}" بنجاح. بارك الله فيك وجعله في ميزان حسناتك.`,
        sound: 'default',
      },
      trigger: null, // Immediate
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

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ أحسنت!',
        body: 'تم تسجيل إتمام ورد اليوم. استمر على هذا النهج الطيب!',
        sound: 'default',
      },
      trigger: null, // Immediate
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
