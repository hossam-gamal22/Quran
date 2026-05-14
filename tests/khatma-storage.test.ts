import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  KHATMA_DURATIONS,
  clearAllKhatmas,
  completeTodayWird,
  createKhatma,
  getKhatma,
  getKhatmaStats,
  getTodayWird,
  recordDailyProgress,
  recordPageRead,
} from '../lib/khatma-storage';

beforeEach(async () => {
  await (AsyncStorage as any).clear?.();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-07T12:00:00.000Z'));
});

afterEach(async () => {
  await clearAllKhatmas();
  vi.useRealTimers();
});

describe('khatma storage', () => {
  it('completes only the remaining pages of today wird', async () => {
    const khatma = await createKhatma('Ramadan khatma', KHATMA_DURATIONS[2]);
    expect(khatma).not.toBeNull();

    await recordDailyProgress(khatma!.id, 5);
    const partiallyRead = await getKhatma(khatma!.id);
    expect(partiallyRead?.dailyProgress[0]).toMatchObject({
      pagesRead: 5,
      completed: false,
    });
    expect(getTodayWird(partiallyRead!)).toMatchObject({
      startPage: 6,
      endPage: 21,
      pagesRemaining: 16,
      pageNumbers: Array.from({ length: 16 }, (_, index) => index + 6),
      isCompleted: false,
    });

    await completeTodayWird(khatma!.id);
    const completedToday = await getKhatma(khatma!.id);
    expect(completedToday?.readPages).toHaveLength(21);
    expect(completedToday?.currentPage).toBe(22);
    expect(completedToday?.dailyProgress[0]).toMatchObject({
      pagesRead: 21,
      completed: true,
    });

    await completeTodayWird(khatma!.id);
    const completedAgain = await getKhatma(khatma!.id);
    expect(completedAgain?.readPages).toHaveLength(21);
    expect(completedAgain?.dailyProgress[0].pagesRead).toBe(21);
  });

  it('tracks specific pages without duplicates and keeps the next page as the first unread page', async () => {
    const khatma = await createKhatma('Non contiguous read', KHATMA_DURATIONS[2]);
    expect(khatma).not.toBeNull();

    await recordPageRead(khatma!.id, [10, 1, 10, 605, 0]);
    const updated = await getKhatma(khatma!.id);

    expect(updated?.readPages).toEqual([1, 10]);
    expect(updated?.currentPage).toBe(2);
    expect(getTodayWird(updated!)).toMatchObject({
      startPage: 2,
      pagesRemaining: 19,
      pageNumbers: [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    });
  });

  it('caps the final wird at the remaining Quran pages', async () => {
    const khatma = await createKhatma('Final pages', KHATMA_DURATIONS[0]);
    expect(khatma).not.toBeNull();

    await recordPageRead(
      khatma!.id,
      Array.from({ length: 600 }, (_, index) => index + 1),
    );
    vi.setSystemTime(new Date('2026-05-08T12:00:00.000Z'));
    const nearEnd = await getKhatma(khatma!.id);

    expect(getTodayWird(nearEnd!)).toMatchObject({
      startPage: 601,
      endPage: 604,
      pagesRemaining: 4,
      pageNumbers: [601, 602, 603, 604],
    });

    await completeTodayWird(khatma!.id);
    const completed = await getKhatma(khatma!.id);
    expect(completed?.isCompleted).toBe(true);
    expect(getKhatmaStats(completed!).progressPercentage).toBe(100);
  });
});
