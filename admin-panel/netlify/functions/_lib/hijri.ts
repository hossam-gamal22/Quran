// admin-panel/netlify/functions/_lib/hijri.ts
// Server-side Gregorian → Hijri conversion (mirrors lib/hijri-date.ts in the
// mobile app). Pure: no React Native or browser deps. Tabular algorithm —
// accurate enough for "what Hijri date is tomorrow?" event matching.

export interface HijriDate {
  day: number;
  month: number; // 1-12
  year: number;
}

function isHijriLeapYear(year: number): boolean {
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(year % 30);
}

function getHijriMonthDays(year: number, month: number): number {
  if (month % 2 === 1) return 30;
  if (month === 12 && isHijriLeapYear(year)) return 30;
  return 29;
}

export function gregorianToHijri(date: Date): HijriDate {
  const g = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const gd = date.getUTCDate();

  const a = Math.floor((14 - m) / 12);
  const y = g + 4800 - a;
  const mo = m + 12 * a - 3;
  const julianDay =
    gd +
    Math.floor((153 * mo + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const l = julianDay - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  let hijriYear = 30 * n + j - 30;
  let hijriMonth = Math.floor((24 * (l3 - 1)) / 709);
  let hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);

  const maxDays = getHijriMonthDays(hijriYear, hijriMonth);
  if (hijriDay > maxDays) {
    hijriDay = hijriDay - maxDays;
    hijriMonth += 1;
    if (hijriMonth > 12) {
      hijriMonth = 1;
      hijriYear += 1;
    }
  }

  return { day: hijriDay, month: hijriMonth, year: hijriYear };
}

/**
 * Compute the current "local time" components for a user in a given IANA
 * timezone. Returns the date/hour as observed by that user *right now*
 * (when the cron tick fired in UTC).
 *
 * Returns null when the timezone string is unknown to Intl on this runtime.
 */
export function nowInTimezone(
  utcNow: Date,
  timezone: string
): { year: number; month: number; day: number; hour: number; gregorianMidnightUTC: Date } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(utcNow);

    const get = (type: string): number => {
      const part = parts.find((p) => p.type === type);
      return part ? parseInt(part.value, 10) : NaN;
    };

    const year = get('year');
    const month = get('month');
    const day = get('day');
    let hour = get('hour');
    if (hour === 24) hour = 0; // some locales emit "24" at midnight

    if (![year, month, day, hour].every((n) => Number.isFinite(n))) {
      return null;
    }

    // Build a UTC date that represents 00:00 *in the user's local day*
    // (this is what we use to compute "tomorrow's Hijri date" reproducibly).
    const gregorianMidnightUTC = new Date(Date.UTC(year, month - 1, day));
    return { year, month, day, hour, gregorianMidnightUTC };
  } catch {
    return null;
  }
}

/**
 * Compute Hijri date for "N days from a given Gregorian midnight". Used to
 * answer "what Hijri date will it be tomorrow in the user's local time?"
 */
export function hijriForDaysAhead(localMidnightUTC: Date, daysAhead: number): HijriDate {
  const target = new Date(localMidnightUTC);
  target.setUTCDate(target.getUTCDate() + daysAhead);
  return gregorianToHijri(target);
}

// ─── Country-level overrides (mirrors lib/hijri-overrides.ts in the app) ──

export interface HijriOverrideRecord {
  countryCode: string;       // "SA", "AE", "EG"...
  hijriYear: number;
  hijriMonth: number;        // 1-12
  monthLength: 29 | 30;
  hijriStartGregorian: string; // ISO date "YYYY-MM-DD"
}

const MS_PER_DAY = 86400000;

function parseIsoDate(value: string): Date | null {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Compute Hijri date for a specific Gregorian day using the country's admin
 * overrides when available, falling back to the tabular algorithm.
 *
 * Strategy:
 *   1. Try each override doc for the country and check whether `target` falls
 *      inside its [startGregorian, startGregorian + monthLength) window.
 *   2. If yes, derive the Hijri day as `(target - start) + 1`.
 *   3. If no override covers `target`, fall back to `gregorianToHijri(target)`.
 *
 * This matches the app-side resolver in lib/hijri-overrides.ts so the cron
 * never sends an event notification on a date that disagrees with what the
 * user sees in their app.
 */
export function hijriForDateWithOverride(
  target: Date,
  country: string,
  overrides: HijriOverrideRecord[],
): HijriDate {
  const code = (country || '').toUpperCase();
  if (code && overrides.length > 0) {
    const candidates = overrides.filter((o) => o.countryCode.toUpperCase() === code);
    for (const ov of candidates) {
      const start = parseIsoDate(ov.hijriStartGregorian);
      if (!start) continue;
      const diff = Math.floor((target.getTime() - start.getTime()) / MS_PER_DAY);
      if (diff >= 0 && diff < ov.monthLength) {
        return {
          day: diff + 1,
          month: ov.hijriMonth,
          year: ov.hijriYear,
        };
      }
    }
  }
  return gregorianToHijri(target);
}

/**
 * Convenience: compute Hijri for "N days from local-midnight" with override
 * support. Used by the cron to answer "what date will the user see tomorrow
 * in their app?"
 */
export function hijriForDaysAheadWithOverride(
  localMidnightUTC: Date,
  daysAhead: number,
  country: string,
  overrides: HijriOverrideRecord[],
): HijriDate {
  const target = new Date(localMidnightUTC);
  target.setUTCDate(target.getUTCDate() + daysAhead);
  return hijriForDateWithOverride(target, country, overrides);
}
