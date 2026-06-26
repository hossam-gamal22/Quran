// lib/format-number.ts
// Number formatting utility — always uses Western numerals (0-9)

const EASTERN_TO_WESTERN: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * Ensure a number/string always uses Western digits (0-9).
 * Any Eastern Arabic numerals (٠-٩) are converted to Western.
 */
export function localizeNumber(n: number | string): string {
  return toWesternDigits(String(n));
}

/**
 * Convert any Eastern Arabic numerals in a string to Western digits.
 */
export function toWesternDigits(str: string): string {
  return str.replace(/[٠-٩]/g, (d) => EASTERN_TO_WESTERN[d] || d);
}

/**
 * @deprecated Use localizeNumber() instead — always returns Western digits.
 */
export function toArabicNumber(n: number | string): string {
  return String(n);
}

/**
 * Format a points/score value for display.
 * - Floors to a whole number — matches calculateMonthlyScore semantics; raw
 *   Firestore scores can be fractional (e.g. 28904.5) from 0.5-weight increments.
 * - < 100,000  → exact integer ("28904") — competition precision matters here.
 * - 100,000–999,999 → compact thousands ("128.4K"; trailing ".0" trimmed → "350K")
 * - >= 1,000,000 → compact millions ("1.3M")
 * Compact values are floored (never round up — don't display more than earned).
 * Always Western digits. No Intl — compact notation is inconsistent on Hermes.
 */
export function formatPoints(value: number): string {
  const v = Math.floor(Math.max(0, Number(value) || 0));
  if (v < 100_000) return String(v);
  const compact = (divisor: number, suffix: string) => {
    const scaled = Math.floor(v / (divisor / 10)) / 10; // one decimal, floored
    const str = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
    return `${str}${suffix}`;
  };
  if (v < 1_000_000) return compact(1_000, 'K');
  return compact(1_000_000, 'M');
}
