import { describe, expect, test } from 'vitest';

import {
  coerceWidgetDateFormatForCalendar,
  widgetDateFormatOptionsForCalendar,
} from '@/lib/widget-settings-options';

describe('widget settings date-format options', () => {
  test('shows only Gregorian date formats when the widget calendar is Gregorian', () => {
    expect(widgetDateFormatOptionsForCalendar('gregorian')).toEqual([
      'none',
      'gregorian-ar',
      'gregorian-en',
    ]);
  });

  test('shows only Hijri date formats when the widget calendar is Hijri', () => {
    expect(widgetDateFormatOptionsForCalendar('hijri')).toEqual([
      'none',
      'hijri-ar',
      'hijri-en',
    ]);
  });

  test('keeps auto calendar broad and coerces hidden formats when calendar becomes fixed', () => {
    expect(widgetDateFormatOptionsForCalendar('auto')).toEqual([
      'none',
      'gregorian-ar',
      'hijri-ar',
      'gregorian-en',
      'hijri-en',
    ]);
    expect(coerceWidgetDateFormatForCalendar('gregorian', 'hijri-ar')).toBe('gregorian-ar');
    expect(coerceWidgetDateFormatForCalendar('gregorian', 'hijri-en')).toBe('gregorian-en');
    expect(coerceWidgetDateFormatForCalendar('hijri', 'gregorian-ar')).toBe('hijri-ar');
    expect(coerceWidgetDateFormatForCalendar('hijri', 'gregorian-en')).toBe('hijri-en');
  });
});
