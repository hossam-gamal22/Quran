// lib/memorization-test-builders.ts
// أدوات بناء أسئلة الاختبارات (تكميل آية / ترتيب كلمات / الآية التالية).
// لا توجد عشوائية حقيقية — نستخدم seed=ayahKey لضمان نفس السؤال للآية نفسها بنفس اليوم.

import {
  enumeratePlanAyahsFull,
  getAyahCount,
  getAyahText,
  getSurahName,
  stripTashkeel,
} from './memorization-helpers';
import type { MemorizationPlan } from '@/types/memorization';

// =====================
// Seeded RNG (mulberry32)
// =====================

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// =====================
// Question builders
// =====================

export interface CompleteAyahQuestion {
  type: 'complete_ayah';
  surahNumber: number;
  ayahNumber: number;
  prefix: string; // visible part
  correctSuffix: string; // hidden tail
  options: string[]; // 4 choices including correct
  correctIndex: number;
}

export interface ReorderWordsQuestion {
  type: 'reorder_words';
  surahNumber: number;
  ayahNumber: number;
  scrambledWords: string[];
  correctOrder: string[];
}

export interface NextAyahQuestion {
  type: 'next_ayah';
  surahNumber: number;
  ayahNumber: number;
  promptText: string; // current ayah
  options: string[]; // 4 candidate next ayahs
  correctIndex: number;
}

export type TestQuestion =
  | CompleteAyahQuestion
  | ReorderWordsQuestion
  | NextAyahQuestion;

/** Build a "complete the ayah" question — hides last 1-3 words and shows 4 options. */
export function buildCompleteAyah(
  surah: number,
  ayah: number,
  distractorAyahs: { surahNumber: number; ayahNumber: number }[],
): CompleteAyahQuestion {
  const text = stripTashkeel(getAyahText(surah, ayah));
  const words = text.split(/\s+/).filter(Boolean);
  const cutCount = Math.min(3, Math.max(1, Math.floor(words.length / 4)));
  const prefix = words.slice(0, words.length - cutCount).join(' ');
  const correctSuffix = words.slice(words.length - cutCount).join(' ');

  const distractorSuffixes = distractorAyahs
    .map((a) => {
      const t = stripTashkeel(getAyahText(a.surahNumber, a.ayahNumber)).split(/\s+/);
      const cnt = Math.min(cutCount, Math.max(1, t.length));
      return t.slice(t.length - cnt).join(' ');
    })
    .filter((s) => s && s !== correctSuffix);

  // ensure 3 unique distractors
  const uniq = Array.from(new Set(distractorSuffixes)).slice(0, 3);
  while (uniq.length < 3) uniq.push(`— ${uniq.length + 1} —`);

  const seed = `complete-${surah}-${ayah}`;
  const options = seededShuffle([correctSuffix, ...uniq], seed);
  return {
    type: 'complete_ayah',
    surahNumber: surah,
    ayahNumber: ayah,
    prefix,
    correctSuffix,
    options,
    correctIndex: options.indexOf(correctSuffix),
  };
}

/** Build a "reorder words" question — scrambles the words of the ayah. */
export function buildReorderWords(
  surah: number,
  ayah: number,
): ReorderWordsQuestion {
  const text = stripTashkeel(getAyahText(surah, ayah));
  const words = text.split(/\s+/).filter(Boolean);
  // For very long ayahs, pick first 8 words to keep UX manageable.
  const slice = words.length > 8 ? words.slice(0, 8) : words;
  const seed = `reorder-${surah}-${ayah}`;
  const scrambled = seededShuffle(slice, seed);
  return {
    type: 'reorder_words',
    surahNumber: surah,
    ayahNumber: ayah,
    scrambledWords: scrambled,
    correctOrder: slice,
  };
}

/** Build a "next ayah" question — shows current ayah, asks which is the next one. */
export function buildNextAyah(
  surah: number,
  ayah: number,
  distractorAyahs: { surahNumber: number; ayahNumber: number }[],
): NextAyahQuestion | null {
  const ayahCount = getAyahCount(surah);
  if (ayah >= ayahCount) return null;
  const correctNextText = stripTashkeel(getAyahText(surah, ayah + 1));
  if (!correctNextText) return null;

  const distractorTexts = distractorAyahs
    .map((a) => stripTashkeel(getAyahText(a.surahNumber, a.ayahNumber)))
    .filter((t) => t && t !== correctNextText);
  const uniq = Array.from(new Set(distractorTexts)).slice(0, 3);
  while (uniq.length < 3) uniq.push(`— ${uniq.length + 1} —`);

  const seed = `next-${surah}-${ayah}`;
  const options = seededShuffle([correctNextText, ...uniq], seed);
  return {
    type: 'next_ayah',
    surahNumber: surah,
    ayahNumber: ayah,
    promptText: stripTashkeel(getAyahText(surah, ayah)),
    options,
    correctIndex: options.indexOf(correctNextText),
  };
}

/** Pick distractor ayahs from the same plan, excluding the target. */
export function pickDistractors(
  plan: MemorizationPlan,
  excludeSurah: number,
  excludeAyah: number,
  count: number,
): { surahNumber: number; ayahNumber: number }[] {
  const all = enumeratePlanAyahsFull(plan).filter(
    (a) => !(a.surahNumber === excludeSurah && a.ayahNumber === excludeAyah),
  );
  if (all.length === 0) return [];
  const seed = `distractor-${excludeSurah}-${excludeAyah}`;
  return seededShuffle(all, seed).slice(0, count);
}

/** Build a quiz session of N questions cycling between the 3 types. */
export function buildQuiz(
  plan: MemorizationPlan,
  ayahs: { surahNumber: number; ayahNumber: number }[],
  count: number,
): TestQuestion[] {
  const out: TestQuestion[] = [];
  const seed = `quiz-${plan.id}-${Date.now() / 86400000 | 0}`; // changes daily
  const shuffled = seededShuffle(ayahs, seed);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const a = shuffled[i];
    const distractors = pickDistractors(plan, a.surahNumber, a.ayahNumber, 5);
    const type = i % 3;
    if (type === 0) {
      out.push(buildCompleteAyah(a.surahNumber, a.ayahNumber, distractors.slice(0, 3)));
    } else if (type === 1) {
      out.push(buildReorderWords(a.surahNumber, a.ayahNumber));
    } else {
      const q = buildNextAyah(a.surahNumber, a.ayahNumber, distractors.slice(0, 3));
      if (q) out.push(q);
      else out.push(buildCompleteAyah(a.surahNumber, a.ayahNumber, distractors.slice(0, 3)));
    }
  }
  return out;
}

/** For Hide mode: deterministically choose word indices to hide based on level. */
export function pickHiddenIndices(
  surah: number,
  ayah: number,
  level: 1 | 2 | 3 | 4,
  totalWords: number,
): Set<number> {
  // level 1: 25%, 2: 50%, 3: 75%, 4: 100%
  const ratios = { 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 } as const;
  // Always hide at least one word for any level >= 1, capped at totalWords.
  const target = Math.min(
    totalWords,
    Math.max(1, Math.round(totalWords * ratios[level])),
  );
  if (level === 4) {
    const all = new Set<number>();
    for (let i = 0; i < totalWords; i++) all.add(i);
    return all;
  }
  const indices = Array.from({ length: totalWords }, (_, i) => i);
  const seed = `hide-${surah}-${ayah}-${level}`;
  return new Set(seededShuffle(indices, seed).slice(0, target));
}
