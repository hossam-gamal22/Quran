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
