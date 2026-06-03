import type { WidgetDateFormat } from '@/components/widgets/previews/shared';

export type WidgetCalendarPreference = 'auto' | 'gregorian' | 'hijri';

const AUTO_DATE_FORMATS: WidgetDateFormat[] = [
  'none',
  'gregorian-ar',
  'hijri-ar',
  'gregorian-en',
  'hijri-en',
];

const GREGORIAN_DATE_FORMATS: WidgetDateFormat[] = [
  'none',
  'gregorian-ar',
  'gregorian-en',
];

const HIJRI_DATE_FORMATS: WidgetDateFormat[] = [
  'none',
  'hijri-ar',
  'hijri-en',
];

export function normalizeWidgetCalendarPreference(
  calendar: string | undefined | null,
): WidgetCalendarPreference {
  if (calendar === 'gregorian' || calendar === 'hijri') return calendar;
  return 'auto';
}

export function widgetDateFormatOptionsForCalendar(
  calendar: string | undefined | null,
): WidgetDateFormat[] {
  const normalized = normalizeWidgetCalendarPreference(calendar);
  if (normalized === 'gregorian') return GREGORIAN_DATE_FORMATS;
  if (normalized === 'hijri') return HIJRI_DATE_FORMATS;
  return AUTO_DATE_FORMATS;
}

export function coerceWidgetDateFormatForCalendar(
  calendar: string | undefined | null,
  dateFormat: string | undefined | null,
): WidgetDateFormat {
  const normalized = normalizeWidgetCalendarPreference(calendar);
  const current = (dateFormat ?? 'gregorian-ar') as WidgetDateFormat;
  const allowed = widgetDateFormatOptionsForCalendar(normalized);
  if (allowed.includes(current)) return current;

  if (current === 'hijri-en') return 'gregorian-en';
  if (current === 'hijri-ar') return 'gregorian-ar';
  if (current === 'gregorian-en') return 'hijri-en';
  if (current === 'gregorian-ar') return 'hijri-ar';

  return normalized === 'hijri' ? 'hijri-ar' : 'gregorian-ar';
}
