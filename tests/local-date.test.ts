import { describe, expect, it } from 'vitest';

import { localDateKey, msUntilNextLocalDay } from '@/lib/local-date';

describe('local date helpers', () => {
  it('formats the date key from the local calendar day', () => {
    expect(localDateKey(new Date(2026, 4, 27, 0, 5, 0))).toBe('2026-05-27');
  });

  it('computes the delay to just after the next local midnight', () => {
    expect(msUntilNextLocalDay(new Date(2026, 4, 26, 23, 59, 30, 500))).toBe(30_500);
  });
});
