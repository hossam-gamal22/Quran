import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AyahMemoryState, MemorizationPlan } from '../types/memorization';
import {
  addDays,
  computeNextReview,
  getDueAyahs,
  todayString,
} from '../lib/memorization-srs';
import {
  enumeratePlanAyahsFull,
  formatAyahMarker,
  formatAyahRangeLabel,
  getAyahText,
  getSurahName,
  toArabicDigits,
} from '../lib/memorization-helpers';
import { mt } from '../lib/memorization-i18n';
import { getPresetById } from '../lib/memorization-presets';
import { setLanguage } from '../lib/i18n';
import {
  buildCompleteAyah,
  buildNextAyah,
  pickHiddenIndices,
} from '../lib/memorization-test-builders';
import {
  bulkUpsertAyahStates,
  clearAllMemorizationData,
  createPlan,
  deletePlan,
  getActivePlan,
  getAllAyahStates,
  getAllPlans,
  markAyah,
  markAyahPartial,
} from '../lib/memorization-storage';
import { computeTodayPlan } from '../lib/memorization-today-plan';

const planBase = (patch: Partial<MemorizationPlan> = {}): MemorizationPlan => ({
  id: 'plan-1',
  name: 'Test Plan',
  scope: 'surah',
  surahNumbers: [67],
  dailyTarget: 3,
  level: 'beginner',
  method: 'ayah_by_ayah',
  reciterId: 'mishary_alafasy',
  startDate: '2026-05-07',
  reminderTime: null,
  reminderEnabled: false,
  createdAt: '2026-05-07T00:00:00.000Z',
  isActive: true,
  isCompleted: false,
  ...patch,
});

const state = (
  surahNumber: number,
  ayahNumber: number,
  patch: Partial<AyahMemoryState> = {},
): AyahMemoryState => ({
  surahNumber,
  ayahNumber,
  status: 'new',
  intervalStage: 0,
  repeatCount: 0,
  lastReviewDate: null,
  nextReviewDate: '2026-05-07',
  confidenceScore: 0,
  failures: 0,
  createdAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
  ...patch,
});

beforeEach(async () => {
  await (AsyncStorage as any).clear?.();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 7, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('memorization SRS', () => {
  it('uses local calendar dates for today and date addition', () => {
    vi.setSystemTime(new Date(2026, 4, 7, 23, 30, 0));

    expect(todayString()).toBe('2026-05-07');
    expect(addDays('2026-05-07', 1)).toBe('2026-05-08');
  });

  it('handles passed, failed, and partial outcomes without over-promoting partial', () => {
    const current = {
      intervalStage: 2,
      repeatCount: 4,
      confidenceScore: 50,
      failures: 1,
      status: 'memorized' as const,
    };

    expect(computeNextReview(current, 'passed', '2026-05-07')).toMatchObject({
      intervalStage: 3,
      nextReviewDate: '2026-05-14',
      status: 'memorized',
      confidenceScore: 65,
      repeatCount: 5,
      failures: 1,
    });
    expect(computeNextReview(current, 'partial', '2026-05-07')).toMatchObject({
      intervalStage: 2,
      nextReviewDate: '2026-05-10',
      status: 'memorized',
      confidenceScore: 55,
      repeatCount: 5,
      failures: 1,
    });
    expect(computeNextReview(current, 'failed', '2026-05-07')).toMatchObject({
      intervalStage: 1,
      nextReviewDate: '2026-05-08',
      status: 'needs_review',
      confidenceScore: 30,
      repeatCount: 5,
      failures: 2,
    });
  });

  it('does not return new ayahs as due reviews and prioritizes weak due ayahs', () => {
    const due = getDueAyahs({
      '67:1': state(67, 1, { status: 'new', failures: 99 }),
      '67:2': state(67, 2, { status: 'learning', failures: 1 }),
      '67:3': state(67, 3, { status: 'needs_review', failures: 3 }),
      '67:4': state(67, 4, {
        status: 'memorized',
        failures: 10,
        nextReviewDate: '2026-05-08',
      }),
    });

    expect(due.map((ayah) => `${ayah.surahNumber}:${ayah.ayahNumber}`)).toEqual([
      '67:3',
      '67:2',
    ]);
  });
});

describe('memorization helpers and question builders', () => {
  it('renders memorization numbers with Latin digits', async () => {
    await setLanguage('ar');

    expect(toArabicDigits(123)).toBe('123');
    expect(toArabicDigits('١٢٣')).toBe('123');
    expect(mt('estimatedMinutes', { m: 10 })).toBe('10 دقيقة تقريبًا');
  });

  it('renders ayah references with Arabic-Indic digits', () => {
    expect(formatAyahMarker(12)).toContain('١٢');
    expect(formatAyahRangeLabel(67, 1, 5)).toContain('١');
    expect(formatAyahRangeLabel(67, 1, 5)).toContain('٥');
  });

  it('expands preset, surah, range, and juz plans using local Quran data', () => {
    const juzAmma = getPresetById('juzAmma');
    const last10 = getPresetById('last10');

    expect(enumeratePlanAyahsFull(planBase({
      scope: 'preset',
      presetId: 'juzAmma',
      surahNumbers: juzAmma?.surahNumbers,
    })).length).toBe(564);
    expect(last10?.totalAyahs).toBe(48);
    expect(enumeratePlanAyahsFull(planBase({
      scope: 'preset',
      presetId: 'last10',
      surahNumbers: last10?.surahNumbers,
    })).length).toBe(48);
    expect(enumeratePlanAyahsFull(planBase({ scope: 'surah', surahNumbers: [67] })).length).toBe(30);
    expect(enumeratePlanAyahsFull(planBase({
      scope: 'range',
      ayahRange: { surahNumber: 67, fromAyah: 1, toAyah: 5 },
    })).length).toBe(5);
    expect(enumeratePlanAyahsFull(planBase({ scope: 'juz', juzNumbers: [30] })).length).toBe(564);
  });

  it('strips leading basmala from non-Fatiha first ayahs used in memorization modes', () => {
    expect(getSurahName(67)).toContain('المُلۡك');
    expect(getAyahText(67, 1)).not.toContain('بِسْمِ');
    expect(getAyahText(1, 1)).toContain('بِسْمِ');
  });

  it('builds stable tests and handles last-ayah next-question fallback', () => {
    const plan = planBase({
      scope: 'range',
      ayahRange: { surahNumber: 67, fromAyah: 1, toAyah: 5 },
    });
    const distractors = enumeratePlanAyahsFull(plan).slice(1, 5);
    const complete = buildCompleteAyah(67, 1, distractors);

    expect(complete.options[complete.correctIndex]).toBe(complete.correctSuffix);
    expect(buildNextAyah(112, 4, distractors)).toBeNull();
    expect(Array.from(pickHiddenIndices(67, 1, 2, 10))).toEqual(
      Array.from(pickHiddenIndices(67, 1, 2, 10)),
    );
  });
});

describe('memorization storage and today plan', () => {
  it('creates, activates, registers, marks, partially reviews, and deletes plans', async () => {
    const created = await createPlan({
      name: 'Surah Al-Mulk',
      scope: 'surah',
      surahNumbers: [67],
      dailyTarget: 3,
      level: 'beginner',
      method: 'ayah_by_ayah',
      reciterId: 'mishary_alafasy',
      reminderTime: null,
      reminderEnabled: false,
    });

    expect((await getActivePlan())?.id).toBe(created.id);
    await bulkUpsertAyahStates([
      { surahNumber: 67, ayahNumber: 1 },
      { surahNumber: 67, ayahNumber: 2 },
    ]);
    expect(Object.keys(await getAllAyahStates()).sort()).toEqual(['67:1', '67:2']);

    const passed = await markAyah(67, 1, true);
    expect(passed).toMatchObject({ status: 'learning', intervalStage: 1 });
    const partial = await markAyahPartial(67, 1);
    expect(partial).toMatchObject({ status: 'learning', intervalStage: 1 });
    const failed = await markAyah(67, 1, false);
    expect(failed).toMatchObject({ status: 'needs_review', intervalStage: 0, failures: 1 });

    await deletePlan(created.id);
    expect(await getAllPlans()).toEqual([]);
    expect(await getActivePlan()).toBeNull();
  });

  it('calculates today plan from the active plan only and keeps new ayahs out of review', () => {
    const plan = planBase({ dailyTarget: 2 });
    const todayPlan = computeTodayPlan(plan, {
      '67:1': state(67, 1, { status: 'new', failures: 99 }),
      '67:2': state(67, 2, { status: 'learning', failures: 1 }),
      '1:1': state(1, 1, { status: 'needs_review', failures: 10 }),
    }, '2026-05-07');

    expect(todayPlan.reviewAyahs).toEqual([{ surahNumber: 67, ayahNumber: 2 }]);
    expect(todayPlan.newAyahs).toEqual([
      { surahNumber: 67, ayahNumber: 1 },
      { surahNumber: 67, ayahNumber: 3 },
    ]);
    expect(todayPlan.estimatedMinutes).toBe(7);
  });

  it('returns an empty today plan when there is no active plan', async () => {
    await clearAllMemorizationData();
    expect(computeTodayPlan(null, {}, '2026-05-07')).toEqual({
      date: '2026-05-07',
      newAyahs: [],
      reviewAyahs: [],
      assignedNewCount: 0,
      assignedReviewCount: 0,
      estimatedMinutes: 0,
    });
  });
});
