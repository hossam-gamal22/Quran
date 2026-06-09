// lib/widget-format-duration.ts
//
// Shared compact duration formatter for prayer-widget timers. ALL countdown
// / since / until / time-remaining values shown to the user in prayer
// widgets (gallery, baked-PNG previews, iOS WidgetKit overlay, Android
// headless task, Lock Screen) must route through this formatter.
//
// HH:MM:SS is intentionally NOT supported. Format rules:
//
//   English:
//     duration >= 1h           → "1H 52M"        (no space between number and unit)
//     1m <= duration < 1h      → "52M"
//     duration < 1m            → "50S"
//
//   Arabic:
//     duration >= 1h           → "1 س 52 د"      (space between number and unit)
//     1m <= duration < 1h      → "52 د"
//     duration < 1m            → "50 ث"
//
// `prefix` is an optional decorator that places "in"/"بعد"/"since"/"منذ"
// (etc.) in front of the duration. The decorator localizes naturally per
// language using the same compact body.

export type DurationLang = 'ar' | 'en';

/**
 * Wider gap placed AFTER «س» (before the minutes) in the Arabic ≥1h format, e.g.
 * «١ س ٤ د» → «١ س ٤ د» with a roomier س↔minute gap. EN SPACE (U+2002, ½em) is
 * used instead of a regular double-space because it is NOT collapsed by SVG
 * whitespace handling (the picker thumbnail) and renders at a consistent width
 * across RN Text, RemoteViews, and SwiftUI.
 */
export const SIN_MINUTE_GAP = ' ';

/**
 * Prayer epochs carry seconds (e.g. Fajr 4:11:23) but the widget shows HH:MM
 * ("4:11"). Truncating the prayer epoch to the minute before a countdown delta
 * makes the displayed minutes equal the wall-clock HH:MM difference (so 4:33 vs
 * Fajr 4:11 reads «منذ ٢٢ د», not 21). `now` is intentionally left un-truncated.
 */
export function truncateEpochToMinute(ms: number): number {
  return Math.floor(ms / 60000) * 60000;
}

/**
 * Returns a compact human-friendly duration string. Never HH:MM:SS.
 *
 * `roundUpMinutes` rounds a partial minute UP to the next whole minute. Use it
 * for "until next prayer" countdowns so the shown value matches the wall-clock
 * minute difference: at 8:06:40 with the next prayer at 8:30 the remaining is
 * 23m20s — flooring shows "23 د" while the user reads 8:30−8:06 = 24. Elapsed
 * ("since") timers keep flooring (you have been past the prayer for ≥N whole
 * minutes), so this defaults to false.
 */
export function formatPrayerDurationCompact(
  seconds: number,
  language: DurationLang = 'en',
  roundUpMinutes = false,
): string {
  // Clamp negative values to zero — the widget should never display "-5M".
  const total = Math.max(0, Math.floor(seconds));
  const isArabic = language === 'ar';
  if (total < 60) {
    return isArabic ? `${total} ث` : `${total}S`;
  }
  const totalMinutes = roundUpMinutes ? Math.ceil(total / 60) : Math.floor(total / 60);
  if (totalMinutes < 60) {
    return isArabic ? `${totalMinutes} د` : `${totalMinutes}M`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  // Wider gap after «س» (SIN_MINUTE_GAP) per the widget spacing request.
  return isArabic ? `${hours} س${SIN_MINUTE_GAP}${minutes} د` : `${hours}H ${minutes}M`;
}

/**
 * Format a duration FROM `now` until a future epoch (or how long since
 * a past epoch). Negative deltas are clamped to 0. Used by widget previews
 * to render compact countdowns / "ago" timers from a target timestamp.
 */
export function formatPrayerDurationToEpoch(
  targetEpochMs: number | undefined | null,
  nowMs: number,
  language: DurationLang = 'en',
  direction: 'until' | 'since' = 'until',
): string {
  if (!targetEpochMs || !Number.isFinite(targetEpochMs)) {
    return formatPrayerDurationCompact(0, language);
  }
  // Truncate the prayer epoch to the minute so the shown minutes equal the
  // displayed HH:MM difference (the row shows "4:11", not "4:11:23"). `now`
  // stays as-is and "until" still rounds its partial minute up.
  const target = truncateEpochToMinute(targetEpochMs);
  const deltaMs = direction === 'until' ? target - nowMs : nowMs - target;
  return formatPrayerDurationCompact(Math.max(0, Math.floor(deltaMs / 1000)), language, direction === 'until');
}

/**
 * Prefixed compact duration — e.g. "in 1H 52M" / "بعد 1 س 52 د" /
 * "52M ago" / "منذ 52 د". The prefix is conventional per language:
 *   - `until` → "in" / "بعد"
 *   - `since` → "ago" suffix / "منذ" prefix
 */
export function formatPrayerDurationWithPrefix(
  targetEpochMs: number | undefined | null,
  nowMs: number,
  language: DurationLang = 'en',
  direction: 'until' | 'since' = 'until',
): string {
  const body = formatPrayerDurationToEpoch(targetEpochMs, nowMs, language, direction);
  const isArabic = language === 'ar';
  if (direction === 'until') {
    return isArabic ? `بعد ${body}` : `in ${body}`;
  }
  return isArabic ? `منذ ${body}` : `${body} ago`;
}
