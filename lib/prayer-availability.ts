// lib/prayer-availability.ts
// Smart prayer availability/window helper - روح المسلم
// Single source of truth for: when can a user record a prayer,
// what status is appropriate, and when should it auto-flip to "missed".

import type { DailyPrayerRecord, PrayerName, PrayerStatus } from '@/lib/worship-storage';

export type TrackedPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/**
 * Per-prayer window state (today only).
 * - upcoming: adhan hasn't fired yet → not recordable
 * - onTime:   within LATE_THRESHOLD_MINUTES of adhan → record as `prayed`
 * - lateOnly: 60+ min after adhan, before next prayer → record as `late` only
 * - expired:  next prayer has already started → auto-`missed` if not recorded
 */
export type PrayerWindowState = 'upcoming' | 'onTime' | 'lateOnly' | 'expired';

export interface PrayerTimesMap {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
  sunrise?: string;
}

export const LATE_THRESHOLD_MINUTES = 60;

const PRAYER_ORDER: TrackedPrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Parse a time string ("HH:mm" or "h:mm AM/PM" or locale fallback) into minutes-since-midnight.
 * Returns null if the string can't be parsed.
 */
export const parseTimeToMinutes = (timeValue?: string | null): number | null => {
  if (!timeValue) return null;
  const normalized = String(timeValue).trim();

  // 24h format HH:mm (allow trailing seconds or extra info)
  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    const hours = Number(hhmmMatch[1]);
    const minutes = Number(hhmmMatch[2]);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      // If the string also contains AM/PM, fall through to the locale parser below
      if (!/AM|PM/i.test(normalized)) {
        return hours * 60 + minutes;
      }
    }
  }

  // Locale fallback (handles "1:08 PM" etc.)
  const date = new Date(`1970-01-01 ${normalized}`);
  if (!Number.isNaN(date.getTime())) {
    return date.getHours() * 60 + date.getMinutes();
  }

  return null;
};

const nowMinutesFromDate = (now: Date): number => now.getHours() * 60 + now.getMinutes();

/**
 * Compute the smart window state for a given prayer using today's prayer times
 * and the current time. The "next prayer" cutoff handles the wrap-around for
 * Isha (extends until next-day Fajr).
 */
export const getPrayerWindowState = (
  prayer: TrackedPrayer,
  prayerTimes: PrayerTimesMap,
  now: Date = new Date()
): PrayerWindowState => {
  const nowMin = nowMinutesFromDate(now);
  const fajrMin = parseTimeToMinutes(prayerTimes.fajr);
  const prayerMin = parseTimeToMinutes(prayerTimes[prayer]);

  // No data → treat as upcoming so the UI stays disabled rather than misclassify.
  if (prayerMin === null) return 'upcoming';

  // Special handling around midnight: Isha's window extends until next-day Fajr.
  // Before today's Fajr, only Isha is recordable (it belongs to last night's Isha).
  if (fajrMin !== null && nowMin < fajrMin) {
    if (prayer !== 'isha') return 'upcoming';
    // Isha before next-day Fajr → still in its window (treat as lateOnly so users
    // who forgot to record before midnight can still log it as late).
    return 'lateOnly';
  }

  // After today's Fajr → standard timeline check.
  if (nowMin < prayerMin) return 'upcoming';

  const minutesSinceAdhan = nowMin - prayerMin;

  // Within the on-time grace window
  if (minutesSinceAdhan < LATE_THRESHOLD_MINUTES) return 'onTime';

  // Past the late threshold — has the next prayer started yet?
  const idx = PRAYER_ORDER.indexOf(prayer);
  const nextPrayer = PRAYER_ORDER[idx + 1];

  if (!nextPrayer) {
    // Isha → next is tomorrow's Fajr, which by definition is > nowMin today.
    // Stay in lateOnly until the user crosses midnight + Fajr (handled above).
    return 'lateOnly';
  }

  const nextMin = parseTimeToMinutes(prayerTimes[nextPrayer]);
  if (nextMin === null) return 'lateOnly';

  return nowMin >= nextMin ? 'expired' : 'lateOnly';
};

/**
 * Return the suggested status when the user records a prayer in the current window.
 * - onTime → 'prayed'
 * - lateOnly → 'late'
 * - upcoming/expired → null (not recordable via the smart flow; expired stays editable
 *   via the dropdown if the user wants to override the auto-`missed`).
 */
export const getSuggestedStatus = (state: PrayerWindowState): PrayerStatus | null => {
  if (state === 'onTime') return 'prayed';
  if (state === 'lateOnly') return 'late';
  return null;
};

/**
 * Apply auto-missed reconciliation for today's record. Any prayer whose window
 * is `expired` and whose stored status is still `none` flips to `missed`.
 *
 * Returns `{ record, changed }`. The original record is not mutated when
 * `changed` is false; callers can use `changed` to decide whether to persist.
 *
 * Already-recorded statuses (`prayed` / `late` / `missed`) are NEVER overwritten.
 */
export const applyAutoMissed = (
  record: DailyPrayerRecord,
  prayerTimes: PrayerTimesMap,
  now: Date = new Date()
): { record: DailyPrayerRecord; changed: boolean } => {
  let changed = false;
  const next: DailyPrayerRecord = { ...record };

  for (const prayer of PRAYER_ORDER) {
    const current = next[prayer];
    if (current !== 'none') continue;
    const state = getPrayerWindowState(prayer, prayerTimes, now);
    if (state === 'expired') {
      next[prayer] = 'missed';
      changed = true;
    }
  }

  return { record: changed ? next : record, changed };
};

/**
 * Convenience: extract a PrayerTimesMap from a DailyPrayerRecord's scheduledTimes.
 */
export const extractScheduledTimes = (record?: DailyPrayerRecord | null): PrayerTimesMap => {
  if (!record?.scheduledTimes) return {};
  return { ...record.scheduledTimes };
};

// Re-export for callers that want the underlying PrayerName type without a separate import
export type { PrayerName };
