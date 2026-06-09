// lib/widget-clock-format.ts
// Single source of truth for the device 12/24-hour clock preference used by ALL
// widget time displays (in-app gallery previews + home-screen widgets). The
// device toggle is an OS setting independent of language/locale (Android exposes
// it via DateFormat.is24HourFormat(), surfaced by expo-localization as
// `uses24hourClock`), so it is the only correct source — never the app language
// or the in-app `settings.prayer.show24Hour` toggle.

import * as Localization from 'expo-localization';

/**
 * Device 12/24-hour preference. `uses24hourClock` can be null on platforms that
 * don't report it; fall back to probing Intl for an AM/PM token.
 */
export function deviceUses24Hour(): boolean {
  try {
    const cal = Localization.getCalendars?.()[0];
    if (cal && typeof cal.uses24hourClock === 'boolean') return cal.uses24hourClock;
  } catch {
    // getCalendars can throw in headless/early contexts — fall through to probe.
  }
  try {
    const probe = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).formatToParts(
      new Date(2020, 0, 1, 13),
    );
    return !probe.some((p) => p.type === 'dayPeriod');
  } catch {
    return true; // 24h is the safest neutral default (no spurious AM/PM).
  }
}

/**
 * `HH:MM` honoring the device format. 24h → zero-padded `13:00`; 12h → `1:00`
 * (no AM/PM suffix — the minimalist digital clock never showed one). Prayer rows
 * that need an AM/PM suffix use `formatEpochTimeInTimeZone(..., use24Hour)`.
 */
export function formatClockHHMM(d: Date, use24: boolean): string {
  const h = use24 ? d.getHours() : d.getHours() % 12 || 12;
  const hh = use24 ? String(h).padStart(2, '0') : String(h);
  return `${hh}:${String(d.getMinutes()).padStart(2, '0')}`;
}
