export type WidgetTimeLanguage = 'ar' | 'en';

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function numberPart(parts: Intl.DateTimeFormatPart[], type: string): number {
  const value = parts.find((part) => part.type === type)?.value;
  return Number(value);
}

export function partsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(date);

  return {
    year: numberPart(parts, 'year'),
    month: numberPart(parts, 'month'),
    day: numberPart(parts, 'day'),
    hour: numberPart(parts, 'hour') % 24,
    minute: numberPart(parts, 'minute'),
    second: numberPart(parts, 'second'),
  };
}

export function dateForTimeZoneCalendarDay(date: Date, timeZone: string, dayOffset = 0): Date {
  const parts = partsInTimeZone(date, timeZone);
  return new Date(parts.year, parts.month - 1, parts.day + dayOffset, 12, 0, 0, 0);
}

export function epochForCalendarDayLocalTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 2; i += 1) {
    const observedParts = partsInTimeZone(new Date(utc), timeZone);
    const observed = Date.UTC(
      observedParts.year,
      observedParts.month - 1,
      observedParts.day,
      observedParts.hour,
      observedParts.minute,
      observedParts.second,
    );
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = target - observed;
    if (delta === 0) return utc;
    utc += delta;
  }
  return utc;
}

export function epochForTimeStringOnDateInTimeZone(
  timeString: string,
  referenceDate: Date,
  timeZone: string,
  dayOffset = 0,
): number {
  const [rawHour, rawMinute] = timeString.split(':').map(Number);
  const hour = Number.isFinite(rawHour) ? rawHour : 0;
  const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
  const parts = partsInTimeZone(referenceDate, timeZone);
  const localNoon = new Date(parts.year, parts.month - 1, parts.day + dayOffset, 12, 0, 0, 0);
  const shifted = partsInTimeZone(localNoon, timeZone);
  return epochForCalendarDayLocalTime(shifted.year, shifted.month, shifted.day, hour, minute, timeZone);
}

export function formatEpochTimeInTimeZone(
  epochMs: number | undefined,
  timeZone: string | undefined,
  language: WidgetTimeLanguage,
): string | null {
  if (!epochMs || !Number.isFinite(epochMs)) return null;
  const date = new Date(epochMs);
  const safeTimeZone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value ?? 'AM').toUpperCase();
  const suffix = language === 'ar' ? (dayPeriod === 'PM' ? 'م' : 'ص') : dayPeriod;
  return `${hour}:${minute} ${suffix}`;
}
