import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAlarmChannelId } from '@/services/notifications/channels';
import { dirText } from '@/lib/notification-text-direction';
import { resolveNotificationSound } from '@/lib/resolve-notification-sound';
import { uiText } from '@/lib/ui-text';
import { getCachedPrayerTimes, getTodayDateString, type PrayerTimes } from '@/lib/prayer-times';
import {
  CASCADE_COUNT,
  CASCADE_INTERVAL_SEC,
  type SmartAlarmConfig,
  type SmartAlarmKind,
  type SmartAlarmPayload,
} from './types';
import {
  clearCascadeIds,
  getCascadeIds,
  loadSmartAlarmConfig,
  saveCascadeIds,
} from './storage';

const PRIMARY_KEY_PREFIX = '@smart_alarm_notif_id_';

// The smart alarm's whole point is the *cascade* (6 rings every 10s). A single
// daily notification wouldn't wake anyone, so every scheduled day gets the FULL
// cascade. To respect the iOS 64-notification cap we limit how many days we
// arm on iOS and dynamically shrink if the OS is already crowded. Android has
// no such cap, so we arm the full window there.
const FAJR_CASCADE_MAX_DAYS = Platform.OS === 'ios' ? 3 : 7;
const SUHOOR_MAX_DAYS = Platform.OS === 'ios' ? 3 : 7;

// iOS allows at most 64 pending notifications per app (shared across prayers,
// adhkar, etc). We never consume the last few slots so other features keep working.
const IOS_NOTIF_LIMIT = 64;
const IOS_SAFETY_MARGIN = 6;

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(v)));
}

function parseTimeToDate(time: string, day: Date): Date | null {
  if (!time) return null;
  const cleaned = time.replace(/\s*\([^)]*\)/g, '').trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  const result = new Date(day);
  result.setHours(hours, mins, 0, 0);
  return result;
}

/**
 * Compute the next Fajr trigger Date given today's prayer times + an offset.
 * Returns the *primary* trigger (cascade index 0). Subsequent cascade entries
 * are offset by `CASCADE_INTERVAL_SEC` from this anchor.
 */
export function computeNextTrigger(
  prayerTimes: PrayerTimes,
  offsetMinutes: number,
  now: Date = new Date(),
): Date | null {
  const todayFajr = parseTimeToDate(prayerTimes.fajr, now);
  if (!todayFajr) return null;

  const candidate = new Date(todayFajr.getTime() - offsetMinutes * 60_000);
  if (candidate.getTime() > now.getTime() + 30_000) return candidate;

  const tomorrowFajr = new Date(todayFajr.getTime() + 24 * 60 * 60 * 1000);
  return new Date(tomorrowFajr.getTime() - offsetMinutes * 60_000);
}

function primaryKey(kind: SmartAlarmKind): string {
  return `${PRIMARY_KEY_PREFIX}${kind}`;
}

/** Returns a YYYY-MM-DD string for `today + offsetDays`. */
function dateStringForOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute the list of future fajr-anchored trigger times across the next
 * DAYS_AHEAD days, applying `offsetMinutes`. Uses each day's real cached
 * prayer times when available, otherwise falls back to today's fajr + 24h*n
 * (a close approximation that self-corrects every time the app reschedules).
 */
async function computeDayTriggers(
  todayPrayerTimes: PrayerTimes,
  offsetMinutes: number,
  maxDays: number,
  now: Date = new Date(),
): Promise<Date[]> {
  const triggers: Date[] = [];

  for (let i = 0; i < maxDays; i++) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() + i);

    // Prefer the real cached prayer times for that exact day.
    let fajrStr: string | null = null;
    try {
      const cached = await getCachedPrayerTimes(dateStringForOffset(i));
      if (cached?.fajr) fajrStr = cached.fajr;
    } catch {}
    // Fallback: today's fajr applied to that calendar day.
    if (!fajrStr) fajrStr = todayPrayerTimes.fajr;

    const fajrAtDay = parseTimeToDate(fajrStr, dayDate);
    if (!fajrAtDay) continue;

    const trigger = new Date(fajrAtDay.getTime() - offsetMinutes * 60_000);
    if (trigger.getTime() > now.getTime() + 30_000) {
      triggers.push(trigger);
    }
  }

  // Sort ascending so index 0 is always the nearest upcoming trigger.
  triggers.sort((a, b) => a.getTime() - b.getTime());
  return triggers;
}

/**
 * Compute suhoor triggers for the user-selected calendar dates. Only future
 * dates are kept, sorted ascending, capped at `maxCount` (nearest first) to
 * respect the iOS notification limit. Each date's real fajr time is used when
 * cached, otherwise today's fajr applied to that date.
 */
async function computeSelectedDateTriggers(
  todayPrayerTimes: PrayerTimes,
  offsetMinutes: number,
  selectedDates: string[],
  maxCount: number,
  now: Date = new Date(),
): Promise<Date[]> {
  const triggers: Date[] = [];

  // Future-only, de-duplicated, ascending.
  const unique = Array.from(new Set(selectedDates)).sort();

  for (const dateStr of unique) {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) continue;
    const dayDate = new Date(
      parseInt(match[1], 10),
      parseInt(match[2], 10) - 1,
      parseInt(match[3], 10),
    );

    let fajrStr: string | null = null;
    try {
      const cached = await getCachedPrayerTimes(dateStr);
      if (cached?.fajr) fajrStr = cached.fajr;
    } catch {}
    if (!fajrStr) fajrStr = todayPrayerTimes.fajr;

    const fajrAtDay = parseTimeToDate(fajrStr, dayDate);
    if (!fajrAtDay) continue;

    const trigger = new Date(fajrAtDay.getTime() - offsetMinutes * 60_000);
    if (trigger.getTime() > now.getTime() + 30_000) {
      triggers.push(trigger);
    }
  }

  triggers.sort((a, b) => a.getTime() - b.getTime());
  return triggers.slice(0, maxCount);
}

/**
 * Cancel ALL pending notifications for a kind — both the saved primary id
 * and the entire cascade. Safe to call repeatedly.
 */
export async function cancelAllPendingRings(kind: SmartAlarmKind): Promise<void> {
  try {
    const prevId = await AsyncStorage.getItem(primaryKey(kind));
    if (prevId) {
      await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => {});
      await AsyncStorage.removeItem(primaryKey(kind));
    }
    const cascade = await getCascadeIds(kind);
    for (const id of cascade) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    await clearCascadeIds(kind);
  } catch {}
}

interface ScheduleArgs {
  kind: SmartAlarmKind;
  triggerDate: Date;
  soundKey: string;
  title: string;
  body: string;
  cascadeIndex: number;
}

async function scheduleOne(args: ScheduleArgs): Promise<string | null> {
  const { kind, triggerDate, soundKey, title, body, cascadeIndex } = args;
  if (triggerDate.getTime() <= Date.now()) return null;

  // Both Fajr and Suhoor use the dedicated alarm channels (bypassDnd + alarm
  // vibration). The ringtone is one of the alarm_* sounds for both kinds.
  const channelId = getAlarmChannelId(soundKey);
  const resolvedSound = resolveNotificationSound(soundKey, true);

  const payload: SmartAlarmPayload = {
    type: 'smart_alarm',
    kind,
    scheduledAt: triggerDate.toISOString(),
    cascadeIndex,
  };

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(title),
        body: dirText(body),
        data: payload as unknown as Record<string, unknown>,
        sound: resolvedSound === false ? undefined : resolvedSound,
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' && { channelId }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' && { channelId }),
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('[SmartAlarm] schedule failed', kind, cascadeIndex, e);
    return null;
  }
}

export interface ScheduleResult {
  fajr: { scheduled: boolean; triggerAt: Date | null; cascadeCount: number };
  suhoor: { scheduled: boolean; triggerAt: Date | null; cascadeCount: number };
}

/**
 * Compute how many cascade days we can afford on iOS without breaching the
 * 64-notification cap. Fajr is prioritised (it's the cascade); Suhoor takes
 * whatever single-notification slots remain. On Android there is no cap.
 */
async function computeDayBudgets(
  fajrEnabled: boolean,
  suhoorEnabled: boolean,
): Promise<{ fajrDays: number; suhoorDays: number; crowded: boolean }> {
  let fajrDays = fajrEnabled ? FAJR_CASCADE_MAX_DAYS : 0;
  let suhoorDays = suhoorEnabled ? SUHOOR_MAX_DAYS : 0;

  if (Platform.OS !== 'ios') {
    return { fajrDays, suhoorDays, crowded: false };
  }

  let existing = 0;
  try {
    existing = (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {}

  // Free slots we're allowed to use (minus the maintenance reminder = 1).
  let budget = IOS_NOTIF_LIMIT - existing - IOS_SAFETY_MARGIN - 1;
  if (budget < 0) budget = 0;

  // Fajr first: each day costs CASCADE_COUNT notifications.
  if (fajrEnabled) {
    fajrDays = clampInt(budget / CASCADE_COUNT, 0, FAJR_CASCADE_MAX_DAYS);
    budget -= fajrDays * CASCADE_COUNT;
  }
  // Suhoor next: each day costs 1.
  if (suhoorEnabled) {
    suhoorDays = clampInt(budget, 0, SUHOOR_MAX_DAYS);
    budget -= suhoorDays;
  }

  // "crowded" = we couldn't arm the full desired window, so the user should
  // reopen the app sooner to keep the alarm topped up.
  const crowded =
    (fajrEnabled && fajrDays < FAJR_CASCADE_MAX_DAYS) ||
    (suhoorEnabled && suhoorDays < SUHOOR_MAX_DAYS);

  return { fajrDays, suhoorDays, crowded };
}

/**
 * Schedules the smart alarm. Every armed day gets the FULL cascade (6 rings
 * every 10s) — the cascade is the whole point. Arms up to FAJR_CASCADE_MAX_DAYS
 * (3 on iOS / 7 on Android), shrinking on iOS if near the 64-notification cap,
 * then schedules a maintenance reminder so the user reopens before it runs out.
 */
export async function scheduleSmartAlarms(
  config: SmartAlarmConfig,
  prayerTimes: PrayerTimes | null,
): Promise<ScheduleResult> {
  const result: ScheduleResult = {
    fajr: { scheduled: false, triggerAt: null, cascadeCount: 0 },
    suhoor: { scheduled: false, triggerAt: null, cascadeCount: 0 },
  };

  // Always clear stale rings first
  await cancelAllPendingRings('fajr');
  await cancelAllPendingRings('suhoor');

  if (!prayerTimes) {
    return result;
  }

  const { fajrDays, suhoorDays } = await computeDayBudgets(
    config.fajr.enabled,
    config.suhoor.enabled,
  );

  // ── Fajr: FULL cascade for every armed day ──
  if (config.fajr.enabled && fajrDays > 0) {
    const dayTriggers = await computeDayTriggers(prayerTimes, config.fajr.offsetMinutes, fajrDays);
    if (dayTriggers.length > 0) {
      const title = uiText({ ar: 'حان وقت صلاة الفجر', en: 'Time for Fajr prayer' });
      const body = uiText({
        ar: 'الصلاة خير من النوم — افتح التطبيق لإيقاف المنبه',
        en: 'Prayer is better than sleep — open the app to dismiss',
      });
      const ids: string[] = [];

      for (const anchor of dayTriggers) {
        for (let i = 0; i < CASCADE_COUNT; i++) {
          const trigger = new Date(anchor.getTime() + i * CASCADE_INTERVAL_SEC * 1000);
          const id = await scheduleOne({
            kind: 'fajr',
            triggerDate: trigger,
            soundKey: config.fajr.ringtoneKey,
            title,
            body,
            cascadeIndex: i,
          });
          if (id) ids.push(id);
        }
      }

      if (ids.length > 0) {
        await AsyncStorage.setItem(primaryKey('fajr'), ids[0]);
        await saveCascadeIds('fajr', ids);
        result.fajr.scheduled = true;
        result.fajr.triggerAt = dayTriggers[0];
        result.fajr.cascadeCount = ids.length;
      }
    }
  }

  // ── Suhoor: a single notification on each user-selected fasting date ──
  if (config.suhoor.enabled && suhoorDays > 0 && config.suhoor.selectedDates.length > 0) {
    const dayTriggers = await computeSelectedDateTriggers(
      prayerTimes,
      config.suhoor.offsetMinutes,
      config.suhoor.selectedDates,
      suhoorDays,
    );
    if (dayTriggers.length > 0) {
      const title = uiText({ ar: 'وقت السحور', en: 'Suhoor time' });
      const body = uiText({ ar: 'تسحروا فإن في السحور بركة', en: 'Eat suhoor — there is blessing in it' });
      const ids: string[] = [];

      for (const trigger of dayTriggers) {
        const id = await scheduleOne({
          kind: 'suhoor',
          triggerDate: trigger,
          soundKey: config.suhoor.ringtoneKey,
          title,
          body,
          cascadeIndex: 0,
        });
        if (id) ids.push(id);
      }

      if (ids.length > 0) {
        await AsyncStorage.setItem(primaryKey('suhoor'), ids[0]);
        await saveCascadeIds('suhoor', ids);
        result.suhoor.scheduled = true;
        result.suhoor.triggerAt = dayTriggers[0];
        result.suhoor.cascadeCount = ids.length;
      }
    }
  }

  // Note: the "reopen the app" nudge is handled globally by
  // scheduleGlobalMaintenanceReminder() (covers prayers + adhkar + alarm), not here.

  return result;
}

/**
 * Loads the smart-alarm config + today's cached prayer times from storage and
 * (re)schedules everything. Safe to call from the background task and on every
 * app foreground — it always clears stale rings first.
 *
 * Returns the next fajr/suhoor trigger times (or null) for UI display.
 */
export async function rescheduleSmartAlarmsFromStorage(): Promise<ScheduleResult> {
  const config = await loadSmartAlarmConfig();
  const empty: ScheduleResult = {
    fajr: { scheduled: false, triggerAt: null, cascadeCount: 0 },
    suhoor: { scheduled: false, triggerAt: null, cascadeCount: 0 },
  };
  // Nothing enabled → make sure any stale rings are cleared and bail.
  if (!config.fajr.enabled && !config.suhoor.enabled) {
    await cancelAllPendingRings('fajr');
    await cancelAllPendingRings('suhoor');
    return empty;
  }
  try {
    const prayerTimes = await getCachedPrayerTimes(getTodayDateString());
    return await scheduleSmartAlarms(config, prayerTimes as PrayerTimes | null);
  } catch {
    return empty;
  }
}

export async function cancelAllSmartAlarms(): Promise<void> {
  await cancelAllPendingRings('fajr');
  await cancelAllPendingRings('suhoor');
}

/**
 * Fires a one-shot preview notification ~1 second from now so the user hears
 * exactly the lockscreen sound they'll get at Fajr time. Used by the "معاينة
 * المنبه" button — the ring screen is then opened 2 seconds later for the
 * full in-app challenge simulation.
 */
export async function firePreviewNotification(soundKey: string): Promise<void> {
  const channelId = getAlarmChannelId(soundKey);
  const resolvedSound = resolveNotificationSound(soundKey, true);
  const triggerDate = new Date(Date.now() + 1_000);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: dirText(uiText({ ar: 'معاينة المنبه الذكي', en: 'Smart alarm preview' })),
        body: dirText(uiText({
          ar: 'هذا مثال على الإشعار الذي سيصلك وقت الفجر',
          en: 'A sample of the notification you will receive at Fajr',
        })),
        data: { type: 'smart_alarm_preview' },
        sound: resolvedSound === false ? undefined : resolvedSound,
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' && { channelId }),
        ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' && { channelId }),
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('[SmartAlarm] preview fire failed', e);
  }
}
