import { getLanguage } from '@/lib/i18n';

/**
 * Format a time for display in the user's current language.
 *
 * - Arabic: "3:56 صباحاً" / "1:07 مساءً"
 * - Other languages: "3:56 AM" / "1:07 PM" via the browser locale
 *
 * Returns an empty string for null / invalid dates so callers can render nothing.
 */
export function formatLocalizedTime(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return '';

  const lang = getLanguage();
  if (lang === 'ar') {
    const hours24 = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const isAM = hours24 < 12;
    const displayHour = hours24 % 12 === 0 ? 12 : hours24 % 12;
    // "3:56 ص" — when rendered with an RTL writing direction, the marker
    // visually lands to the LEFT of the digits (proper Arabic typography).
    return `${displayHour}:${mins} ${isAM ? 'ص' : 'م'}`;
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
