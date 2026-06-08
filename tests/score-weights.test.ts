import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, normalizeWeights, computeScore } from '../functions/src/score-weights';

describe('server score-weights (recompute on weights change)', () => {
  it('defaults tasbih to 0.5 and floors the total', () => {
    expect(DEFAULT_WEIGHTS.tasbih).toBe(0.5);
    expect(computeScore({ tasbih: 19687, prayer: 2, quran: 57 })).toBe(9843 + 10 + 171);
    expect(computeScore({ tasbih: 7 })).toBe(3); // 3.5 → 3
  });

  it('normalizeWeights merges over defaults and applies the khatma 5→100 rule', () => {
    expect(normalizeWeights({}).khatma).toBe(100);
    expect(normalizeWeights({ khatma: 5 }).khatma).toBe(100);
    expect(normalizeWeights({ khatma: 250 }).khatma).toBe(250);
    expect(normalizeWeights({ tasbih: 0.5, prayer: 7 })).toMatchObject({ tasbih: 0.5, prayer: 7 });
  });

  it('mirrors the app: matches calculateMonthlyScore semantics with admin weights', () => {
    const w = normalizeWeights({ tasbih: 0.5, prayer: 5, quran: 3 });
    // ماجدة: tasbih 8255*0.5=4127.5→4127 + prayer 30*5=150 + quran 1*3=3 = 4280
    expect(computeScore({ tasbih: 8255, prayer: 30, quran: 1 }, w)).toBe(4280);
  });

  it('unknown activity keys default to weight 1', () => {
    expect(computeScore({ mystery: 4 })).toBe(4);
  });
});
