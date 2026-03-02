/**
 * Prayer Notifications Service
 * يدير جدولة إشعارات مواقيت الصلاة الخمس
 */
// lib/prayer-notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { fetchPrayerTimesByCoords, PRAYER_NAMES_AR } from './prayer-api';
import { getPrayerLocation, getSettings } from './storage';
// ✅ استورد الـ Types من الملف الجديد
import { 
  NotificationSettings, 
  DEFAULT_NOTIFICATION_SETTINGS,
  PrayerKey 
} from './notification-types';

// احذف تعريفات NotificationSettings و DEFAULT_NOTIFICATION_SETTINGS من هنا
// واستخدم الـ export من notification-types

// ✅ أضف re-export للـ types
export { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './notification-types';

// ... باقي الملف كما هو


// ─── إعداد سلوك الإشعارات ────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── أسماء الصلوات ──────────────────────────────────────────────────────────
const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type PrayerKey = typeof PRAYER_KEYS[number];

const PRAYER_EMOJIS: Record<PrayerKey, string> = {
  Fajr:    '🌙',
  Dhuhr:   '☀️',
  Asr:     '🌤',
  Maghrib: '🌇',
  Isha:    '✨',
};

const PRAYER_MESSAGES: Record<PrayerKey, string> = {
  Fajr:    'حان وقت صلاة الفجر — استيقظ على ذكر الله',
  Dhuhr:   'حان وقت صلاة الظهر — أقم الصلاة لذكر الله',
  Asr:     'حان وقت صلاة العصر — حافظ على الصلوات',
  Maghrib: 'حان وقت صلاة المغرب — الصلاة خير من النوم',
  Isha:    'حان وقت صلاة العشاء — ختم يومك بالصلاة',
};

// مدة التنبيه المسبق بالدقائق
export const ADHAN_ADVANCE_MINUTES = 0; // 0 = عند الوقت بالضبط

  advanceMinutes: 0,
  adhanSound: false,
};

// ─── طلب الأذونات ─────────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // المحاكي لا يدعم الإشعارات بالكامل
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-times', {
      name: 'مواقيت الصلاة',
      description: 'إشعارات بمواقيت الصلوات الخمس',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B6B3A',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ─── تحويل وقت الصلاة لـ Date object ─────────────────────────────────────────
function prayerTimeToDate(timeStr: string, advanceMinutes: number = 0): Date {
  const [hours, minutes] = timeStr.replace(' (PST)', '').replace(' (EST)', '').trim().split(':').map(Number);
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes - advanceMinutes,
    0,
    0
  );
  // لو الوقت عدى اليوم، جدول ليوم غداً
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

// ─── جدولة إشعارات اليوم ─────────────────────────────────────────────────────
export async function schedulePrayerNotifications(
  notifSettings: NotificationSettings
): Promise<void> {
  // إلغاء جميع الإشعارات القديمة أولاً
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!notifSettings.enabled) return;

  const hasPermission = await checkNotificationPermissions();
  if (!hasPermission) return;

  const location = await getPrayerLocation();
  if (!location) return;

  const appSettings = await getSettings();

  try {
    const prayerData = await fetchPrayerTimesByCoords(
      location.latitude,
      location.longitude,
      appSettings.calculationMethod
    );

    const scheduledIds: string[] = [];

    for (const prayerKey of PRAYER_KEYS) {
      if (!notifSettings.prayers[prayerKey]) continue;

      const timeStr = prayerData.timings[prayerKey];
      if (!timeStr) continue;

      const triggerDate = prayerTimeToDate(timeStr, notifSettings.advanceMinutes);
      const arabicName = PRAYER_NAMES_AR[prayerKey] || prayerKey;
      const emoji = PRAYER_EMOJIS[prayerKey];
      const message = notifSettings.advanceMinutes > 0
        ? `باقي ${notifSettings.advanceMinutes} دقيقة على ${arabicName} (${timeStr})`
        : PRAYER_MESSAGES[prayerKey];

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${emoji} ${arabicName}`,
            body: message,
            data: { prayer: prayerKey, time: timeStr },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        scheduledIds.push(id);
      } catch (e) {
        console.warn(`Failed to schedule ${prayerKey}:`, e);
      }
    }

    console.log(`✅ Scheduled ${scheduledIds.length} prayer notifications`);
  } catch (e) {
    console.error('Failed to fetch prayer times for notifications:', e);
  }
}

// ─── إلغاء جميع الإشعارات ────────────────────────────────────────────────────
export async function cancelAllPrayerNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── الحصول على الإشعارات المجدولة ───────────────────────────────────────────
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// ─── إعادة الجدولة اليومية ───────────────────────────────────────────────────
export async function rescheduleIfNeeded(notifSettings: NotificationSettings): Promise<void> {
  if (!notifSettings.enabled) return;
  const scheduled = await getScheduledNotifications();
  // لو مفيش إشعارات مجدولة أو أقل من 5، أعد الجدولة
  if (scheduled.length < 3) {
    await schedulePrayerNotifications(notifSettings);
  }
}
