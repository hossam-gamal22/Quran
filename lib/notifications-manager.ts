/**
 * Notifications Manager — مدير الإشعارات الشامل
 * يدير: أذان الصلاة، الورد اليومي، سورة الكهف الجمعة، الآية اليومية
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schedulePrayerNotifications } from './prayer-notifications';
import { fetchTafsir } from './quran-api';
import { getAyahAudioUrl } from './quran-cache';
import { fetchPrayerTimesByCoords } from './prayer-api';
import { getPrayerLocation, getSettings } from './storage';
import type { NotificationSettings as PrayerNotifSettings } from './notification-types';
import { getReminderChannelId } from '../services/notifications/channels';
import { t } from './i18n';
import { dirText } from './notification-text-direction';
import { safeParseTime } from './safe-parse-time';
import { resolveNotificationSound } from './resolve-notification-sound';
import { fetchNotificationTexts, getNotifText } from './notification-texts';
export { resolveNotificationSound } from './resolve-notification-sound';
import { getNotificationIconAttachment } from './notification-icons';

// ─── Shared Scheduling Mutex ─────────────────────────────────────────────────
// Prevents concurrent calls to scheduleNotificationsFromSettings from different
// code paths (loadSettings, syncNotificationDefaults, rescheduleAllFromStorage)
// that would cause cancelAll to wipe each other's work.
// When a call is skipped due to the mutex, the latest settings are stored in
// _pendingReschedule. After the current run completes, if pending exists,
// another run is triggered with the latest settings automatically.
let _isScheduling = false;
let _pendingReschedule: Record<string, any> | null = null;
let _schedulingStartedAt = 0;
const MUTEX_TIMEOUT_MS = 30_000; // Force-release after 30 seconds

// ─── Refresh Reminder Constants ──────────────────────────────────────────────
const REFRESH_REMINDER_PREFIX = 'refresh_reminder';
// Default day 6 — dynamically adjusted by iOS budget allocator
let _refreshReminderDay = 6;

// ─── iOS Dynamic Budget Allocator ────────────────────────────────────────────
// iOS hard-limits local scheduled notifications to 64. Excess is silently dropped.
// This allocator distributes days across tiers in priority order:
//   Tier 1: Prayer (min 3, max 7) — highest priority
//   Tier 2: After-prayer azkar (min 1, follows prayer)
//   Tier 3: Azkar (morning/evening/sleep/wakeup, min 1)
//   Tier 4: Other reminders (min 1)
// Fixed slots: refresh(1) + kahf(≤2) + worship_weekly(≤2) = up to 5
interface IosBudgetAllocation {
  prayerDays: number;
  afterPrayerDays: number;
  azkarDays: number;
  otherDays: number;
  refreshDay: number;
}

function calculateIosBudget(params: {
  prayer: boolean;
  afterPrayer: boolean;
  azkarTimesPerDay: number;   // total times/day across all 4 azkar categories
  otherTimesPerDay: number;   // total times/day across all other categories
  kahfEnabled: boolean;
  worshipWeeklyEnabled: boolean;
}): IosBudgetAllocation {
  const IOS_MAX = 64;
  const fixedSlots = 1 /* refresh */
    + (params.kahfEnabled ? 2 : 0)
    + (params.worshipWeeklyEnabled ? 2 : 0);
  let remaining = IOS_MAX - fixedSlots;

  const prayerCost = params.prayer ? 5 : 0;
  const afterPrayerCost = params.afterPrayer ? 5 : 0;
  const azkarCost = params.azkarTimesPerDay;
  const otherCost = params.otherTimesPerDay;

  // Nothing enabled → max days for everything
  if (prayerCost + afterPrayerCost + azkarCost + otherCost === 0) {
    return { prayerDays: 7, afterPrayerDays: 7, azkarDays: 7, otherDays: 7, refreshDay: 6 };
  }

  // Step 1: Reserve minimum for each active tier
  const prayerMin = prayerCost > 0 ? 3 : 0;
  const afterPrayerMin = afterPrayerCost > 0 ? 1 : 0;
  const azkarMin = azkarCost > 0 ? 1 : 0;
  const otherMin = otherCost > 0 ? 1 : 0;

  let prayerDays = prayerMin;
  let afterPrayerDays = afterPrayerMin;
  let azkarDays = azkarMin;
  let otherDays = otherMin;

  const minCost = prayerMin * prayerCost + afterPrayerMin * afterPrayerCost
    + azkarMin * azkarCost + otherMin * otherCost;

  // If minimums already exceed budget, do best-effort
  if (minCost > remaining) {
    // Give prayer whatever fits, others get 1 day if possible
    const otherReserve = afterPrayerMin * afterPrayerCost + azkarMin * azkarCost + otherMin * otherCost;
    prayerDays = prayerCost > 0 ? Math.max(1, Math.floor((remaining - otherReserve) / prayerCost)) : 0;
    remaining -= prayerDays * prayerCost + afterPrayerDays * afterPrayerCost
      + azkarDays * azkarCost + otherDays * otherCost;
  } else {
    remaining -= minCost;
  }

  // Step 2: Distribute surplus — prayer first (highest priority)
  if (prayerCost > 0 && remaining > 0) {
    const extra = Math.min(7 - prayerDays, Math.floor(remaining / prayerCost));
    prayerDays += extra;
    remaining -= extra * prayerCost;
  }

  // After-prayer follows prayer (capped at prayer days)
  if (afterPrayerCost > 0 && remaining > 0) {
    const extra = Math.min(prayerDays - afterPrayerDays, Math.floor(remaining / afterPrayerCost));
    afterPrayerDays += extra;
    remaining -= extra * afterPrayerCost;
  }

  // Azkar
  if (azkarCost > 0 && remaining > 0) {
    const extra = Math.min(7 - azkarDays, Math.floor(remaining / azkarCost));
    azkarDays += extra;
    remaining -= extra * azkarCost;
  }

  // Other
  if (otherCost > 0 && remaining > 0) {
    const extra = Math.min(7 - otherDays, Math.floor(remaining / otherCost));
    otherDays += extra;
    remaining -= extra * otherCost;
  }

  // Refresh fires 2 days before shortest window expires (minimum day 1)
  // Extra day gives user more buffer before notifications expire
  const allWindows = [
    ...(prayerDays > 0 ? [prayerDays] : []),
    ...(afterPrayerDays > 0 ? [afterPrayerDays] : []),
    ...(azkarDays > 0 ? [azkarDays] : []),
    ...(otherDays > 0 ? [otherDays] : []),
  ];
  const shortest = allWindows.length > 0 ? Math.min(...allWindows) : 7;
  const refreshDay = Math.max(1, shortest - 2);

  const used = prayerDays * prayerCost + afterPrayerDays * afterPrayerCost
    + azkarDays * azkarCost + otherDays * otherCost + fixedSlots;
  console.log(
    `📊 [iOS Budget] prayer=${prayerDays}d after=${afterPrayerDays}d azkar=${azkarDays}d other=${otherDays}d | ` +
    `${used}/${IOS_MAX} slots | refresh=day${refreshDay}`
  );

  return { prayerDays, afterPrayerDays, azkarDays, otherDays, refreshDay };
}

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  ALL_NOTIF: '@notif_settings_v2',
};

// ─── Persistent Scheduling Diagnostic Log (Phase A) ──────────────────────────
// Writes the last reschedule result to AsyncStorage so it survives process death
// and can be inspected in settings or via ADB without a live logcat session.
const DIAG_LOG_KEY = '@notification_diag_log';
const MAX_DIAG_ENTRIES = 10;

interface DiagEntry {
  ts: string; // ISO timestamp
  total: number;
  prayer: number;
  warn?: string; // non-empty if something went wrong
  sounds: Record<string, string>; // category → channelId
}

async function persistDiagLog(entry: DiagEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DIAG_LOG_KEY);
    let entries: DiagEntry[] = [];
    if (raw) {
      try { entries = JSON.parse(raw); } catch {}
    }
    entries.unshift(entry);
    if (entries.length > MAX_DIAG_ENTRIES) entries.length = MAX_DIAG_ENTRIES;
    await AsyncStorage.setItem(DIAG_LOG_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('[diag-log] Failed to persist:', e);
  }
}

/** Read the diagnostic log — useful for a future "debug info" settings page. */
export async function readDiagLog(): Promise<DiagEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(DIAG_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
export type AdhanType = 'full' | 'simple';

export interface AllNotificationSettings {
  // أذان الصلاة
  adhanEnabled: boolean;
  adhanType: AdhanType; // 'full' = أذان كامل, 'simple' = أذان بسيط
  prayers: {
    Fajr: boolean;
    Dhuhr: boolean;
    Asr: boolean;
    Maghrib: boolean;
    Isha: boolean;
  };
  adhanAdvanceMinutes: number; // 0=عند الوقت, 5=قبل 5 دقائق

  // الورد اليومي
  wirdEnabled: boolean;
  wirdMorningTime: string;   // "07:00"
  wirdEveningTime: string;   // "17:00"

  // سورة الكهف — الجمعة
  kahfEnabled: boolean;
  kahfTime: string;           // "14:00"

  // آية يومية
  dailyAyahEnabled: boolean;
  dailyAyahTime: string;      // "06:00"
}

// ─── Adhan Audio URLs ────────────────────────────────────────────────────────
// Full adhan: Mishary Rashid Al-Afasy (~3 minutes)
export const ADHAN_AUDIO = {
  full: 'https://cdn.aladhan.com/audio/adhans/1.mp3',
  simple: 'https://cdn.aladhan.com/audio/adhans/7.mp3',
} as const;

export const DEFAULT_ALL_NOTIF: AllNotificationSettings = {
  adhanEnabled: false,
  adhanType: 'full',
  prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  adhanAdvanceMinutes: 0, // Always zero — adhan fires at exact prayer time
  wirdEnabled: false,
  wirdMorningTime: '07:00',
  wirdEveningTime: '17:00',
  kahfEnabled: false,
  kahfTime: '14:00', // Fallback only — actual time is Dhuhr + 2h (calculated dynamically)
  dailyAyahEnabled: false,
  dailyAyahTime: '06:30',
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
export async function getAllNotifSettings(): Promise<AllNotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ALL_NOTIF);
    return data ? { ...DEFAULT_ALL_NOTIF, ...JSON.parse(data) } : DEFAULT_ALL_NOTIF;
  } catch {
    return DEFAULT_ALL_NOTIF;
  }
}

export async function saveAllNotifSettings(
  settings: Partial<AllNotificationSettings>
): Promise<void> {
  const current = await getAllNotifSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(KEYS.ALL_NOTIF, JSON.stringify(updated));
}

// ─── Permission ───────────────────────────────────────────────────────────────
export async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Parse time string to hours/minutes ──────────────────────────────────────
function parseTime(timeStr: string): { hour: number; minute: number } {
  return safeParseTime(timeStr);
}

// ─── Schedule Wird Daily ─────────────────────────────────────────────────────
export async function scheduleWirdNotifications(
  settings: AllNotificationSettings,
  soundType: string = 'general_reminder'
): Promise<void> {
  // Cancel existing wird notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const id = n.identifier;
    if (id.startsWith('wird_')) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  if (!settings.wirdEnabled) return;
  const hasPermission = await requestNotifPermission();
  if (!hasPermission) return;

  const morning = parseTime(settings.wirdMorningTime);
  const evening = parseTime(settings.wirdEveningTime);

  // Get the pre-created channel for the user's selected sound
  const resolvedChannelId = getReminderChannelId(soundType);

  // Morning wird
  try {
    const morningAttachments = await getNotificationIconAttachment('morning');
    await Notifications.scheduleNotificationAsync({
      identifier: 'wird_morning',
      content: {
        title: dirText(t('settings.morningWirdTitle')),
        body: dirText(t('settings.morningWirdBody')),
        sound: resolveNotificationSound(soundType, true),
        data: { type: 'wird', period: 'morning', soundType, iconType: 'morning' },
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
        ...(Platform.OS === 'ios' && morningAttachments && { attachments: morningAttachments }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: morning.hour,
        minute: morning.minute,
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
      },
    });
  } catch (err) {
    console.error('❌ Failed to schedule wird_morning:', err);
  }

  // Evening wird
  try {
    const eveningAttachments = await getNotificationIconAttachment('evening');
    await Notifications.scheduleNotificationAsync({
      identifier: 'wird_evening',
      content: {
        title: dirText(t('settings.eveningWirdTitle')),
        body: dirText(t('settings.eveningWirdBody')),
        sound: resolveNotificationSound(soundType, true),
        data: { type: 'wird', period: 'evening', soundType, iconType: 'evening' },
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
        ...(Platform.OS === 'ios' && eveningAttachments && { attachments: eveningAttachments }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: evening.hour,
        minute: evening.minute,
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
      },
    });
  } catch (err) {
    console.error('❌ Failed to schedule wird_evening:', err);
  }
}

// ─── Schedule Daily Ayah ──────────────────────────────────────────────────────
const DAILY_AYAHS = [
  { text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ﴿الشرح: ٥﴾', surah: 94, ayah: 5 },
  { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴿الطلاق: ٣﴾', surah: 65, ayah: 3 },
  { text: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴿البقرة: ١٥٣﴾', surah: 2, ayah: 153 },
  { text: 'وَبَشِّرِ الصَّابِرِينَ ﴿البقرة: ١٥٥﴾', surah: 2, ayah: 155 },
  { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ ﴿البقرة: ١٥٢﴾', surah: 2, ayah: 152 },
  { text: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ﴿الحديد: ٤﴾', surah: 57, ayah: 4 },
  { text: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ ﴿التوبة: ١٢٠﴾', surah: 9, ayah: 120 },
];

export async function scheduleDailyAyahNotification(
  settings: AllNotificationSettings,
  soundType: string = 'notif_verse'
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily_ayah');
  } catch {}

  if (!settings.dailyAyahEnabled) return;
  const hasPermission = await requestNotifPermission();
  if (!hasPermission) return;

  const { hour, minute } = parseTime(settings.dailyAyahTime);
  const dayIndex = new Date().getDay();
  const ayahData = DAILY_AYAHS[dayIndex % DAILY_AYAHS.length];

  // Get the pre-created channel for the verse notification sound
  const verseSound = 'notif_verse';
  const resolvedChannelId = getReminderChannelId(verseSound);

  try {
    const quranAttachments = await getNotificationIconAttachment('quran');
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily_ayah',
      content: {
        title: dirText(t('settings.dailyAyahTitle')),
        body: dirText(ayahData.text),
        sound: resolveNotificationSound(verseSound, true),
        data: { type: 'daily_ayah', soundType: verseSound, iconType: 'quran' },
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
        ...(Platform.OS === 'ios' && quranAttachments && { attachments: quranAttachments }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
      },
    });
  } catch (err) {
    console.error('❌ Failed to schedule daily_ayah:', err);
  }
}

// ─── Schedule All ─────────────────────────────────────────────────────────────
export async function scheduleAllNotifications(
  settings: AllNotificationSettings,
  soundType: string = 'general_reminder'
): Promise<void> {
  const results = await Promise.allSettled([
    scheduleWirdNotifications(settings, soundType),
    scheduleDailyAyahNotification(settings, soundType),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.warn('Notification scheduling failed:', r.reason);
    }
  }
}

// ─── Cancel All Non-Prayer ────────────────────────────────────────────────────
export async function cancelAllCustomNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const id = n.identifier;
    if (!id.startsWith('prayer_') && !id.startsWith(REFRESH_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }
}

// ─── Bridge: Schedule from SettingsContext notification settings ───────────────

/**
 * Fetch admin-assigned notification sound defaults from Firestore.
 * Returns a map of admin category → sound key, or empty if not configured.
 * Used as fallback when user hasn't explicitly chosen a sound type.
 */
async function getAdminNotificationDefaults(): Promise<Record<string, string>> {
  try {
    const { fetchSoundSettings } = await import('./sound-manager');
    const settings = await fetchSoundSettings();
    if (!settings?.notifications) return {};
    return settings.notifications as Record<string, string>;
  } catch {
    return {};
  }
}

/** Resolve a user sound type with admin default fallback */
function resolveWithAdminDefault(
  userType: string | undefined,
  adminDefaults: Record<string, string>,
  adminKey: string,
  hardDefault: string,
): string {
  if (userType && userType !== 'default') return userType;
  if (adminDefaults[adminKey]) return adminDefaults[adminKey];
  return hardDefault;
}

// ─── Schedule Kahf Friday Reminder ────────────────────────────────────────────
/**
 * Schedule or cancel the Friday Surah Al-Kahf reminder notification.
 * This is a standalone function that can be called from the Kahf page settings.
 */
export async function scheduleKahfReminder(): Promise<void> {
  try {
    // Cancel all existing kahf notifications (including multi-week DATE variants)
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith('kahf_friday')) {
        try { await Notifications.cancelScheduledNotificationAsync(n.identifier); } catch {}
      }
    }

    // Get current settings
    const allSettings = await getAllNotifSettings();
    if (!allSettings.kahfEnabled) {
      console.log('🔕 Kahf Friday reminder disabled');
      return;
    }

    const hasPermission = await requestNotifPermission();
    if (!hasPermission) return;

    // Default: 2 hours after Friday Dhuhr prayer. Falls back to user-set time or 14:00.
    let kahfHour = 14;
    let kahfMinute = 0;
    let kahfUsesDynamicTime = false;

    // Try to compute Kahf time as Dhuhr + 2 hours from prayer API
    try {
      const kahfLocation = await getPrayerLocation();
      if (kahfLocation) {
        const kahfAppSettings = await getSettings();
        const { fetchMonthlyPrayerTimes } = await import('./prayer-api');
        const nowForKahf = new Date();
        const kahfMonthData = await fetchMonthlyPrayerTimes(
          kahfLocation.latitude, kahfLocation.longitude,
          nowForKahf.getMonth() + 1, nowForKahf.getFullYear(),
          kahfAppSettings.calculationMethod
        );
        if (kahfMonthData && Array.isArray(kahfMonthData)) {
          const tempFri = new Date(nowForKahf);
          const daysToFri = (5 - tempFri.getDay() + 7) % 7;
          tempFri.setDate(tempFri.getDate() + daysToFri);
          if (tempFri <= nowForKahf) tempFri.setDate(tempFri.getDate() + 7);
          const friDayOfMonth = tempFri.getDate();

          const dayData = kahfMonthData.find((d: any) => {
            const dDate = d?.date?.gregorian?.day;
            return dDate && parseInt(dDate, 10) === friDayOfMonth;
          });
          const dhuhrStr = dayData?.timings?.Dhuhr;
          if (dhuhrStr) {
            const cleanTime = dhuhrStr.replace(/\s*\(.*\)/, '').trim();
            const [dH, dM] = cleanTime.split(':').map(Number);
            if (!isNaN(dH) && !isNaN(dM)) {
              kahfHour = dH + 2;
              kahfMinute = dM;
              if (kahfHour >= 24) kahfHour -= 24;
              kahfUsesDynamicTime = true;
              console.log(`🕌 Kahf time calculated: Dhuhr(${dH}:${String(dM).padStart(2, '0')}) + 2h = ${kahfHour}:${String(kahfMinute).padStart(2, '0')}`);
            }
          }
        }
      }
    } catch (kahfLocErr) {
      console.warn('⚠️ Failed to fetch Dhuhr for Kahf — falling back to fixed time:', kahfLocErr);
    }

    // Fallback: use user-set kahfTime if dynamic calculation failed
    if (!kahfUsesDynamicTime) {
      const timeStr = allSettings.kahfTime || '14:00';
      const [fH, fM] = timeStr.split(':').map(Number);
      if (!isNaN(fH) && !isNaN(fM)) {
        kahfHour = fH;
        kahfMinute = fM;
      }
    }

    // Get current language for notifications
    const lang = 'ar'; // Default to Arabic for Quran notifications

    // First ayah of Surah Al-Kahf (18:1) - Arabic text for notification body
    const KAHF_FIRST_AYAH_TEXT = 'الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَل لَّهُ عِوَجًا ۜ';
    const KAHF_FIRST_AYAH_GLOBAL = 2141;
    const kahfAyahAudioUrl = getAyahAudioUrl('ar.alafasy', KAHF_FIRST_AYAH_GLOBAL);
    const kahfSoundType = 'notif_kahf';
    const kahfChannelId = getReminderChannelId(kahfSoundType);

    const kahfAttachments = await getNotificationIconAttachment('quran');

    // Schedule next Fridays as DATE triggers (iOS: 2 to stay within budget)
    const now = new Date();
    const KAHF_WEEKS = Platform.OS === 'ios' ? 2 : 4;
    const firstFri = new Date(now.getFullYear(), now.getMonth(), now.getDate(), kahfHour, kahfMinute, 0, 0);
    const daysTilFri = (5 - firstFri.getDay() + 7) % 7;
    firstFri.setDate(firstFri.getDate() + daysTilFri);
    if (firstFri <= now) firstFri.setDate(firstFri.getDate() + 7);

    let scheduledCount = 0;
    for (let w = 0; w < KAHF_WEEKS; w++) {
      const triggerDate = new Date(firstFri.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      if (triggerDate <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `kahf_friday_f${w}`,
        content: {
          title: dirText(getNotifText('friday', t('settings.kahfTitle'), `${t('settings.kahfBody')}\n\n﴿ ${KAHF_FIRST_AYAH_TEXT} ﴾`, lang).title),
          body: dirText(getNotifText('friday', t('settings.kahfTitle'), `${t('settings.kahfBody')}\n\n﴿ ${KAHF_FIRST_AYAH_TEXT} ﴾`, lang).body),
          sound: resolveNotificationSound(kahfSoundType, true),
          data: {
            type: 'kahf',
            soundType: kahfSoundType,
            iconType: 'quran',
            ayahAudioUrl: kahfAyahAudioUrl,
            ayahText: KAHF_FIRST_AYAH_TEXT,
            surah: 18,
            ayah: 1,
          },
          ...(Platform.OS === 'android' && { channelId: kahfChannelId }),
          ...(Platform.OS === 'ios' && kahfAttachments && { attachments: kahfAttachments }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          ...(Platform.OS === 'android' && { channelId: kahfChannelId }),
        },
      });
      scheduledCount++;
    }

    console.log(`🔔 Scheduled Kahf Friday × ${scheduledCount} at ${kahfHour}:${String(kahfMinute).padStart(2, '0')}`);
  } catch (err) {
    console.error('❌ Failed to schedule kahf_friday:', err);
  }
}

/**
 * Maps the SettingsContext's NotificationSettings shape to the scheduling
 * functions used by prayer-notifications.ts and this module.
 * Called when notification settings change and on app init.
 */
export async function scheduleNotificationsFromSettings(notifSettings: {
  enabled: boolean;
  prayerTimes: boolean;
  prayerReminder: boolean;
  reminderMinutes: number;
  didYouPrayReminder?: boolean;
  didYouPrayDelayMinutes?: number;
  didYouPraySnoozeMinutes?: number;
  morningAzkar: boolean;
  morningAzkarTime: string;
  eveningAzkar: boolean;
  eveningAzkarTime: string;
  sleepAzkar: boolean;
  sleepAzkarTime: string;
  wakeupAzkar: boolean;
  wakeupAzkarTime: string;
  afterPrayerAzkar: boolean;
  dailyVerse: boolean;
  dailyVerseTime: string;
  sound: boolean;
  vibration: boolean;
  // Sound type selections
  soundType?: string;
  adhanSoundType?: string;
  // Per-category sound types for foreground playback
  azkarSoundType?: string;
  dailyVerseSoundType?: string;
  salawatReminder?: boolean;
  salawatReminderTime?: string;
  salawatSoundType?: string;
  tasbihReminder?: boolean;
  tasbihReminderTime?: string;
  tasbihSoundType?: string;
  istighfarReminder?: boolean;
  istighfarReminderTime?: string;
  istighfarSoundType?: string;
  customReminder?: boolean;
  customReminderTime?: string;
  customReminderTitle?: string;
  customReminderSoundType?: string;
  customReminderContentType?: 'text' | 'ayah' | 'surah' | 'azkar' | 'dua';
  customReminderSurah?: number;
  customReminderAyah?: number;
  customReminderReciter?: string;
  // Per-category day-of-week (1=Sun...7=Sat, empty/undefined = every day)
  salawatDays?: number[];
  tasbihDays?: number[];
  istighfarDays?: number[];
  azkarDays?: number[];
  dailyVerseDays?: number[];
  customReminderDays?: number[];
  // Quran reading reminder
  quranReadingReminder?: boolean;
  quranReadingReminderTime?: string;
  quranReminderDays?: number[];
  quranReminderSoundType?: string;
  // Worship tracking notifications
  worshipPrayerLogging?: boolean;
  worshipDailySummary?: boolean;
  worshipDailySummaryTime?: string;
  worshipStreakAlerts?: boolean;
  worshipWeeklyReport?: boolean;
  worshipWeeklyReportTime?: string;
  // Friday Surah Al-Kahf reminder
  kahfReminder?: boolean;
  kahfTime?: string;
  // Multi-time scheduling (up to 3 times per category)
  morningAzkarTimes?: string[];
  eveningAzkarTimes?: string[];
  sleepAzkarTimes?: string[];
  wakeupAzkarTimes?: string[];
  dailyVerseTimes?: string[];
  salawatReminderTimes?: string[];
  tasbihReminderTimes?: string[];
  istighfarReminderTimes?: string[];
  customReminderTimes?: string[];
  quranReadingReminderTimes?: string[];
}): Promise<void> {
  // ─── Mutex Guard: Prevent concurrent scheduling ───────────────────────────
  // Multiple code paths call this function on cold start (loadSettings,
  // syncNotificationDefaults). Without this guard, one call's cancelAll can
  // wipe notifications scheduled by a concurrent call.
  // When skipped, we store the latest settings so they run after the current
  // scheduling completes — guarantees the most recent user changes take effect.
  if (_isScheduling) {
    // Force-release stale mutex if holder has been running too long (e.g. hung API call)
    const elapsed = Date.now() - _schedulingStartedAt;
    if (elapsed > MUTEX_TIMEOUT_MS) {
      console.warn(`⚠️ [notifications-manager] Mutex held for ${Math.round(elapsed / 1000)}s — force releasing`);
      _isScheduling = false;
    } else {
      console.log('[notifications-manager] scheduleNotificationsFromSettings queued — already in progress');
      _pendingReschedule = notifSettings as Record<string, any>;
      return;
    }
  }
  _isScheduling = true;
  _schedulingStartedAt = Date.now();

  try {
    if (!notifSettings.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    const hasPermission = await requestNotifPermission();
    if (!hasPermission) return;

    // ─── Clean slate: cancel ALL existing alarms before rescheduling ───────
    // On Android, setAlarmClock() with FLAG_UPDATE_CURRENT on the same
    // PendingIntent can silently fail on OEM skins (Xiaomi/MIUI, Samsung,
    // etc.). A full wipe + fresh schedule is the only reliable approach.
    // Prayer notifications are rebuilt immediately below by schedulePrayerNotifications().
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[notifications-manager] ✅ Cancelled all existing notifications — clean slate');

    // Fetch admin-assigned sound defaults (fallback when user hasn't chosen)
    const adminDefaults = await getAdminNotificationDefaults();

    // Fetch admin notification text overrides (cached)
    await fetchNotificationTexts();
    const lang = (await import('./i18n')).getLanguage();

    // Resolve sound types with admin defaults fallback
    const adhanSound = resolveWithAdminDefault(notifSettings.adhanSoundType, adminDefaults, 'prayer', 'makkah');
    const azkarSound = resolveWithAdminDefault(notifSettings.azkarSoundType, adminDefaults, 'azkarReminder', 'general_reminder');
    const salawatSound = resolveWithAdminDefault(notifSettings.salawatSoundType, adminDefaults, 'salawat', 'salawat');
    const generalSound = resolveWithAdminDefault(notifSettings.soundType, adminDefaults, 'general', 'general_reminder');

    // Log per-category sound types for debugging
    console.log('[notifications-manager] Sound config (with admin defaults):', JSON.stringify({
      sound: notifSettings.sound,
      adhan: adhanSound,
      azkar: azkarSound,
      salawat: salawatSound,
      general: generalSound,
      tasbih: notifSettings.tasbihSoundType,
      istighfar: notifSettings.istighfarSoundType,
      dailyVerse: notifSettings.dailyVerseSoundType,
      custom: notifSettings.customReminderSoundType,
      quran: notifSettings.quranReminderSoundType,
      adminDefaults: Object.keys(adminDefaults).length > 0 ? adminDefaults : 'none',
    }));

    // ─── iOS Budget Allocation ──────────────────────────────────────────
    // Calculate per-category iOS scheduling days BEFORE creating helpers,
    // so the correct values are available to all call sites.
    const MAX_TIMES_CAP = Platform.OS === 'ios' ? 2 : 3;
    const countTimes = (multi?: string[], single?: string) => {
      if (multi && multi.length > 0) return Math.min(multi.length, MAX_TIMES_CAP);
      return single ? 1 : 0;
    };

    let iosBudget: IosBudgetAllocation | null = null;
    if (Platform.OS === 'ios') {
      // Count azkar times per day (4 categories)
      let azkarTimesPerDay = 0;
      if (notifSettings.morningAzkar) azkarTimesPerDay += countTimes(notifSettings.morningAzkarTimes, notifSettings.morningAzkarTime) || 1;
      if (notifSettings.eveningAzkar) azkarTimesPerDay += countTimes(notifSettings.eveningAzkarTimes, notifSettings.eveningAzkarTime) || 1;
      if (notifSettings.sleepAzkar) azkarTimesPerDay += countTimes(notifSettings.sleepAzkarTimes, notifSettings.sleepAzkarTime) || 1;
      if (notifSettings.wakeupAzkar) azkarTimesPerDay += countTimes(notifSettings.wakeupAzkarTimes, notifSettings.wakeupAzkarTime) || 1;

      // Count other reminder times per day (7 categories)
      let otherTimesPerDay = 0;
      if (notifSettings.dailyVerse) otherTimesPerDay += countTimes(notifSettings.dailyVerseTimes, notifSettings.dailyVerseTime) || 1;
      if (notifSettings.salawatReminder) otherTimesPerDay += countTimes(notifSettings.salawatReminderTimes, notifSettings.salawatReminderTime) || 1;
      if (notifSettings.tasbihReminder) otherTimesPerDay += countTimes(notifSettings.tasbihReminderTimes, notifSettings.tasbihReminderTime) || 1;
      if (notifSettings.istighfarReminder) otherTimesPerDay += countTimes(notifSettings.istighfarReminderTimes, notifSettings.istighfarReminderTime) || 1;
      if (notifSettings.customReminder) otherTimesPerDay += countTimes(notifSettings.customReminderTimes, notifSettings.customReminderTime) || 1;
      if (notifSettings.quranReadingReminder) otherTimesPerDay += countTimes(notifSettings.quranReadingReminderTimes, notifSettings.quranReadingReminderTime) || 1;
      if (notifSettings.worshipDailySummary) otherTimesPerDay += 1;

      iosBudget = calculateIosBudget({
        prayer: !!notifSettings.prayerTimes,
        // afterPrayerAzkar retired — no longer schedules, so budget it as off.
        afterPrayer: false,
        azkarTimesPerDay,
        otherTimesPerDay,
        kahfEnabled: !!notifSettings.kahfReminder,
        worshipWeeklyEnabled: !!notifSettings.worshipWeeklyReport,
      });

      // Update refresh reminder day based on budget
      _refreshReminderDay = iosBudget.refreshDay;
    }

    // ─── DATE-based scheduling (7 days ahead) ─────────────────────────────
    // DAILY/WEEKLY triggers rely on a fire-then-reschedule cycle:
    // when the alarm fires, the system delivers the notification then
    // calls schedule() to register the NEXT occurrence. On aggressive OEMs
    // (Xiaomi/MIUI, Samsung, Huawei) the process is killed before the
    // rescheduling completes, so the next occurrence is lost forever.
    //
    // By scheduling 7 days of DATE triggers up front, each alarm fires
    // independently — no rescheduling required for the scheduling window.
    // WorkManager (15-min periodic) + foreground resume then refresh
    // the window before it expires.
    // Android: 7 days (default). iOS: overridden per-category via iosMaxDays
    // to stay within the hard 64-notification budget.
    const SCHEDULE_DAYS_AHEAD = 7;
    const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]; // Sun-Sat

    const scheduleWithDays = async (
      baseId: string,
      content: Notifications.NotificationContentInput,
      hour: number,
      minute: number,
      days?: number[],
      _channelId?: string, // kept for call-site compat; channel resolved from soundType
      soundType?: string,
      iosMaxDays?: number, // iOS budget override — limits scheduling window
    ) => {
      // Get the pre-created channel for user-selected sound
      const resolvedChannelId = getReminderChannelId(soundType);

      // Resolve iOS notification icon attachment from iconType in data
      const iconType = (content.data as Record<string, any>)?.iconType;
      const iosAttachments = await getNotificationIconAttachment(iconType);

      // Apply directional mark for correct RTL/LTR rendering
      const dirContent = {
        ...content,
        ...(content.title && { title: dirText(String(content.title)) }),
        ...(content.body && { body: dirText(String(content.body)) }),
      };

      const contentWithChannel: Notifications.NotificationContentInput = {
        ...dirContent,
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
        ...(Platform.OS === 'android' && { priority: Notifications.AndroidNotificationPriority.MAX }),
        ...(Platform.OS === 'android' && !notifSettings.vibration && { vibrate: [0] }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
        ...(Platform.OS === 'ios' && iosAttachments && { attachments: iosAttachments }),
      };

      const selectedDays = days && days.length > 0 && days.length < 7 ? days : null;
      const now = new Date();
      let scheduledCount = 0;

      const effectiveDays = (Platform.OS === 'ios' && iosMaxDays !== undefined) ? iosMaxDays : SCHEDULE_DAYS_AHEAD;

      try {
        for (let dayOffset = 0; dayOffset < effectiveDays; dayOffset++) {
          const triggerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);
          // Skip dates in the past
          if (triggerDate <= now) continue;

          // If specific days selected, check weekday (JS: 0=Sun..6=Sat → our format: 1=Sun..7=Sat)
          if (selectedDays) {
            const jsDay = triggerDate.getDay(); // 0=Sun
            const ourDay = jsDay === 0 ? 1 : jsDay + 1; // 1=Sun..7=Sat
            if (!selectedDays.includes(ourDay)) continue;
          }

          const identifier = `${baseId}_f${dayOffset}`;
          await Notifications.scheduleNotificationAsync({
            identifier,
            content: contentWithChannel,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
            },
          });
          scheduledCount++;
        }
        console.log(`🔔 Scheduled ${baseId} × ${scheduledCount} (${hour}:${String(minute).padStart(2,'0')}, channel: ${resolvedChannelId})`);
      } catch (err) {
        console.error(`❌ Failed to schedule ${baseId}:`, err);
      }
    };

    // Helper: get times array from multi-time field or fall back to single-time field
    // iOS: cap at 2 to stay within 64-notification budget
    const MAX_TIMES = MAX_TIMES_CAP;
    const getTimesArray = (multiTimes?: string[], singleTime?: string, fallback = '08:00'): string[] => {
      if (multiTimes && multiTimes.length > 0) return multiTimes.slice(0, MAX_TIMES);
      return [singleTime || fallback];
    };

    // Helper: schedule a category for multiple times
    const scheduleMultiTime = async (
      baseId: string,
      content: Notifications.NotificationContentInput,
      times: string[],
      days?: number[],
      _channelId?: string,
      soundType?: string,
      iosMaxDays?: number, // iOS budget override
    ) => {
      for (let i = 0; i < times.length; i++) {
        const { hour, minute } = parseTime(times[i]);
        const id = times.length > 1 ? `${baseId}_t${i}` : baseId;
        await scheduleWithDays(id, content, hour, minute, days, _channelId, soundType, iosMaxDays);
      }
    };

    // 1) Schedule prayer time notifications
    const prayerSettings: PrayerNotifSettings = {
      enabled: notifSettings.prayerTimes,
      prayers: {
        fajr: true,
        sunrise: false,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      },
      advanceMinutes: notifSettings.prayerReminder ? notifSettings.reminderMinutes : 0,
      adhanSound: notifSettings.sound,
      adhanSoundType: adhanSound,
      soundType: generalSound,
      didYouPrayReminder: notifSettings.didYouPrayReminder,
      didYouPrayDelayMinutes: notifSettings.didYouPrayDelayMinutes,
      didYouPraySnoozeMinutes: notifSettings.didYouPraySnoozeMinutes,
      ...(iosBudget && { iosScheduleDays: iosBudget.prayerDays }),
    };
    // Phase B+C: Catch prayer scheduling errors so they don't kill the
    // entire reschedule. Log the failure and continue with other categories.
    let prayerScheduleWarning = '';
    try {
      await schedulePrayerNotifications(prayerSettings);
    } catch (prayerErr: any) {
      prayerScheduleWarning = `Prayer scheduling failed: ${prayerErr?.message || prayerErr}`;
      console.error(`[notifications-manager] ⚠️ ${prayerScheduleWarning}`);
    }

    // 2) Schedule morning azkar
    // No per-ID wird cancel needed — cancelAll above already wiped everything.

    // Schedule morning wird if enabled
    if (notifSettings.morningAzkar) {
      const morningTimes = getTimesArray(notifSettings.morningAzkarTimes, notifSettings.morningAzkarTime, '06:00');
      const morningText = getNotifText('morning', t('settings.morningWirdTitle'), t('settings.morningWirdBody'), lang);
      await scheduleMultiTime(
        'wird_morning',
        {
          title: morningText.title,
          body: morningText.body,
          sound: resolveNotificationSound(azkarSound, notifSettings.sound),
          data: { type: 'wird', period: 'morning', soundType: azkarSound, iconType: 'morning' },
        },
        morningTimes,
        notifSettings.azkarDays,
        'azkar',
        azkarSound,
        iosBudget?.azkarDays, // iOS dynamic budget
      );
    }

    // Schedule evening wird if enabled
    if (notifSettings.eveningAzkar) {
      const eveningTimes = getTimesArray(notifSettings.eveningAzkarTimes, notifSettings.eveningAzkarTime, '18:00');
      const eveningText = getNotifText('evening', t('settings.eveningWirdTitle'), t('settings.eveningWirdBody'), lang);
      await scheduleMultiTime(
        'wird_evening',
        {
          title: eveningText.title,
          body: eveningText.body,
          sound: resolveNotificationSound(azkarSound, notifSettings.sound),
          data: { type: 'wird', period: 'evening', soundType: azkarSound, iconType: 'evening' },
        },
        eveningTimes,
        notifSettings.azkarDays,
        'azkar',
        azkarSound,
        iosBudget?.azkarDays, // iOS dynamic budget
      );
    }

    // Schedule sleep azkar if enabled
    if (notifSettings.sleepAzkar) {
      const sleepTimes = getTimesArray(notifSettings.sleepAzkarTimes, notifSettings.sleepAzkarTime, '22:00');
      const sleepText = getNotifText('sleep', t('notifications.sleepAzkarTitle'), t('notifications.sleepAzkarBody'), lang);
      const sleepSound = 'notif_sleep';
      await scheduleMultiTime(
        'wird_sleep',
        {
          title: sleepText.title,
          body: sleepText.body,
          sound: resolveNotificationSound(sleepSound, notifSettings.sound),
          data: { type: 'sleep_azkar', period: 'sleep', soundType: sleepSound, iconType: 'moon' },
        },
        sleepTimes,
        notifSettings.azkarDays,
        'azkar',
        sleepSound,
        iosBudget?.azkarDays, // iOS dynamic budget
      );
    }

    // Schedule wakeup azkar if enabled
    if (notifSettings.wakeupAzkar) {
      const wakeupTimes = getTimesArray(notifSettings.wakeupAzkarTimes, notifSettings.wakeupAzkarTime, '05:30');
      const wakeupText = getNotifText('wakeup', t('settings.wakeupAzkarTitle'), t('settings.wakeupAzkarBody'), lang);
      const wakeupSound = 'notif_wakeup';
      await scheduleMultiTime(
        'wird_wakeup',
        {
          title: wakeupText.title,
          body: wakeupText.body,
          sound: resolveNotificationSound(wakeupSound, notifSettings.sound),
          data: { type: 'wird', period: 'wakeup', soundType: wakeupSound, iconType: 'morning' },
        },
        wakeupTimes,
        notifSettings.azkarDays,
        'azkar',
        wakeupSound,
        iosBudget?.azkarDays, // iOS dynamic budget
      );
    }

    // After-prayer adhkar reminder (5 mins after each prayer) is retired.
    // Replaced by the new "هل صليت؟" (did_you_pray) flow scheduled by prayer-notifications.ts.
    // Cancel any stale after_prayer_azkar_* notifications from prior installs.
    for (const pKey of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      for (let d = 0; d < 14; d++) {
        const identifier = d === 0
          ? `after_prayer_azkar_${pKey}`
          : `after_prayer_azkar_${pKey}_d${d}`;
        try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch {}
      }
    }

    // 3) Schedule daily ayah
    if (notifSettings.dailyVerse) {
      const dailyTimes = getTimesArray(notifSettings.dailyVerseTimes, notifSettings.dailyVerseTime, '08:00');
      const dayIndex = new Date().getDay();
      const ayahData = DAILY_AYAHS[dayIndex % DAILY_AYAHS.length];
      
      // Try to fetch tafsir for richer notification
      let notifBody = ayahData.text;
      try {
        const tafsirResult = await fetchTafsir(ayahData.surah, ayahData.ayah, 'ar.muyassar');
        if (tafsirResult.tafsirText && tafsirResult.tafsirText !== t('tafsirSearch.loadError')) {
          const shortTafsir = tafsirResult.tafsirText.length > 120
            ? tafsirResult.tafsirText.slice(0, 120) + '...'
            : tafsirResult.tafsirText;
          notifBody = `${ayahData.text}\n\n📖 ${shortTafsir}`;
        }
      } catch {}

      const dailyAyahText = getNotifText('daily_ayah', t('settings.dailyAyahTitle'), notifBody, lang);
      await scheduleMultiTime(
        'daily_ayah',
        {
          title: dailyAyahText.title,
          body: dailyAyahText.body,
          sound: resolveNotificationSound(notifSettings.dailyVerseSoundType || 'notif_verse', notifSettings.sound),
          data: { type: 'daily_ayah', soundType: notifSettings.dailyVerseSoundType || 'notif_verse', iconType: 'quran' },
        },
        dailyTimes,
        notifSettings.dailyVerseDays,
        'daily-ayah',
        notifSettings.dailyVerseSoundType || 'notif_verse',
        iosBudget?.otherDays, // iOS dynamic budget
      );
    } else {
      // Cancel all daily_ayah variants
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`daily_ayah_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('daily_ayah'); } catch {}
    }

    // 4) Schedule salawat reminder
    if (notifSettings.salawatReminder) {
      const salawatTimes = getTimesArray(notifSettings.salawatReminderTimes, notifSettings.salawatReminderTime, '09:00');
      const salawatText = getNotifText('salawat', t('settings.salawatTitle'), t('settings.salawatBody'), lang);
      await scheduleMultiTime(
        'salawat_reminder',
        {
          title: salawatText.title,
          body: salawatText.body,
          sound: resolveNotificationSound(salawatSound, notifSettings.sound),
          data: { type: 'salawat', soundType: salawatSound, iconType: 'prayer_beads' },
        },
        salawatTimes,
        notifSettings.salawatDays,
        undefined, // channelId resolved from soundType
        salawatSound,
        iosBudget?.otherDays, // iOS dynamic budget
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`salawat_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('salawat_reminder'); } catch {}
    }

    // 5) Schedule tasbih reminder
    if (notifSettings.tasbihReminder) {
      const tasbihTimes = getTimesArray(notifSettings.tasbihReminderTimes, notifSettings.tasbihReminderTime, '15:00');
      const tasbihText = getNotifText('tasbih', t('settings.tasbihReminderTitle'), t('settings.tasbihReminderBody'), lang);
      await scheduleMultiTime(
        'tasbih_reminder',
        {
          title: tasbihText.title,
          body: tasbihText.body,
          sound: resolveNotificationSound(notifSettings.tasbihSoundType || 'subhanallah', notifSettings.sound),
          data: { type: 'tasbih', soundType: notifSettings.tasbihSoundType || 'subhanallah', iconType: 'prayer_beads' },
        },
        tasbihTimes,
        notifSettings.tasbihDays,
        undefined, // channelId resolved from soundType
        notifSettings.tasbihSoundType || 'subhanallah',
        iosBudget?.otherDays, // iOS dynamic budget
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`tasbih_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('tasbih_reminder'); } catch {}
    }

    // 6) Schedule istighfar reminder
    if (notifSettings.istighfarReminder) {
      const istighfarTimes = getTimesArray(notifSettings.istighfarReminderTimes, notifSettings.istighfarReminderTime, '12:00');
      const istighfarText = getNotifText('istighfar', t('settings.istighfarTitle'), t('settings.istighfarBody'), lang);
      await scheduleMultiTime(
        'istighfar_reminder',
        {
          title: istighfarText.title,
          body: istighfarText.body,
          sound: resolveNotificationSound(notifSettings.istighfarSoundType || 'istighfar', notifSettings.sound),
          data: { type: 'istighfar', soundType: notifSettings.istighfarSoundType || 'istighfar', iconType: 'prayer_beads' },
        },
        istighfarTimes,
        notifSettings.istighfarDays,
        undefined, // channelId resolved from soundType
        notifSettings.istighfarSoundType || 'istighfar',
        iosBudget?.otherDays, // iOS dynamic budget
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`istighfar_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('istighfar_reminder'); } catch {}
    }

    // 7) Schedule custom reminder
    if (notifSettings.customReminder) {
      const customTimes = getTimesArray(notifSettings.customReminderTimes, notifSettings.customReminderTime, '08:00');
      
      let title = t('settings.alertTitle');
      let body = notifSettings.customReminderTitle || t('settings.customReminderDefault');
      let soundType = notifSettings.customReminderSoundType || 'default';
      
      // Build content based on type
      if (notifSettings.customReminderContentType === 'surah' && notifSettings.customReminderSurah) {
        title = t('settings.surahReminder');
        if (!notifSettings.customReminderTitle) {
          body = `${t('settings.surahReadingTime')} ${notifSettings.customReminderSurah}`;
        }
      }

      await scheduleMultiTime(
        'custom_reminder',
        {
          title,
          body,
          sound: resolveNotificationSound(soundType, notifSettings.sound),
          data: { 
            type: 'custom', 
            soundType,
            iconType: 'reminder',
            ...(notifSettings.customReminderSurah && { surah: notifSettings.customReminderSurah }),
            contentType: notifSettings.customReminderContentType || 'text',
          },
        },
        customTimes,
        notifSettings.customReminderDays,
        undefined, // channelId resolved from soundType
        notifSettings.customReminderSoundType || 'general_reminder',
        iosBudget?.otherDays, // iOS dynamic budget
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`custom_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('custom_reminder'); } catch {}
    }

    // 8) Schedule Quran reading reminder
    if (notifSettings.quranReadingReminder) {
      const quranTimes = getTimesArray(notifSettings.quranReadingReminderTimes, notifSettings.quranReadingReminderTime, '20:00');
      // quranReminderDays uses 0=Sat..6=Fri, convert to 1=Sun..7=Sat
      const qDays = notifSettings.quranReminderDays;
      const convertedDays = qDays && qDays.length > 0 && qDays.length < 7
        ? qDays.map(d => {
            // 0=Sat→7, 1=Sun→1, 2=Mon→2, 3=Tue→3, 4=Wed→4, 5=Thu→5, 6=Fri→6
            return d === 0 ? 7 : d;
          })
        : undefined;
      const quranText = getNotifText('quran', t('settings.quranReadingNotifTitle'), t('settings.quranReadingNotifBody'), lang);
      const quranSound = 'notif_verse';
      await scheduleMultiTime(
        'quran_reading_reminder',
        {
          title: quranText.title,
          body: quranText.body,
          sound: resolveNotificationSound(quranSound, notifSettings.sound),
          data: { type: 'quran_reading', soundType: quranSound, iconType: 'quran' },
        },
        quranTimes,
        convertedDays,
        undefined, // channelId resolved from soundType
        quranSound,
        iosBudget?.otherDays, // iOS dynamic budget
      );
    } else {
      for (const d of [1, 2, 3, 4, 5, 6, 7]) {
        try { await Notifications.cancelScheduledNotificationAsync(`quran_reading_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('quran_reading_reminder'); } catch {}
    }

    // 9) Schedule worship tracking notifications
    // Daily summary
    if (notifSettings.worshipDailySummary) {
      const summaryTime = parseTime(notifSettings.worshipDailySummaryTime || '22:00');
      const dailySummarySound = 'notif_daily_summary';
      await scheduleWithDays(
        'worship_daily_summary',
        {
          title: getNotifText('worship_daily', t('settings.worshipDailySummaryTitle'), t('settings.worshipDailySummaryBody'), lang).title,
          body: getNotifText('worship_daily', t('settings.worshipDailySummaryTitle'), t('settings.worshipDailySummaryBody'), lang).body,
          sound: resolveNotificationSound(dailySummarySound, notifSettings.sound),
          data: { type: 'worship_summary', iconType: 'reminder', screen: '/daily-summary', soundType: dailySummarySound },
        },
        summaryTime.hour,
        summaryTime.minute,
        undefined,
        undefined, // channelId resolved from soundType by scheduleWithDays
        dailySummarySound,
        iosBudget?.otherDays, // iOS dynamic budget
      );
    } else {
      try { await Notifications.cancelScheduledNotificationAsync('worship_daily_summary'); } catch {}
    }

    // Weekly report (every Friday — schedule next 4 Fridays as DATE triggers)
    if (notifSettings.worshipWeeklyReport) {
      const weeklyTime = parseTime(notifSettings.worshipDailySummaryTime || '22:00');
      const worshipWeeklyChannelId = 'general'; // device default sound
      const worshipWeeklyAttachments = await getNotificationIconAttachment('reminder');
      const now = new Date();
      const WEEKLY_SCHEDULE_COUNT = Platform.OS === 'ios' ? 2 : 4; // iOS: 2 Fridays (budget), Android: 4
      let scheduledWeekly = 0;
      for (let w = 0; w < WEEKLY_SCHEDULE_COUNT; w++) {
        // Find the next Friday from today + w weeks
        const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), weeklyTime.hour, weeklyTime.minute, 0, 0);
        const daysUntilFriday = (5 - candidate.getDay() + 7) % 7 || (w === 0 && candidate > now ? 0 : 7);
        candidate.setDate(candidate.getDate() + daysUntilFriday + (w > 0 || daysUntilFriday === 0 ? (w === 0 ? 0 : w * 7 - (7 - daysUntilFriday)) : 0));
        // Simpler: just find the first Friday >= now, then add w*7 days
        const firstFriday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), weeklyTime.hour, weeklyTime.minute, 0, 0);
        const daysTilFri = (5 - firstFriday.getDay() + 7) % 7;
        firstFriday.setDate(firstFriday.getDate() + daysTilFri);
        if (firstFriday <= now) firstFriday.setDate(firstFriday.getDate() + 7);
        const triggerDate = new Date(firstFriday.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        if (triggerDate <= now) continue;

        try {
          await Notifications.scheduleNotificationAsync({
            identifier: `worship_weekly_report_f${w}`,
            content: {
              title: dirText(getNotifText('worship_weekly', t('settings.worshipWeeklyReportTitle'), t('settings.worshipWeeklyReportBody'), lang).title),
              body: dirText(getNotifText('worship_weekly', t('settings.worshipWeeklyReportTitle'), t('settings.worshipWeeklyReportBody'), lang).body),
              sound: 'default',
              data: { type: 'worship_weekly', iconType: 'reminder' },
              ...(Platform.OS === 'android' && { channelId: worshipWeeklyChannelId }),
              ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
              ...(Platform.OS === 'ios' && worshipWeeklyAttachments && { attachments: worshipWeeklyAttachments }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              ...(Platform.OS === 'android' && { channelId: worshipWeeklyChannelId }),
            },
          });
          scheduledWeekly++;
        } catch (err) {
          console.error('❌ Failed to schedule worship_weekly_report:', err);
        }
      }
      console.log(`🔔 Scheduled worship_weekly_report × ${scheduledWeekly} Fridays`);
    }

    // 10) Schedule Friday Surah Al-Kahf reminder (next 4 Fridays as DATE triggers)
    //     Default: 2 hours after Friday Dhuhr prayer. Falls back to user-set time or 14:00.
    if (notifSettings.kahfReminder) {
      let kahfHour = 14;
      let kahfMinute = 0;
      let kahfUsesDynamicTime = false;

      // Try to compute Kahf time as Dhuhr + 2 hours from prayer API
      try {
        const kahfLocation = await getPrayerLocation();
        if (kahfLocation) {
          const kahfAppSettings = await getSettings();
          const { fetchMonthlyPrayerTimes } = await import('./prayer-api');
          const nowForKahf = new Date();
          const kahfMonthData = await fetchMonthlyPrayerTimes(
            kahfLocation.latitude, kahfLocation.longitude,
            nowForKahf.getMonth() + 1, nowForKahf.getFullYear(),
            kahfAppSettings.calculationMethod
          );
          // Find next Friday's Dhuhr time from monthly data
          if (kahfMonthData && Array.isArray(kahfMonthData)) {
            // Find next Friday (day 5 in JS)
            const tempFri = new Date(nowForKahf);
            const daysToFri = (5 - tempFri.getDay() + 7) % 7;
            tempFri.setDate(tempFri.getDate() + daysToFri);
            if (tempFri <= nowForKahf) tempFri.setDate(tempFri.getDate() + 7);
            const friDayOfMonth = tempFri.getDate();

            // Find matching day in monthly data (1-indexed)
            const dayData = kahfMonthData.find((d: any) => {
              const dDate = d?.date?.gregorian?.day;
              return dDate && parseInt(dDate, 10) === friDayOfMonth;
            });
            const dhuhrStr = dayData?.timings?.Dhuhr;
            if (dhuhrStr) {
              // Parse "12:15 (EET)" or "12:15" format
              const cleanTime = dhuhrStr.replace(/\s*\(.*\)/, '').trim();
              const [dH, dM] = cleanTime.split(':').map(Number);
              if (!isNaN(dH) && !isNaN(dM)) {
                // Add 2 hours to Dhuhr
                kahfHour = dH + 2;
                kahfMinute = dM;
                if (kahfHour >= 24) kahfHour -= 24;
                kahfUsesDynamicTime = true;
                console.log(`🕌 Kahf time calculated: Dhuhr(${dH}:${String(dM).padStart(2, '0')}) + 2h = ${kahfHour}:${String(kahfMinute).padStart(2, '0')}`);
              }
            }
          }
        }
      } catch (kahfLocErr) {
        console.warn('⚠️ Failed to fetch Dhuhr for Kahf — falling back to fixed time:', kahfLocErr);
      }

      // Fallback: use user-set kahfTime if dynamic calculation failed
      if (!kahfUsesDynamicTime && notifSettings.kahfTime) {
        const [uH, uM] = notifSettings.kahfTime.split(':').map(Number);
        if (!isNaN(uH) && !isNaN(uM)) {
          kahfHour = uH;
          kahfMinute = uM;
        }
      }

      // First ayah of Surah Al-Kahf (18:1) - Arabic text for notification body
      const KAHF_FIRST_AYAH_TEXT = 'الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَل لَّهُ عِوَجًا ۜ';
      const KAHF_FIRST_AYAH_GLOBAL = 2141;
      const kahfAyahAudioUrl = getAyahAudioUrl('ar.alafasy', KAHF_FIRST_AYAH_GLOBAL);
      const kahfSoundType = notifSettings.soundType || 'notif_kahf';
      const kahfChannelId = getReminderChannelId(kahfSoundType);

      const kahfAttachments = await getNotificationIconAttachment('quran');
      const nowKahf = new Date();
      const KAHF_WEEKS = Platform.OS === 'ios' ? 2 : 4;
      // Find next Friday
      const firstFri = new Date(nowKahf.getFullYear(), nowKahf.getMonth(), nowKahf.getDate(), kahfHour, kahfMinute, 0, 0);
      const daysTilFri = (5 - firstFri.getDay() + 7) % 7;
      firstFri.setDate(firstFri.getDate() + daysTilFri);
      if (firstFri <= nowKahf) firstFri.setDate(firstFri.getDate() + 7);

      let kahfScheduled = 0;
      for (let w = 0; w < KAHF_WEEKS; w++) {
        const triggerDate = new Date(firstFri.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        if (triggerDate <= nowKahf) continue;
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: `kahf_friday_f${w}`,
            content: {
              title: dirText(getNotifText('friday', t('settings.kahfTitle'), `${t('settings.kahfBody')}\n\n﴿ ${KAHF_FIRST_AYAH_TEXT} ﴾`, lang).title),
              body: dirText(getNotifText('friday', t('settings.kahfTitle'), `${t('settings.kahfBody')}\n\n﴿ ${KAHF_FIRST_AYAH_TEXT} ﴾`, lang).body),
              sound: resolveNotificationSound(kahfSoundType, notifSettings.sound),
              data: {
                type: 'kahf',
                soundType: kahfSoundType,
                iconType: 'quran',
                ayahAudioUrl: kahfAyahAudioUrl,
                ayahText: KAHF_FIRST_AYAH_TEXT,
                surah: 18,
                ayah: 1,
              },
              ...(Platform.OS === 'android' && { channelId: kahfChannelId }),
              ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
              ...(Platform.OS === 'ios' && kahfAttachments && { attachments: kahfAttachments }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              ...(Platform.OS === 'android' && { channelId: kahfChannelId }),
            },
          });
          kahfScheduled++;
        } catch (err) {
          console.error('❌ Failed to schedule kahf_friday:', err);
        }
      }
      console.log(`🔔 Scheduled Kahf Friday × ${kahfScheduled} at ${kahfHour}:${String(kahfMinute).padStart(2, '0')}`);
    }

    // Schedule refresh reminder (safety net) — rolls forward on every successful reschedule
    await scheduleRefreshReminder();

    // Log diagnostics after scheduling — detailed dump for debugging missing prayers
    const diag = await getNotificationDiagnostics();
    console.log(
      `✅ Notifications scheduled: ${diag.totalScheduled} total | ` +
      `prayer=${diag.prayerCount} afterPrayer=${diag.afterPrayerCount} ` +
      `wird=${diag.wirdCount} ayah=${diag.dailyAyahCount} other=${diag.otherCount}`
    );

    // Critical: detect silent scheduling failure (0 scheduled when user expects notifications)
    if (diag.totalScheduled === 0 && notifSettings.enabled) {
      console.warn('🚨 [POST-SCHEDULE] WARNING: 0 notifications scheduled despite enabled=true! Possible scheduling failure.');
    }

    // iOS 64-notification hard budget check
    if (Platform.OS === 'ios' && diag.totalScheduled > 64) {
      console.warn(`⚠️ [Budget] iOS notification limit EXCEEDED: ${diag.totalScheduled}/64 — excess will be silently dropped by the system`);
    } else if (Platform.OS === 'ios') {
      console.log(`📊 [Budget] iOS: ${diag.totalScheduled}/64 scheduled`);
    }

    // Post-schedule verification: dump all prayer identifiers + trigger dates + channels + sounds
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const prayerNotifs = allScheduled.filter(n => n.identifier.startsWith('prayer_'));
      const prayerSummary = prayerNotifs.map(n => {
        const trigger = n.trigger as any;
        const content = n.content as any;
        const triggerDate = trigger?.value ?? trigger?.date ?? trigger?.dateComponents ?? 'unknown';
        const ch = content?.channelId || trigger?.channelId || '?';
        const snd = content?.sound ?? '?';
        return `${n.identifier} → ${typeof triggerDate === 'number' ? new Date(triggerDate).toISOString() : JSON.stringify(triggerDate)} | ch=${ch} | sound=${typeof snd === 'object' ? JSON.stringify(snd) : snd}`;
      });
      console.log(`🔍 [POST-SCHEDULE] Prayer notifications (${prayerNotifs.length}):\n${prayerSummary.join('\n')}`);

      // Check for missing prayers on day 0 (today/tomorrow)
      const expectedPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const scheduledDay0 = prayerNotifs.map(n => n.identifier).filter(id => !id.includes('_d'));
      const missingDay0 = expectedPrayers.filter(p => !scheduledDay0.includes(`prayer_${p}`));
      if (missingDay0.length > 0) {
        console.warn(`⚠️ [POST-SCHEDULE] Missing day-0 prayers: ${missingDay0.join(', ')} (may have already passed today)`);
      }

      // Dump a summary of all categories for ADB debugging
      const categorySummary = allScheduled.reduce<Record<string, number>>((acc, n) => {
        const prefix = n.identifier.replace(/_f\d+$|_d\d+$|_t\d+.*$/g, '');
        acc[prefix] = (acc[prefix] || 0) + 1;
        return acc;
      }, {});
      console.log(`🔍 [POST-SCHEDULE] All categories:`, JSON.stringify(categorySummary));

      // Phase A: Persist diagnostic entry to AsyncStorage
      const diagWarnings: string[] = [];
      if (prayerScheduleWarning) diagWarnings.push(prayerScheduleWarning);
      if (missingDay0.length > 0) diagWarnings.push(`Missing day-0: ${missingDay0.join(',')}`);

      await persistDiagLog({
        ts: new Date().toISOString(),
        total: allScheduled.length,
        prayer: prayerNotifs.length,
        warn: diagWarnings.length > 0 ? diagWarnings.join('; ') : undefined,
        sounds: {
          adhan: adhanSound,
          azkar: azkarSound,
          salawat: salawatSound,
          general: generalSound,
        },
      });
    } catch (verifyErr) {
      console.warn('[POST-SCHEDULE] Verification failed:', verifyErr);
    }
  } catch (error) {
    console.error('Error scheduling notifications from settings:', error);
  } finally {
    // Release mutex — always runs even on error
    _isScheduling = false;

    // If another call was queued while we were scheduling, run it now
    // with the latest settings so the user's most recent changes take effect.
    if (_pendingReschedule) {
      const pending = _pendingReschedule;
      _pendingReschedule = null;
      console.log('[notifications-manager] Running queued reschedule with latest settings');
      scheduleNotificationsFromSettings(pending as any).catch(e =>
        console.warn('[notifications-manager] Queued reschedule failed:', e)
      );
    }
  }
}

// ─── Refresh Reminder (Safety Net) ───────────────────────────────────────────
/**
 * Schedule a single safety-net reminder on day 5 of the 7-day scheduling window.
 * If the user doesn't open the app, this fires at 8 PM to prompt them to open it
 * so prayer notifications get rescheduled before the window expires on day 7.
 * Each successful reschedule cancels the old reminder and pushes a new one forward.
 * iOS: no custom attachment → system shows app icon automatically.
 */
export async function scheduleRefreshReminder(): Promise<void> {
  // Cancel existing refresh reminder
  try {
    await Notifications.cancelScheduledNotificationAsync(`${REFRESH_REMINDER_PREFIX}_${_refreshReminderDay}`);
  } catch {}
  // Also cancel legacy day-6 reminder in case it was previously set at a different day
  if (_refreshReminderDay !== 6) {
    try { await Notifications.cancelScheduledNotificationAsync(`${REFRESH_REMINDER_PREFIX}_6`); } catch {}
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() + _refreshReminderDay);
  triggerDate.setHours(20, 0, 0, 0);

  // Build body: try to include next Fajr time for the refresh day
  let body = t('notifications.refreshReminderBody');
  try {
    const location = await getPrayerLocation();
    if (location) {
      const appSettings = await getSettings();
      const prayerData = await fetchPrayerTimesByCoords(
        location.latitude, location.longitude, appSettings.calculationMethod, triggerDate
      );
      const fajrTime = prayerData?.timings?.Fajr;
      if (fajrTime) {
        const cleanTime = fajrTime.replace(/\s*\(.*\)/, ''); // strip timezone suffix
        const fajrLabel = t('prayer.fajr');
        body = `${fajrLabel}: ${cleanTime} — ${t('notifications.refreshReminderBody')}`;
      }
    }
  } catch {
    // Fallback to default body — no prayer data available
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${REFRESH_REMINDER_PREFIX}_${_refreshReminderDay}`,
      content: {
        title: dirText(t('notifications.refreshReminderTitle')),
        body: dirText(body),
        sound: 'default',
        data: { type: 'refresh_reminder' },
        ...(Platform.OS === 'android' && { channelId: 'general' }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
    });
  } catch (err) {
    console.warn(`Failed to schedule refresh reminder (day ${_refreshReminderDay}):`, err);
  }
  console.log(`🔄 Refresh reminder scheduled for day ${_refreshReminderDay} at 8:00 PM`);
}

// ─── Notification Diagnostics ────────────────────────────────────────────────
export async function getNotificationDiagnostics(): Promise<{
  totalScheduled: number;
  prayerCount: number;
  afterPrayerCount: number;
  wirdCount: number;
  dailyAyahCount: number;
  otherCount: number;
  identifiers: string[];
}> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const ids = all.map(n => n.identifier);
  return {
    totalScheduled: all.length,
    prayerCount: ids.filter(id => id.startsWith('prayer_')).length,
    afterPrayerCount: ids.filter(id => id.startsWith('after_prayer_')).length,
    wirdCount: ids.filter(id => id.startsWith('wird_')).length,
    dailyAyahCount: ids.filter(id => id.startsWith('daily_ayah')).length,
    otherCount: ids.filter(id =>
      !id.startsWith('prayer_') && !id.startsWith('after_prayer_') &&
      !id.startsWith('wird_') && !id.startsWith('daily_ayah')
    ).length,
    identifiers: ids,
  };
}

// ─── Reschedule from Storage (for app foreground) ────────────────────────────
/**
 * Re-reads notification settings from AsyncStorage and reschedules all
 * DATE-based notifications. All categories now use 7-day-ahead DATE triggers
 * instead of DAILY/WEEKLY, so this refreshes the entire window.
 *
 * Called when the app returns to foreground so that expired DATE triggers
 * are replaced with fresh future ones.
 *
 * Throttled: skips if called within 6 hours of the last run.
 */
let _lastRescheduleAt = 0;
const RESCHEDULE_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours
// Note: _isScheduling is defined near top of file as shared mutex

export async function rescheduleAllFromStorage(): Promise<void> {
  // NOTE: Do NOT check/set _isScheduling here — that mutex is managed exclusively
  // by scheduleNotificationsFromSettings(). Setting it here caused a deadlock where
  // the inner function saw _isScheduling=true and bailed out, so rescheduling NEVER ran.
  // The throttle guard below is sufficient to prevent rapid re-invocations.

  const now = Date.now();
  if (now - _lastRescheduleAt < RESCHEDULE_THROTTLE_MS) {
    console.log('[notifications-manager] rescheduleAllFromStorage throttled');
    return;
  }
  _lastRescheduleAt = now;

  try {
    const raw = await AsyncStorage.getItem('app_settings');
    if (!raw) return;
    const settings = JSON.parse(raw);
    const n = settings.notifications;
    if (!n?.enabled) return;

    console.log('[notifications-manager] rescheduleAllFromStorage — starting full reschedule');
    await scheduleNotificationsFromSettings({
      enabled: n.enabled,
      prayerTimes: n.prayerTimes,
      prayerReminder: n.prayerReminder ?? false,
      reminderMinutes: n.reminderMinutes ?? 0,
      morningAzkar: n.morningAzkar,
      morningAzkarTime: n.morningAzkarTime,
      eveningAzkar: n.eveningAzkar,
      eveningAzkarTime: n.eveningAzkarTime,
      sleepAzkar: n.sleepAzkar ?? false,
      sleepAzkarTime: n.sleepAzkarTime ?? '22:00',
      wakeupAzkar: n.wakeupAzkar ?? false,
      wakeupAzkarTime: n.wakeupAzkarTime ?? '05:30',
      afterPrayerAzkar: n.afterPrayerAzkar ?? false,
      dailyVerse: n.dailyVerse,
      dailyVerseTime: n.dailyVerseTime,
      sound: n.sound ?? true,
      vibration: n.vibration !== false,
      soundType: n.soundType,
      adhanSoundType: n.adhanSoundType || 'makkah',
      azkarSoundType: n.azkarSoundType,
      dailyVerseSoundType: n.dailyVerseSoundType,
      salawatReminder: n.salawatReminder,
      salawatReminderTime: n.salawatReminderTime,
      salawatSoundType: n.salawatSoundType,
      tasbihReminder: n.tasbihReminder,
      tasbihReminderTime: n.tasbihReminderTime,
      tasbihSoundType: n.tasbihSoundType,
      istighfarReminder: n.istighfarReminder,
      istighfarReminderTime: n.istighfarReminderTime,
      istighfarSoundType: n.istighfarSoundType,
      customReminder: n.customReminder,
      customReminderTime: n.customReminderTime,
      customReminderTitle: n.customReminderTitle,
      customReminderSoundType: n.customReminderSoundType,
      customReminderContentType: n.customReminderContentType,
      customReminderSurah: n.customReminderSurah,
      customReminderAyah: n.customReminderAyah,
      customReminderReciter: n.customReminderReciter,
      salawatDays: n.salawatDays,
      tasbihDays: n.tasbihDays,
      istighfarDays: n.istighfarDays,
      azkarDays: n.azkarDays,
      dailyVerseDays: n.dailyVerseDays,
      customReminderDays: n.customReminderDays,
      quranReadingReminder: n.quranReadingReminder,
      quranReadingReminderTime: n.quranReadingReminderTime,
      quranReminderDays: n.quranReminderDays,
      quranReminderSoundType: n.quranReminderSoundType,
      worshipPrayerLogging: n.worshipPrayerLogging,
      worshipDailySummary: n.worshipDailySummary,
      worshipDailySummaryTime: n.worshipDailySummaryTime,
      worshipStreakAlerts: n.worshipStreakAlerts,
      worshipWeeklyReport: n.worshipWeeklyReport,
      kahfReminder: n.kahfReminder,
    });
    console.log('🔄 Rescheduled notifications from storage (app foreground)');
  } catch (e) {
    console.warn('[notifications-manager] rescheduleAllFromStorage failed:', e);
  }
}

/**
 * Lightweight check: are any prayer notifications currently scheduled?
 * If not, triggers a full reschedule (bypasses throttle).
 * Call this from AppState 'active' and periodic intervals.
 */
export async function ensurePrayerNotificationsExist(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('app_settings');
    if (!raw) return;
    const settings = JSON.parse(raw);
    const n = settings.notifications;
    if (!n?.enabled || !n?.prayerTimes) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const prayerCount = scheduled.filter(s => s.identifier.startsWith('prayer_')).length;

    if (prayerCount === 0) {
      console.warn('⚠️ No prayer notifications scheduled — forcing reschedule');
      // Reset throttle so rescheduleAllFromStorage runs immediately
      _lastRescheduleAt = 0;
      await rescheduleAllFromStorage();
    } else {
      console.log(`✅ ${prayerCount} prayer notifications already scheduled`);
    }
  } catch (e) {
    console.warn('[ensurePrayerNotificationsExist] failed:', e);
  }
}

// ─── Test Notification ───────────────────────────────────────────────────────
/**
 * Category → { titleKey, bodyKey, soundField, iconType } mapping for test notifications.
 */
const TEST_NOTIF_MAP: Record<string, { titleKey: string; bodyKey: string; iconType: string }> = {
  prayer:         { titleKey: 'notificationSounds.testPrayerTitle',    bodyKey: 'notificationSounds.testPrayerBody',    iconType: 'mosque' },
  salawat:        { titleKey: 'notificationSounds.testSalawatTitle',   bodyKey: 'notificationSounds.testSalawatBody',   iconType: 'prayer_beads' },
  tasbih:         { titleKey: 'notificationSounds.testTasbihTitle',    bodyKey: 'notificationSounds.testTasbihBody',    iconType: 'prayer_beads' },
  istighfar:      { titleKey: 'notificationSounds.testIstighfarTitle', bodyKey: 'notificationSounds.testIstighfarBody', iconType: 'prayer_beads' },
  azkar:          { titleKey: 'notificationSounds.testAzkarTitle',     bodyKey: 'notificationSounds.testAzkarBody',     iconType: 'morning' },
  dailyVerse:     { titleKey: 'notificationSounds.testVerseTitle',     bodyKey: 'notificationSounds.testVerseBody',     iconType: 'quran' },
  customReminder: { titleKey: 'notificationSounds.testCustomTitle',    bodyKey: 'notificationSounds.testCustomBody',    iconType: 'reminder' },
  kahf:           { titleKey: 'notificationSounds.testDefaultTitle',   bodyKey: 'notificationSounds.testDefaultBody',   iconType: 'quran' },
};

/**
 * Sends a test notification for a specific category.
 * Fires after a 2-second delay using the currently-selected sound/channel.
 */
export async function sendTestNotification(
  categoryId: string,
  opts: {
    soundType?: string;
    adhanSoundType?: string;
    sound?: boolean;
    vibration?: boolean;
  } = {},
): Promise<void> {
  const hasPermission = await requestNotifPermission();
  if (!hasPermission) throw new Error('NO_PERMISSION');

  const meta = TEST_NOTIF_MAP[categoryId] ?? TEST_NOTIF_MAP.prayer;

  // Resolve sound: prayer uses adhan sound, others use their category sound
  const isAdhan = categoryId === 'prayer';
  const rawSoundType = isAdhan
    ? (opts.adhanSoundType || 'makkah')
    : (opts.soundType || 'general_reminder');

  const resolvedChannelId = getReminderChannelId(rawSoundType);
  const soundValue = resolveNotificationSound(rawSoundType, opts.sound !== false);

  const identifier = `test_${categoryId}`;

  // Cancel any existing test notification for this category
  try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch {}

  const testAttachments = await getNotificationIconAttachment(meta.iconType);

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: dirText(t(meta.titleKey)),
      body: dirText(t(meta.bodyKey)),
      sound: soundValue,
      data: { type: 'test', category: categoryId, iconType: meta.iconType },
      ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
      ...(Platform.OS === 'android' && { priority: Notifications.AndroidNotificationPriority.MAX }),
      ...(Platform.OS === 'android' && opts.vibration === false && { vibrate: [0] }),
      ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      ...(Platform.OS === 'ios' && testAttachments && { attachments: testAttachments }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5000),
      ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
    },
  });
  console.log(`🔔 Test notification scheduled for ${categoryId} in 5s (channel: ${resolvedChannelId})`);

  // Wait for the notification to actually fire before resolving.
  // This keeps the caller's UI in a "loading/sending" state until the
  // notification pops up, so the success message is perfectly synced.
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

// ─── Admin Notification Defaults Sync ────────────────────────────────────────
// Firestore schema: appConfig/notificationDefaults
// {
//   salawat: { times: ['09:00', '15:00'], soundType: 'salawat', days: [0,1,2,3,4,5,6] },
//   tasbih: { times: ['15:00'], soundType: 'tasbih' },
//   ...
// }
export interface NotificationCategoryDefaults {
  times?: string[];
  soundType?: string;  // Sound type identifier (e.g., 'salawat', 'tasbih', 'general_reminder')
  days?: number[];
  enabled?: boolean;
}

export interface NotificationDefaultsConfig {
  salawat?: NotificationCategoryDefaults;
  tasbih?: NotificationCategoryDefaults;
  istighfar?: NotificationCategoryDefaults;
  morningAzkar?: NotificationCategoryDefaults;
  eveningAzkar?: NotificationCategoryDefaults;
  sleepAzkar?: NotificationCategoryDefaults;
  wakeupAzkar?: NotificationCategoryDefaults;
  dailyVerse?: NotificationCategoryDefaults;
  customReminder?: NotificationCategoryDefaults;
  quranReading?: NotificationCategoryDefaults;
  kahfFriday?: NotificationCategoryDefaults;
}

const DEFAULTS_CACHE_KEY = '@notif_defaults_cache';
const DEFAULTS_FETCH_TIMEOUT_MS = 3000; // 3-second timeout to prevent hanging on bad network

export const fetchNotificationDefaults = async (): Promise<NotificationDefaultsConfig | null> => {
  // Helper: wrap Firestore fetch with timeout
  const fetchWithTimeout = async (): Promise<NotificationDefaultsConfig | null> => {
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const app = (await import('@/config/firebase')).default;
    const db = getFirestore(app);
    
    const docRef = doc(db, 'appConfig', 'notificationDefaults');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as NotificationDefaultsConfig;
      console.log('--- ADMIN SYNC PAYLOAD ---', JSON.stringify(data, null, 2));
      await AsyncStorage.setItem(DEFAULTS_CACHE_KEY, JSON.stringify(data));
      console.log('✅ Fetched notification defaults from Firebase');
      return data;
    }
    return null;
  };

  try {
    // Race Firestore fetch against timeout to prevent hanging on bad network
    const result = await Promise.race([
      fetchWithTimeout(),
      new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log('⏱️ Notification defaults fetch timed out after 3s');
          resolve(null);
        }, DEFAULTS_FETCH_TIMEOUT_MS);
      }),
    ]);
    
    if (result) return result;
  } catch (error) {
    console.log('⚠️ Could not fetch notification defaults:', error);
  }
  
  // Fallback to cache
  try {
    const cached = await AsyncStorage.getItem(DEFAULTS_CACHE_KEY);
    if (cached) {
      console.log('📦 Using cached notification defaults');
      return JSON.parse(cached);
    }
  } catch {}
  
  return null;
};

// Map category keys to their corresponding settings keys
const CATEGORY_TIMES_MAP: Record<keyof NotificationDefaultsConfig, { times: string; single: string; sound?: string; days?: string }> = {
  salawat: { times: 'salawatReminderTimes', single: 'salawatReminderTime', sound: 'salawatSoundType', days: 'salawatDays' },
  tasbih: { times: 'tasbihReminderTimes', single: 'tasbihReminderTime', sound: 'tasbihSoundType', days: 'tasbihDays' },
  istighfar: { times: 'istighfarReminderTimes', single: 'istighfarReminderTime', sound: 'istighfarSoundType', days: 'istighfarDays' },
  morningAzkar: { times: 'morningAzkarTimes', single: 'morningAzkarTime' },
  eveningAzkar: { times: 'eveningAzkarTimes', single: 'eveningAzkarTime' },
  sleepAzkar: { times: 'sleepAzkarTimes', single: 'sleepAzkarTime' },
  wakeupAzkar: { times: 'wakeupAzkarTimes', single: 'wakeupAzkarTime' },
  dailyVerse: { times: 'dailyVerseTimes', single: 'dailyVerseTime', sound: 'dailyVerseSoundType', days: 'dailyVerseDays' },
  customReminder: { times: 'customReminderTimes', single: 'customReminderTime', sound: 'customReminderSoundType', days: 'customReminderDays' },
  quranReading: { times: 'quranReadingReminderTimes', single: 'quranReadingReminderTime', sound: 'quranReminderSoundType', days: 'quranReminderDays' },
  kahfFriday: { times: 'kahfTimes', single: 'kahfTime' },
};

// Map category keys to their corresponding boolean settings keys for enabled state
const CATEGORY_ENABLED_MAP: Partial<Record<keyof NotificationDefaultsConfig, string>> = {
  morningAzkar: 'morningAzkar',
  eveningAzkar: 'eveningAzkar',
  kahfFriday: 'kahfReminder',
  quranReading: 'quranReadingReminder',
  salawat: 'salawatReminder',
  tasbih: 'tasbihReminder',
  istighfar: 'istighfarReminder',
  sleepAzkar: 'sleepAzkar',
  wakeupAzkar: 'wakeupAzkar',
  dailyVerse: 'dailyVerse',
  customReminder: 'customReminder',
};

/**
 * Syncs admin-defined notification defaults to user settings.
 * Returns the updates to apply (or null if none), WITHOUT triggering a reschedule.
 *
 * CRITICAL: This function must NOT call scheduleNotificationsFromSettings() because
 * that does cancelAll → wipe → rebuild. If the rebuild fails (network timeout on
 * Xiaomi/MIUI), ALL notifications are lost. Instead, the caller saves the updates
 * to settings, and they take effect on the next natural reschedule (foreground
 * resume, user settings change, etc.).
 */
export const syncNotificationDefaults = async (
  currentSettings: { notifOverrides?: Record<string, boolean> }
): Promise<Record<string, any> | null> => {
  const defaults = await fetchNotificationDefaults();
  if (!defaults) {
    console.log('📝 No notification defaults to sync');
    return null;
  }
  
  const overrides = currentSettings.notifOverrides ?? {};
  const updates: Record<string, any> = {};
  
  for (const [categoryKey, config] of Object.entries(defaults) as [keyof NotificationDefaultsConfig, NotificationCategoryDefaults][]) {
    // Skip if user has customized this category
    if (overrides[categoryKey]) {
      console.log(`⏭️ Skipping ${categoryKey} — user has customized`);
      continue;
    }
    
    const mapping = CATEGORY_TIMES_MAP[categoryKey];
    if (!mapping) continue;
    
    // Apply times
    if (config.times && config.times.length > 0) {
      updates[mapping.times] = config.times;
      updates[mapping.single] = config.times[0];
    }
    
    // Apply sound type
    if (config.soundType && mapping.sound) {
      updates[mapping.sound] = config.soundType;
    }
    
    // Apply days
    if (config.days && mapping.days) {
      updates[mapping.days] = config.days;
    }

    // Apply enabled state (admin toggle for reminders)
    if (config.enabled !== undefined) {
      const enabledKey = CATEGORY_ENABLED_MAP[categoryKey];
      if (enabledKey) {
        updates[enabledKey] = config.enabled;
        console.log(`🔔 Admin override: ${categoryKey} enabled=${config.enabled}`);
      }
    }
  }
  
  if (Object.keys(updates).length > 0) {
    console.log('📝 Admin defaults resolved:', JSON.stringify(updates));
    return updates;
  }
  console.log('📝 No defaults to apply (all customized or empty)');
  return null;
};

/**
 * Subscribe to real-time notification defaults updates from Firestore
 */
export const subscribeToNotificationDefaults = (
  onUpdate: (defaults: NotificationDefaultsConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let unsubscribe: (() => void) | null = null;
  
  (async () => {
    try {
      const { getFirestore, doc, onSnapshot } = await import('firebase/firestore');
      const app = (await import('@/config/firebase')).default;
      const db = getFirestore(app);
      
      const docRef = doc(db, 'appConfig', 'notificationDefaults');
      unsubscribe = onSnapshot(
        docRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as NotificationDefaultsConfig;
            await AsyncStorage.setItem(DEFAULTS_CACHE_KEY, JSON.stringify(data));
            console.log('🔄 Notification defaults updated (real-time)');
            onUpdate(data);
          }
        },
        (error) => {
          console.error('❌ Notification defaults subscription error:', error);
          if (onError) onError(error);
        }
      );
    } catch (error: any) {
      console.error('❌ Failed to subscribe to notification defaults:', error);
      if (onError) onError(error);
    }
  })();
  
  return () => {
    if (unsubscribe) unsubscribe();
  };
};

// ─── Timezone Change Detection ────────────────────────────────────────────────
const TZ_STORAGE_KEY = '@last_known_timezone';

/**
 * Detect timezone changes (travel, DST, manual change).
 * Compares current timezone against saved value.
 * If different, resets the reschedule throttle and forces a full reschedule
 * so all notification trigger times reflect the new timezone.
 *
 * Call from AppState 'active' handler in _layout.tsx.
 */
export async function checkTimezoneChange(): Promise<boolean> {
  try {
    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const savedTz = await AsyncStorage.getItem(TZ_STORAGE_KEY);

    if (savedTz && savedTz !== currentTz) {
      console.log(`🕐 Timezone changed: ${savedTz} → ${currentTz} — forcing reschedule`);
      await AsyncStorage.setItem(TZ_STORAGE_KEY, currentTz);
      // Reset throttle so rescheduleAllFromStorage runs immediately
      _lastRescheduleAt = 0;
      await rescheduleAllFromStorage();
      return true; // changed
    }

    // Store current timezone if not saved yet
    if (!savedTz) {
      await AsyncStorage.setItem(TZ_STORAGE_KEY, currentTz);
    }

    return false; // no change
  } catch (e) {
    console.warn('[notifications-manager] checkTimezoneChange failed:', e);
    return false;
  }
}
