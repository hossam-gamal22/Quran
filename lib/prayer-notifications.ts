/**
 * Prayer Notifications Service
 * يدير جدولة إشعارات مواقيت الصلاة الخمس
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, NativeModules } from 'react-native';
import { fetchMonthlyPrayerTimes, type PrayerTimesResponse } from './prayer-api';
import { getPrayerLocation } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t, getLanguage } from './i18n';
import { getNotifText, fetchNotificationTexts } from './notification-texts';
import { getAdhanChannelId, getReminderChannelId, ANDROID_FULL_ADHAN_CHANNEL_ID } from '../services/notifications/channels';
import { registerDidYouPrayCategory, DID_YOU_PRAY_CATEGORY } from './did-you-pray-handler';
import { dirText } from './notification-text-direction';
import { validatePrayerTimings } from './prayer-time-validator';
import { resolveNotificationSound } from './resolve-notification-sound';
import { getNotificationIconAttachment } from './notification-icons';
import { getScheduledNotificationFireMs } from './notification-trigger-time';
import {
  completeAdhanVoiceToIosNotificationSoundFile,
  completeAdhanVoiceToNotificationSoundKey,
  normalizeCompleteAdhanVoice,
  normalizeFullAdhanNotificationVoice,
} from './sound-manager';
import { 
  NotificationSettings, 
  DEFAULT_NOTIFICATION_SETTINGS,
  PrayerKey 
} from './notification-types';
import { checkExactAlarmPermission } from '@/services/notifications/permissions';
import { markPermissionRequested } from '@/lib/permission-recovery';
import { getOfflinePrayerTimesRange } from '@/lib/prayer-week-cache';
import type { PrayerTimes as PrayerTimesType } from '@/lib/prayer-times';
import { getEffectivePrayerCalcSettings } from '@/lib/prayer-settings-source';
import { isSmartFajrAlarmEnabled } from '@/lib/smart-alarm/storage';

// Re-export للتوافق
export { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './notification-types';

// ─── Note: setNotificationHandler is configured in app/_layout.tsx ────────────

// ─── أسماء الصلوات ──────────────────────────────────────────────────────────
const PRAYER_KEYS: readonly PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function getPrayerMessage(key: PrayerKey, lang: string = 'ar', isFriday: boolean = false): string {
  const messages: Record<PrayerKey, string> = {
    fajr: t('notifications.fajrBody'),
    sunrise: t('notifications.sunriseBody'),
    dhuhr: t('notifications.dhuhrBody'),
    asr: t('notifications.asrBody'),
    maghrib: t('notifications.maghribBody'),
    isha: t('notifications.ishaBody'),
  };
  // On Friday, Dhuhr becomes Jumuah
  if (key === 'dhuhr' && isFriday) {
    const jumuahBody = t('notifications.jumuahBody');
    const override = getNotifText('prayer_jumuah', '', jumuahBody, lang);
    return override.body || jumuahBody;
  }
  const typeId = `prayer_${key}`;
  const override = getNotifText(typeId, '', messages[key], lang);
  return override.body || messages[key];
}

function getPrayerNotifTitle(key: PrayerKey, lang: string = 'ar', isFriday: boolean = false): string {
  const titles: Record<PrayerKey, string> = {
    fajr: t('notifications.fajrNotifTitle'),
    sunrise: t('notifications.sunriseNotifTitle'),
    dhuhr: t('notifications.dhuhrNotifTitle'),
    asr: t('notifications.asrNotifTitle'),
    maghrib: t('notifications.maghribNotifTitle'),
    isha: t('notifications.ishaNotifTitle'),
  };
  // On Friday, Dhuhr becomes Jumuah
  if (key === 'dhuhr' && isFriday) {
    const jumuahTitle = t('notifications.jumuahNotifTitle');
    const override = getNotifText('prayer_jumuah', jumuahTitle, '', lang);
    return override.title || jumuahTitle;
  }
  const typeId = `prayer_${key}`;
  const override = getNotifText(typeId, titles[key], '', lang);
  return override.title || titles[key];
}

// ─── تحويل بين أسماء الصلوات والـ API ───────────────────────────────────────
const PRAYER_KEY_TO_API: Record<PrayerKey, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};


// مدة التنبيه المسبق بالدقائق
export const ADHAN_ADVANCE_MINUTES = 0;

// ─── طلب الأذونات ─────────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  // تجاهل على الويب
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return false;
  }

  // NOTE: Android channels are managed exclusively by services/notifications/channels.ts
  // Do NOT create channels here — initializeAllNotificationChannels() handles them with
  // the user's selected sound. Creating a channel here would override it with the wrong
  // sound since Android channels are immutable once created.

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  // Mark AFTER the prompt was actually shown, so the recovery banner only
  // fires once the user has genuinely been asked (Android-gated).
  if (Platform.OS === 'android') {
    await markPermissionRequested('notifications');
  }
  return status === 'granted';
}

export async function checkNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ─── تحويل وقت الصلاة لـ Date object ─────────────────────────────────────────
function prayerTimeToDateForDay(timeStr: string, day: Date, advanceMinutes: number = 0): Date {
  const cleaned = timeStr.replace(/\s*\([^)]*\)\s*/, '').trim();
  const parts = cleaned.split(':').map(Number);
  const hours = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
  if (advanceMinutes > 0) {
    result.setMinutes(result.getMinutes() - advanceMinutes);
  }
  return result;
}

// ─── Apply per-prayer minute adjustments to notification timings ─────────────
// Mirrors applyAdjustments() from prayer-times.ts so notifications match display.
const ADJUSTMENT_KEY_MAP: Record<string, string> = {
  Fajr: 'fajr', Sunrise: 'sunrise', Dhuhr: 'dhuhr',
  Asr: 'asr', Maghrib: 'maghrib', Isha: 'isha',
};

function applyTimingAdjustments(
  timings: Record<string, string>,
  adjustments: Record<string, number>
): Record<string, string> {
  const result = { ...timings };
  for (const [apiKey, settingsKey] of Object.entries(ADJUSTMENT_KEY_MAP)) {
    const minutes = adjustments[settingsKey];
    if (!minutes || !result[apiKey]) continue;
    // Strip timezone info like "(EET)" if present
    const clean = result[apiKey].replace(/\s*\([^)]*\)/g, '').trim();
    const parts = clean.split(':').map(Number);
    if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) continue;
    const d = new Date();
    d.setHours(parts[0], parts[1] + minutes, 0, 0);
    result[apiKey] = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return result;
}

// عدد الأيام المجدولة مسبقاً.
// Android has no 64-notification cap, so keep a longer local adhan window.
// iOS budget allocator overrides this via notifSettings.iosScheduleDays.
// App reschedules on every foreground resume via ensurePrayerNotificationsExist().
const DEFAULT_PRAYER_SCHEDULE_DAYS = Platform.OS === 'android' ? 7 : 4;
const CRITICAL_PRAYER_NOTIFICATION_WINDOW_MS = 5 * 60 * 1000;
const MIN_SAFE_PRAYER_RESCHEDULE_LEAD_MS = 3 * 60 * 1000;

type DayScheduleData = { date: Date; timings: Record<string, string>; isOffline: boolean };

function dateTagFor(day: Date): string {
  return `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`;
}

function resolveFreshPrayerTriggerMs(
  identifier: string,
  scheduleDays: DayScheduleData[],
  advanceMinutes: number,
): number | null {
  const idPartsOld = identifier.match(/^prayer_([a-z]+)(?:_d(\d+))?$/);
  const idPartsDate = identifier.match(/^prayer_([a-z]+)_(\d{8})$/);

  if (idPartsOld) {
    const pKey = idPartsOld[1] as PrayerKey;
    const dayIdx = idPartsOld[2] ? parseInt(idPartsOld[2], 10) : 0;
    const dayData = scheduleDays[dayIdx];
    const apiKey = PRAYER_KEY_TO_API[pKey];
    if (!dayData || !apiKey) return null;
    const timeStr = dayData.timings[apiKey];
    return timeStr ? prayerTimeToDateForDay(timeStr, dayData.date, advanceMinutes).getTime() : null;
  }

  if (idPartsDate) {
    const pKey = idPartsDate[1] as PrayerKey;
    const targetTag = idPartsDate[2];
    const dayData = scheduleDays.find(d => dateTagFor(d.date) === targetTag);
    const apiKey = PRAYER_KEY_TO_API[pKey];
    if (!dayData || !apiKey) return null;
    const timeStr = dayData.timings[apiKey];
    return timeStr ? prayerTimeToDateForDay(timeStr, dayData.date, advanceMinutes).getTime() : null;
  }

  return null;
}

function resolveCanonicalPrayerIdentifier(
  identifier: string,
  scheduleDays: DayScheduleData[],
): string | null {
  const idPartsOld = identifier.match(/^prayer_([a-z]+)(?:_d(\d+))?$/);
  const idPartsDate = identifier.match(/^prayer_([a-z]+)_(\d{8})$/);

  if (idPartsDate) return identifier;

  if (idPartsOld) {
    const pKey = idPartsOld[1] as PrayerKey;
    const dayIdx = idPartsOld[2] ? parseInt(idPartsOld[2], 10) : 0;
    const dayData = scheduleDays[dayIdx];
    return dayData ? `prayer_${pKey}_${dateTagFor(dayData.date)}` : null;
  }

  return null;
}

async function schedulePrayerVisualFirstNotification(args: {
  identifier: string;
  prayerKey: PrayerKey;
  content: Notifications.NotificationContentInput;
  trigger: Notifications.NotificationTriggerInput;
}): Promise<{ id: string; usedSilentFallback: boolean }> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: args.identifier,
      content: args.content,
      trigger: args.trigger,
    });
    return { id, usedSilentFallback: false };
  } catch (primaryError) {
    console.warn(
      `[prayer-notif] Sounded notification scheduling failed for ${args.prayerKey}; retrying visual-only fallback`,
      primaryError,
    );

    const fallbackContent: Notifications.NotificationContentInput = {
      ...args.content,
      sound: false,
      data: {
        ...(args.content.data ?? {}),
        visualFallback: '1',
        soundFallbackReason: 'schedule_error',
      },
      ...(Platform.OS === 'android' && {
        channelId: 'silent',
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
      ...(Platform.OS === 'ios' && {
        interruptionLevel: 'timeSensitive' as const,
      }),
    };
    const fallbackTrigger = {
      ...(args.trigger as Record<string, unknown>),
      ...(Platform.OS === 'android' && { channelId: 'silent' }),
    } as Notifications.NotificationTriggerInput;

    const id = await Notifications.scheduleNotificationAsync({
      identifier: args.identifier,
      content: fallbackContent,
      trigger: fallbackTrigger,
    });
    return { id, usedSilentFallback: true };
  }
}

// ─── جدولة إشعارات الصلاة لـ 7 أيام ─────────────────────────────────────────
export async function schedulePrayerNotifications(
  notifSettings: NotificationSettings
): Promise<void> {
  if (!notifSettings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Ensure the interactive action buttons are registered for did_you_pray notifications.
  await registerDidYouPrayCategory();

  // Android 12+ (API 31+): verify SCHEDULE_EXACT_ALARM for DATE triggers
  const exactAlarmOk = await checkExactAlarmPermission();
  if (!exactAlarmOk) {
    console.warn('[prayer-notifications] SCHEDULE_EXACT_ALARM not granted — DATE triggers may fail silently');
  }

  const savedLocation = await getPrayerLocation();
  // Phase 1.E: Fallback لمكة المكرمة لو الموقع غير محدد، عشان المستخدم يحصل على
  // إشعارات تذكيرية على الأقل بدلاً من صمت تام. سيتم إعادة الجدولة تلقائياً بمجرد تفعيل الموقع.
  const location = savedLocation ?? {
    latitude: 21.4225,
    longitude: 39.8262,
    city: 'مكة المكرمة',
  };
  if (!savedLocation) {
    console.warn('⚠️ [prayer-notif] No saved location — using Makkah as fallback');
  }

  // Read prayer settings from the unified source so notifications use the
  // same calculation method, school, and adjustments as the prayer-tab display.
  // Without saved settings, Makkah/Umm Al-Qura is the approximate fallback.
  const effective = await getEffectivePrayerCalcSettings();
  const calculationMethod = effective.calculationMethod;
  const asrJuristic = effective.asrJuristic;
  const prayerAdjustments = effective.adjustments;

  console.log(`🔔 [prayer-notif] Using method=${calculationMethod}, school=${asrJuristic}, source=${effective.source}, adjustments=${JSON.stringify(prayerAdjustments)}`);
  
  // Fetch admin text overrides (cached)
  await fetchNotificationTexts();
  const lang = getLanguage();

  try {
    // Use iOS budget allocation if provided, otherwise default
    const PRAYER_SCHEDULE_DAYS = (Platform.OS === 'ios' && notifSettings.iosScheduleDays)
      ? notifSettings.iosScheduleDays
      : DEFAULT_PRAYER_SCHEDULE_DAYS;

    // Fetch prayer times for the scheduling window using monthly calendar API (1-2 calls max)
    const today = new Date();
    console.log(`[prayer-notif] Starting scheduling for ${PRAYER_SCHEDULE_DAYS} days from ${today.toISOString()}`);
    const lastDay = new Date(today);
    lastDay.setDate(lastDay.getDate() + PRAYER_SCHEDULE_DAYS - 1);

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // ─── Data Source: try API first, then offline fallback ────────────
    let scheduleDays: DayScheduleData[] = [];
    let usedOfflineFallback = false;

    try {
      const monthlyData = await fetchMonthlyPrayerTimes(
        location.latitude, location.longitude, currentMonth, currentYear, calculationMethod, asrJuristic
      );

      // If the scheduling window spans into next month, fetch that too
      let nextMonthData: PrayerTimesResponse[] | null = null;
      if (lastDay.getMonth() + 1 !== currentMonth || lastDay.getFullYear() !== currentYear) {
        nextMonthData = await fetchMonthlyPrayerTimes(
          location.latitude, location.longitude, lastDay.getMonth() + 1, lastDay.getFullYear(), calculationMethod, asrJuristic
        );
      }

      // Build unified structure from API data
      for (let dayOffset = 0; dayOffset < PRAYER_SCHEDULE_DAYS; dayOffset++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        const isNextMonth = targetDate.getMonth() + 1 !== currentMonth || targetDate.getFullYear() !== currentYear;
        const source = isNextMonth && nextMonthData ? nextMonthData : monthlyData;
        const dayData = source[targetDate.getDate() - 1];
        if (!dayData) continue;
        const rawTimings: Record<string, string> = {
          Fajr: dayData.timings.Fajr,
          Sunrise: dayData.timings.Sunrise,
          Dhuhr: dayData.timings.Dhuhr,
          Asr: dayData.timings.Asr,
          Maghrib: dayData.timings.Maghrib,
          Isha: dayData.timings.Isha,
        };
        // The monthly API returns un-adjusted times. The display path applies the
        // user's per-prayer minute adjustments via applyAdjustments(), so we MUST
        // apply the same offsets here — otherwise notifications fire at a different
        // moment than the on-screen countdown (the "adhan came N minutes off" bug).
        const timings = applyTimingAdjustments(rawTimings, prayerAdjustments);
        // Phase 1.F: validate — تجنب جدولة أوقات مستحيلة (خلل API)
        const v = validatePrayerTimings(timings);
        if (!v.valid) {
          console.warn(`⚠️ [prayer-notif] Invalid timings for ${targetDate.toDateString()}, skipping:`, v.errors);
          continue;
        }
        scheduleDays.push({ date: targetDate, timings, isOffline: false });
      }
    } catch (apiError) {
      console.warn('[prayer-notif] API fetch failed, trying offline fallback:', apiError);
      // Offline fallback: use local calculation / cache / extrapolation / Makkah fallback
      const offlineRange = await getOfflinePrayerTimesRange(today, PRAYER_SCHEDULE_DAYS);
      if (offlineRange.length === 0) {
        throw apiError; // Nothing available offline either
      }
      usedOfflineFallback = true;
      for (const entry of offlineRange) {
        const d = new Date(entry.date + 'T12:00:00');
        // Convert PrayerTimes (HH:MM keys) to API-style timings record
        const rawTimings: Record<string, string> = {
          Fajr: entry.times.fajr,
          Sunrise: entry.times.sunrise,
          Dhuhr: entry.times.dhuhr,
          Asr: entry.times.asr,
          Maghrib: entry.times.maghrib,
          Isha: entry.times.isha,
        };
        // Offline range returns effective app times already (cached/week/local
        // calculation paths apply adjustments at source), so do not apply the
        // same offsets a second time here.
        const timings = rawTimings;
        // Phase 1.F: validate offline timings too
        const v = validatePrayerTimings(timings);
        if (!v.valid) {
          console.warn(`⚠️ [prayer-notif] Invalid offline timings for ${d.toDateString()}, skipping:`, v.errors);
          continue;
        }
        scheduleDays.push({ date: d, timings, isOffline: true });
      }
      console.log(`[prayer-notif] 📴 Using offline data for ${offlineRange.length} days (sources: ${offlineRange.map(r => r.source).join(', ')})`);
    }

    if (scheduleDays.length === 0) {
      throw new Error('No prayer data available for scheduling');
    }

    // ─── API fetch succeeded — NOW cancel old prayer notifications ──────────
    // We defer cancellation until AFTER fetching succeeds so that a network
    // failure never wipes existing scheduled notifications (the "one-shot" bug).
    //
    // Race-condition guard: if a prayer notification is already about to fire
    // and the freshly computed replacement is also too close to schedule safely,
    // keep the existing request. This makes "user opened the app one minute
    // before adhan while location is refreshing" prefer a slightly stale adhan
    // notification over silence.
    const cancelCheckNow = Date.now();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const protectedPrayerNotificationIds = new Set<string>();
    let protectedNativePrayerAlarmCount = 0;
    let preservedImminentCount = 0;
    for (const n of scheduled) {
      const isPrayerNotif = n.identifier.startsWith('prayer_') || n.identifier.startsWith('did_you_pray_');
      if (!isPrayerNotif) continue;
      const isPrayerTimeNotif = n.identifier.startsWith('prayer_');

      // Old-format identifiers (prayer_dhuhr, prayer_dhuhr_d2, etc.) are
      // normally cancelled because they are superseded by date-based identifiers
      // (prayer_dhuhr_20260514). The critical-imminent guard below may still
      // keep one if cancelling it could leave the user with no adhan.
      const isOldFormat = /^prayer_[a-z]+(?:_d\d+)?$/.test(n.identifier);

      // Extract the absolute fire time. Handles Android `{ value }` AND the iOS
      // `{ type: 'calendar', dateComponents }` shape — without the latter the
      // imminent guard silently failed on iOS (see getScheduledNotificationFireMs).
      const trig: any = n.trigger;
      const triggerMs: number | null = getScheduledNotificationFireMs(trig);

      // Never protect a prayer the user has DISABLED. The critical-imminent guard
      // exists to avoid silencing an adhan during reschedule — but if the user just
      // turned this prayer off (e.g. toggled Maghrib off minutes before its time),
      // keeping its old imminent notification would fire an adhan they explicitly
      // disabled. In that case fall through and cancel it like any other.
      const prayerKeyMatch = n.identifier.match(/^prayer_([a-z]+)/);
      const prayerKeyOfNotif = prayerKeyMatch ? (prayerKeyMatch[1] as PrayerKey) : null;
      const prayerStillEnabled = prayerKeyOfNotif
        ? notifSettings.prayers[prayerKeyOfNotif] !== false
        : true;

      if (isPrayerTimeNotif && prayerStillEnabled) {
        const msUntilFire = triggerMs !== null ? triggerMs - cancelCheckNow : null;
        // An unparseable trigger (triggerMs === null) means we cannot prove the
        // notification is NOT imminent — treat it like the imminent case and
        // only cancel when a fresh replacement has a safe lead, so a corrupted
        // trigger shape can never silence an adhan that was about to fire.
        const maybeImminent = msUntilFire === null
          || (msUntilFire > 0 && msUntilFire <= CRITICAL_PRAYER_NOTIFICATION_WINDOW_MS);
        if (maybeImminent) {
          const freshTriggerMs = resolveFreshPrayerTriggerMs(n.identifier, scheduleDays, notifSettings.advanceMinutes);
          const freshHasSafeLead = freshTriggerMs !== null
            && freshTriggerMs > cancelCheckNow + MIN_SAFE_PRAYER_RESCHEDULE_LEAD_MS;

          if (freshHasSafeLead) {
            console.log(`[prayer-notif] 🔄 CANCEL imminent ${n.identifier}; fresh trigger has safe lead (${Math.round((freshTriggerMs - cancelCheckNow) / 1000)}s)`);
          } else {
            protectedPrayerNotificationIds.add(n.identifier);
            const canonicalId = resolveCanonicalPrayerIdentifier(n.identifier, scheduleDays);
            if (canonicalId) protectedPrayerNotificationIds.add(canonicalId);
            protectedNativePrayerAlarmCount++;
            preservedImminentCount++;
            console.log(`[prayer-notif] 🛡️ KEEP critical imminent ${n.identifier} (canonical=${canonicalId || 'unknown'}; fires in ${msUntilFire !== null ? Math.round(msUntilFire / 1000) + 's' : 'unknown'}; fresh=${freshTriggerMs ? new Date(freshTriggerMs).toISOString() : 'unknown'})`);
            continue;
          }
        }
      }
      if (isOldFormat) {
        console.log(`[prayer-notif] 🔄 CANCEL old-format prayer notification ${n.identifier}`);
      }
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (preservedImminentCount > 0) {
      console.log(`[prayer-notif] 🛡️ Preserved ${preservedImminentCount} imminent prayer notification(s) from cancellation`);
    }

    // Resolve the Android channel for the user's selected sound.
    // 'default' / undefined / falsy is treated as 'makkah' so both platforms play an actual adhan.
    const adhanSoundType = notifSettings.adhanSoundType;
    const soundType = notifSettings.soundType;
    const rawSoundType = adhanSoundType ? adhanSoundType : (soundType || 'makkah');
    const effectiveSoundType = (!rawSoundType || rawSoundType === 'default') ? 'makkah' : rawSoundType;
    const fullAdhanVoice = normalizeFullAdhanNotificationVoice(notifSettings.fullAdhanSoundType || effectiveSoundType);
    const fullAdhanNotificationSound = completeAdhanVoiceToNotificationSoundKey(fullAdhanVoice);
    const adhanSoundEnabled = notifSettings.adhanSound !== false;
    // Full adhan playback is OPT-IN via the user-facing toggle.
    //
    // Android safety-net design (Layer 2):
    //   - Visual notification ALWAYS uses the regular adhan_<sound> channel WITH sound.
    //   - This guarantees the user hears at least the short adhan clip (~15s, see
    //     `assets/sounds/<key>.mp3`) even if the AlarmManager-driven foreground
    //     service path fails for ANY reason (FullAdhanModule missing,
    //     SCHEDULE_EXACT_ALARM revoked, OEM battery kill, Doze edge-cases,
    //     MediaPlayer prepare failure, etc.).
    //   - When the service does start successfully, both audio streams play in
    //     parallel for ~15s (channel sound on STREAM_NOTIFICATION ends at 15s,
    //     service continues on STREAM_ALARM until 35s). Acceptable trade-off vs.
    //     silent failure. Documented in assets/sounds/adhan_full/README.md.
    //
    // iOS: full adhan plays via attached audio file, system cuts it at ~29-30s
    // (Apple UNNotificationSound hard cap). Files are encoded at 35s but only
    // the first ~30s is audible — matches user expectations.
    const shouldUseFullAdhan =
      adhanSoundEnabled &&
      effectiveSoundType !== 'silent' &&
      notifSettings.useFullAdhan === true;
    // On Android with full adhan, use the silent visual channel so ONLY the
    // AlarmManager service plays audio (35s full adhan). Using the regular adhan
    // channel would add a second 15s short-adhan sound on top — the user chose
    // full adhan, so we respect that choice and keep audio clean.
    const prayerChannelId = !adhanSoundEnabled || effectiveSoundType === 'silent'
      ? 'silent'
      : (Platform.OS === 'android' && shouldUseFullAdhan)
        ? ANDROID_FULL_ADHAN_CHANNEL_ID
        : getAdhanChannelId(effectiveSoundType);
    const regularChannelId = prayerChannelId;
    const fajrChannelId = prayerChannelId;

    // Resolve sound using the unified function (single source of truth in channels.ts).
    // iOS: full adhan plays via attached CAF file (~29s, OS hard cap).
    // Android full adhan: silent notification — AlarmManager handles all audio.
    // Android short adhan: regular adhan channel sound (~15s).
    const soundValue = !adhanSoundEnabled
      ? false
      : (Platform.OS === 'ios' && shouldUseFullAdhan)
        ? completeAdhanVoiceToIosNotificationSoundFile(fullAdhanVoice)
        : (Platform.OS === 'android' && shouldUseFullAdhan)
          ? false
          : resolveNotificationSound(effectiveSoundType, true);
    console.log('[FullAdhan] loaded settings:', notifSettings);
    console.log('[FullAdhan] selected voice:', fullAdhanVoice);
    console.log('[FullAdhan] selected sound file:', soundValue);
    console.log('[FullAdhan] permission status:', 'schedulePrayerNotifications reached after permission gate');

    const protectedFullAdhanAlarmCount =
      Platform.OS === 'android' &&
      shouldUseFullAdhan &&
      notifSettings.advanceMinutes <= 0
        ? protectedNativePrayerAlarmCount
        : 0;

    // Cancel previously-scheduled native AlarmManager triggers for the foreground
    // service. If an adhan is critically close, keep its earliest request code(s)
    // and clear only the later native alarms so the near prayer still plays.
    if (Platform.OS === 'android') {
      try {
        const FullAdhanModule = (NativeModules as any)?.FullAdhanModule;
        if (protectedFullAdhanAlarmCount > 0 && FullAdhanModule?.cancelFullAdhanFrom) {
          await FullAdhanModule.cancelFullAdhanFrom(protectedFullAdhanAlarmCount);
          console.log(`[FullAdhan] Preserved ${protectedFullAdhanAlarmCount} imminent native alarm(s), cancelled later alarms`);
        } else if (protectedFullAdhanAlarmCount === 0 && FullAdhanModule?.cancelAllFullAdhan) {
          await FullAdhanModule.cancelAllFullAdhan();
        } else if (protectedFullAdhanAlarmCount > 0) {
          console.warn('[FullAdhan] cancelFullAdhanFrom unavailable; keeping native alarms this pass to protect imminent adhan');
        }
      } catch (e) {
        console.warn('[prayer-notif] FullAdhanModule native alarm cleanup failed:', e);
      }
    }

    // Counter for AlarmManager request codes — keeps each scheduled prayer
    // its own PendingIntent so cancel/replace works correctly.
    let fullAdhanRequestCode = protectedFullAdhanAlarmCount;

    const scheduledIds: string[] = [];
    // Refresh `now` AFTER the API fetch + cancellation completes.
    // Using a stale `now` from before the fetch would skip today's
    // prayer slots that became "past" only during the fetch delay.
    const now = new Date();
    const mosqueAttachments = await getNotificationIconAttachment('mosque');

    for (let dayOffset = 0; dayOffset < scheduleDays.length; dayOffset++) {
      const { date: targetDate, timings } = scheduleDays[dayOffset];

      for (const prayerKey of PRAYER_KEYS) {
        if (!notifSettings.prayers[prayerKey]) continue;

        // Smart Fajr alarm is mutually exclusive with the regular Fajr notification.
        // When user picks the smart alarm, suppress the regular one here so the user
        // doesn't get two alarms going off at Fajr time.
        if (prayerKey === 'fajr' && isSmartFajrAlarmEnabled()) {
          console.log('[prayer-notif] SKIP fajr — smart alarm is enabled');
          continue;
        }

        const apiKey = PRAYER_KEY_TO_API[prayerKey];
        const timeStr = timings[apiKey];
        if (!timeStr) continue;

        // Use date-based identifiers so a notification scheduled days ago for
        // "today" shares the same id as one freshly scheduled for today.
        const dateStr = dateTagFor(targetDate);
        const identifier = `prayer_${prayerKey}_${dateStr}`;
        const primaryNotificationProtected = protectedPrayerNotificationIds.has(identifier);

        const triggerDate = prayerTimeToDateForDay(timeStr, targetDate, notifSettings.advanceMinutes);
        if (triggerDate <= now && !primaryNotificationProtected) {
          console.log(`[prayer-notif] SKIP ${prayerKey} d+${dayOffset} — past (${triggerDate.toISOString()} <= ${now.toISOString()})`);
          continue;
        }

        const isFriday = targetDate.getDay() === 5; // 5 = Friday in JS Date
        const prayerName = (prayerKey === 'dhuhr' && isFriday) ? t('prayer.jumuah') : t(`prayer.${prayerKey}`);
        const notifTitle = getPrayerNotifTitle(prayerKey, lang, isFriday);
        const cleanTime = timeStr.replace(/\s*\([^)]*\)\s*/, '').trim();

        if (primaryNotificationProtected) {
          scheduledIds.push(identifier);
          console.log(`[prayer-notif] 🛡️ SKIP replacing protected imminent ${identifier}; existing OS notification remains armed`);
        } else {
          try {
          // Advance reminder uses a gentle notification sound, not the full adhan.
          // The actual adhan notification (advanceMinutes=0) uses the adhan channel.
          const isAdvanceReminder = notifSettings.advanceMinutes > 0;
          // Full adhan only applies when the notification fires AT prayer time.
          // Advance reminders use the regular reminder sound and route to the prayer tab.
          const useFullAdhanForThisNotif = shouldUseFullAdhan && !isAdvanceReminder;
          const channelId = isAdvanceReminder
            ? 'general'
            : (prayerKey === 'fajr' ? fajrChannelId : regularChannelId);
          const notifSound = isAdvanceReminder
            ? 'default'
            : soundValue;
          const message = useFullAdhanForThisNotif
            ? t('fullAdhan.tapToOpen')
            : (notifSettings.advanceMinutes > 0
                ? t('notificationSounds.advanceReminderBody')
                    .replace('{count}', String(notifSettings.advanceMinutes))
                    .replace('{prayer}', prayerName)
                : getPrayerMessage(prayerKey, lang, isFriday));
          console.log(`[prayer-notif] SCHEDULING ${prayerKey}${isFriday && prayerKey === 'dhuhr' ? ' (JUMUAH)' : ''} d+${dayOffset} → ${triggerDate.toISOString()} | id=${identifier} | ch=${channelId}`);
          const { id, usedSilentFallback } = await schedulePrayerVisualFirstNotification({
            identifier,
            prayerKey,
            content: {
              title: dirText(notifTitle),
              body: dirText(message),
              data: {
                // Route taps to full-adhan.tsx only when firing at actual prayer time.
                // Advance reminders always route to the prayer tab.
                type: useFullAdhanForThisNotif ? 'full_adhan' : 'prayer',
                prayer: prayerKey,
                voice: fullAdhanVoice,
                test: '0',
                time: cleanTime,
                soundType: useFullAdhanForThisNotif ? fullAdhanNotificationSound : effectiveSoundType,
                regularSoundType: effectiveSoundType,
                fullAdhanSoundType: fullAdhanVoice,
                iconType: 'mosque',
                ...(Platform.OS === 'android' && useFullAdhanForThisNotif && { androidFullAdhan: 'true' }),
              },
              sound: notifSound,
              priority: isAdvanceReminder
                ? Notifications.AndroidNotificationPriority.HIGH
                : Notifications.AndroidNotificationPriority.MAX,
              // iOS: bypass Focus mode for prayer notifications
              // NOTE: 'timeSensitive' does NOT require Apple's critical-alerts entitlement.
              // 'critical' silently drops the notification without the entitlement.
              ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
              // iOS: attach the did_you_pray action buttons ("صليت" / "سأصلي قريباً")
              // directly on the prayer notification. This eliminates the need to schedule
              // separate did_you_pray follow-ups upfront on iOS — critical for staying within
              // the 64-notification hard limit.
              ...(Platform.OS === 'ios' && (notifSettings.didYouPrayReminder !== false) && prayerKey !== 'sunrise' && {
                categoryIdentifier: DID_YOU_PRAY_CATEGORY,
              }),
              ...(Platform.OS === 'ios' && mosqueAttachments && { attachments: mosqueAttachments }),
              ...(Platform.OS === 'android' && { channelId }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              ...(Platform.OS === 'android' && { channelId }),
            },
          });
          scheduledIds.push(id);
          if (useFullAdhanForThisNotif) {
            console.log('[FullAdhan] schedule result:', {
              identifier,
              id,
              prayerKey,
              triggerAt: triggerDate.toISOString(),
              soundValue,
              usedSilentFallback,
            });
          }
          console.log(`[prayer-notif] ✅ ${prayerKey} d+${dayOffset} scheduled OK (id=${id}${usedSilentFallback ? ', visual-only fallback' : ''}${isAdvanceReminder ? ', advance-reminder' : ''})`);

          // When full-adhan mode fires AT prayer time on Android, also schedule a native
          // AlarmManager trigger. Not used for advance reminders (wrong timing).
          if (Platform.OS === 'android' && useFullAdhanForThisNotif) {
            try {
              const FullAdhanModule = (NativeModules as any)?.FullAdhanModule;
              if (FullAdhanModule?.scheduleFullAdhan) {
                // Add 1-second offset so the service starts AFTER the system notification
                // sound channel has begun playing. Without this, both compete for audio
                // focus at the exact same millisecond, causing the service to get
                // AUDIOFOCUS_LOSS_TRANSIENT immediately and stop after 2-3 seconds.
                await FullAdhanModule.scheduleFullAdhan(
                  triggerDate.getTime() + 1000,
                  fullAdhanNotificationSound,
                  prayerName,
                  fullAdhanRequestCode++,
                );
              } else {
                console.warn('[prayer-notif] FullAdhanModule unavailable — full adhan playback will not fire when app is killed. Run `expo prebuild --clean` to install the native module.');
              }
            } catch (e) {
              console.warn(`[prayer-notif] FullAdhanModule.scheduleFullAdhan failed for ${prayerKey} d+${dayOffset}:`, e);
            }
          }
          } catch (e) {
            console.error(`[prayer-notif] ❌ FAILED to schedule ${prayerKey} d+${dayOffset}:`, e);
          }
        }

        // ─── Schedule "هل صليت؟" reminder after the actual prayer time ───
        // Delay is user-configurable (default 30 min). Skip sunrise.
        // If the user uses Salati and completes the prayer, app/salati.tsx
        // cancels did_you_pray_${prayerKey} and fires "أتممت صلاتك" immediately.
        //
        // iOS: SKIP — the prayer notification itself carries the did_you_pray category
        // so action buttons appear inline. Scheduling separate follow-ups would consume
        // up to 28 of the 64 iOS notification slots (4 prayers × 7 days).
        // Android keeps the upfront scheduling because Android has no per-app cap.
        const didYouPrayEnabled = notifSettings.didYouPrayReminder !== false; // default true
        const didYouPrayDelay = notifSettings.didYouPrayDelayMinutes ?? 30;
        const didYouPraySnooze = notifSettings.didYouPraySnoozeMinutes ?? 15;
        if (Platform.OS !== 'ios' && prayerKey !== 'sunrise' && didYouPrayEnabled) {
          const reminderDate = prayerTimeToDateForDay(timeStr, targetDate, 0);
          reminderDate.setMinutes(reminderDate.getMinutes() + didYouPrayDelay);
          if (reminderDate > now) {
            try {
              const didYouPrayId = `did_you_pray_${prayerKey}_${dateStr}`;
              const didYouPrayChannelId = getReminderChannelId('notif_after_prayer');
              const didYouPraySound = resolveNotificationSound('notif_after_prayer', true);
              await Notifications.scheduleNotificationAsync({
                identifier: didYouPrayId,
                content: {
                  title: dirText(t('notifications.didYouPray')),
                  body: dirText(t('notifications.didYouPrayBody')),
                  data: { type: 'did_you_pray', prayer: prayerKey, snoozeMinutes: didYouPraySnooze },
                  sound: didYouPraySound,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  categoryIdentifier: DID_YOU_PRAY_CATEGORY,
                  // Android-only branch — iOS uses inline action buttons on the prayer notification itself.
                  ...(Platform.OS === 'android' && { channelId: didYouPrayChannelId }),
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: reminderDate,
                  ...(Platform.OS === 'android' && { channelId: didYouPrayChannelId }),
                },
              });
              scheduledIds.push(didYouPrayId);
            } catch (e) {
              console.error(`[prayer-notif] ❌ FAILED to schedule did_you_pray ${prayerKey} d+${dayOffset}:`, e);
            }
          }
        }
      }
    }

    console.log(`✅ Scheduled ${scheduledIds.length} prayer notifications (${scheduleDays.length} days${usedOfflineFallback ? ', OFFLINE' : ''})`);
    // Dump all scheduled prayer IDs for ADB debugging
    console.log(`[prayer-notif] IDs: ${scheduledIds.join(', ')}`);

    // Phase C: If zero prayers were scheduled despite being enabled, treat as failure
    // so the caller (notifications-manager) can detect and log it.
    if (scheduledIds.length === 0) {
      console.warn('[prayer-notif] ⚠️ Zero prayers scheduled — all may have been in the past or data was empty');
    }
  } catch (e) {
    console.error('[prayer-notif] ❌ Failed to fetch/schedule prayer times:', e);
    // Re-throw so notifications-manager knows prayer scheduling failed
    // and can log it to the persistent diagnostic store.
    throw e;
  }
}

// ─── إلغاء جميع الإشعارات ────────────────────────────────────────────────────
export async function cancelAllPrayerNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('prayer_') || n.identifier.startsWith('did_you_pray_')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  // Also clear any pending native AlarmManager triggers for full-adhan playback.
  if (Platform.OS === 'android') {
    try {
      const FullAdhanModule = (NativeModules as any)?.FullAdhanModule;
      if (FullAdhanModule?.cancelAllFullAdhan) {
        await FullAdhanModule.cancelAllFullAdhan();
      }
    } catch (e) {
      console.warn('[prayer-notif] FullAdhanModule.cancelAllFullAdhan failed:', e);
    }
  }
}

// ─── الحصول على الإشعارات المجدولة ───────────────────────────────────────────
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// ─── إعادة الجدولة اليومية ───────────────────────────────────────────────────
export async function rescheduleIfNeeded(notifSettings: NotificationSettings): Promise<void> {
  if (!notifSettings.enabled) return;
  const scheduled = await getScheduledNotifications();
  if (scheduled.length < 3) {
    await schedulePrayerNotifications(notifSettings);
  }
}
