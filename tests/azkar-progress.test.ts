import { describe, expect, it } from 'vitest';
import {
  areAzkarCountsCompleted,
  getAzkarCompletionPercentage,
  getAzkarCompletionRatio,
} from '../lib/azkar-progress';

describe('azkar progress helpers', () => {
  const items = [
    { id: 1, count: 3, arabic: 'ذكر أول' },
    { id: 2, count: 1, arabic: 'ذكر ثان' },
    { id: 3, count: 2, arabic: 'ذكر ثالث' },
  ];

  it('uses completed repeat counts instead of current page position', () => {
    const counts = { 1: 0, 2: 0, 3: 2 };

    expect(getAzkarCompletionRatio(items, counts)).toBeCloseTo(2 / 6);
    expect(getAzkarCompletionPercentage(items, counts)).toBe(33);
    expect(areAzkarCountsCompleted(items, counts)).toBe(false);
  });

  it('only reaches 100 percent when every required count is done', () => {
    expect(getAzkarCompletionPercentage(items, { 1: 3, 2: 1, 3: 1 })).toBe(83);
    expect(areAzkarCountsCompleted(items, { 1: 3, 2: 1, 3: 1 })).toBe(false);

    expect(getAzkarCompletionPercentage(items, { 1: 3, 2: 1, 3: 2 })).toBe(100);
    expect(areAzkarCountsCompleted(items, { 1: 3, 2: 1, 3: 2 })).toBe(true);
  });

  it('caps over-counted adhkar at their required repeat count', () => {
    expect(getAzkarCompletionRatio(items, { 1: 30, 2: 1, 3: 2 })).toBe(1);
    expect(getAzkarCompletionPercentage(items, { 1: 30, 2: 1, 3: 2 })).toBe(100);
  });
});
