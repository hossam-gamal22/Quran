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

/** Returns a compact human-friendly duration string. Never HH:MM:SS. */
export function formatPrayerDurationCompact(
  seconds: number,
  language: DurationLang = 'en',
): string {
  // Clamp negative values to zero — the widget should never display "-5M".
  const total = Math.max(0, Math.floor(seconds));
  const isArabic = language === 'ar';
  if (total < 60) {
    return isArabic ? `${total} ث` : `${total}S`;
  }
  const totalMinutes = Math.floor(total / 60);
  if (totalMinutes < 60) {
    return isArabic ? `${totalMinutes} د` : `${totalMinutes}M`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return isArabic ? `${hours} س ${minutes} د` : `${hours}H ${minutes}M`;
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
  const deltaMs = direction === 'until' ? targetEpochMs - nowMs : nowMs - targetEpochMs;
  return formatPrayerDurationCompact(Math.max(0, Math.floor(deltaMs / 1000)), language);
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
