/**
 * Safe time string parser — تحليل آمن لنصوص الوقت
 *
 * Parses "HH:MM" strings with validation.
 * Returns fallback (default 0:0) for invalid/malformed input.
 */
export function safeParseTime(
  timeStr: string | undefined | null,
  fallback: { hour: number; minute: number } = { hour: 0, minute: 0 }
): { hour: number; minute: number } {
  if (!timeStr || typeof timeStr !== 'string') return fallback;

  const parts = timeStr.split(':');
  if (parts.length < 2) return fallback;

  const h = Number(parts[0]);
  const m = Number(parts[1]);

  const hour = Number.isFinite(h) && h >= 0 && h <= 23 ? h : fallback.hour;
  const minute = Number.isFinite(m) && m >= 0 && m <= 59 ? m : fallback.minute;

  return { hour, minute };
}
