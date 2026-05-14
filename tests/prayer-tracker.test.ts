import { describe, expect, it } from 'vitest';

import {
  calculateCompletedRakats,
  calculateRakat,
  isPrayerCompleted,
} from '../lib/prayer-tracker';

describe('prayer tracker rakat counting', () => {
  it('maps sujood pairs to the displayed current rakat', () => {
    expect(calculateRakat(0)).toBe(0);
    expect(calculateRakat(1)).toBe(1);
    expect(calculateRakat(2)).toBe(1);
    expect(calculateRakat(3)).toBe(2);
    expect(calculateRakat(4)).toBe(2);
    expect(calculateRakat(5)).toBe(3);
    expect(calculateRakat(6)).toBe(3);
    expect(calculateRakat(7)).toBe(4);
    expect(calculateRakat(8)).toBe(4);
  });

  it('does not complete the prayer until both sujood are counted for the final rakat', () => {
    expect(calculateCompletedRakats(7)).toBe(3);
    expect(isPrayerCompleted(7, 4)).toBe(false);
    expect(isPrayerCompleted(8, 4)).toBe(true);
  });
});
