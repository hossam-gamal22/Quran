import { describe, expect, it } from 'vitest';

import {
  didReachTasbihTarget,
  getPointBearingTasbihAmount,
  removeLowerTargetDuplicateTasbihat,
} from '../lib/tasbih-progress';

describe('tasbih progress helpers', () => {
  it('counts only the remaining target amount before the first daily completion', () => {
    expect(getPointBearingTasbihAmount({
      amount: 1,
      currentCount: 32,
      target: 33,
      completedToday: false,
    })).toBe(1);

    expect(getPointBearingTasbihAmount({
      amount: 10,
      currentCount: 30,
      target: 33,
      completedToday: false,
    })).toBe(3);
  });

  it('does not count repeated tasbih after the daily target was completed', () => {
    expect(getPointBearingTasbihAmount({
      amount: 100,
      currentCount: 0,
      target: 33,
      completedToday: true,
    })).toBe(0);
  });

  it('detects when an increment reaches the target', () => {
    expect(didReachTasbihTarget({ amount: 3, currentCount: 30, target: 33 })).toBe(true);
    expect(didReachTasbihTarget({ amount: 2, currentCount: 30, target: 33 })).toBe(false);
  });

  it('removes exact duplicate tasbih texts and keeps the higher target', () => {
    expect(removeLowerTargetDuplicateTasbihat([
      { id: 1, text: 'سبحان الله', target: 33 },
      { id: 2, text: 'الحمد لله', target: 33 },
      { id: 3, text: 'سبحان الله', target: 100 },
    ])).toEqual([
      { id: 3, text: 'سبحان الله', target: 100 },
      { id: 2, text: 'الحمد لله', target: 33 },
    ]);
  });
});
