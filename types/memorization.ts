// types/memorization.ts
// نماذج بيانات وضع الحفظ — روح المسلم

export type MemorizationLevel = 'beginner' | 'intermediate' | 'reviewer';

export type MemorizationMethod =
  | 'ayah_by_ayah'
  | 'group_3'
  | 'page'
  | 'semantic';

export type MemorizationScope =
  | 'surah'
  | 'juz'
  | 'range'
  | 'preset';

export type AyahStatus =
  | 'new'
  | 'learning'
  | 'memorized'
  | 'needs_review'
  | 'mastered';

export type MemorizationMode = 'learn' | 'hide' | 'test' | 'review';
export type ReviewOutcome = 'passed' | 'partial' | 'failed';

export type TestType =
  | 'complete_ayah'
  | 'reorder_words'
  | 'next_ayah'
  | 'voice';

export interface AyahRange {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

export interface MemorizationPlan {
  id: string;
  name: string;
  scope: MemorizationScope;
  // For scope='surah': list of surah numbers; for 'juz': list of juz numbers; for 'range': single range; for 'preset': preset id.
  surahNumbers?: number[];
  juzNumbers?: number[];
  ayahRange?: AyahRange;
  presetId?: string;
  dailyTarget: number; // عدد الآيات الجديدة في اليوم
  level: MemorizationLevel;
  method: MemorizationMethod;
  reciterId: string;
  startDate: string; // ISO date
  reminderTime: string | null; // HH:mm
  reminderEnabled: boolean;
  createdAt: string;
  isActive: boolean;
  isCompleted: boolean;
}

export interface AyahMemoryState {
  surahNumber: number;
  ayahNumber: number;
  status: AyahStatus;
  intervalStage: number; // 0..5 — index into SRS_INTERVALS
  repeatCount: number;
  lastReviewDate: string | null; // YYYY-MM-DD
  nextReviewDate: string; // YYYY-MM-DD
  confidenceScore: number; // 0..100
  failures: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemorizationSession {
  id: string;
  date: string; // YYYY-MM-DD
  mode: MemorizationMode;
  ayahsLearned: string[]; // keys "surah:ayah"
  ayahsReviewed: string[];
  durationMin: number;
  startedAt: string;
  endedAt: string | null;
}

export interface TestResult {
  sessionId: string;
  ayahKey: string; // "surah:ayah"
  type: TestType;
  passed: boolean;
  attemptedAt: string;
}

export interface MemorizationStreak {
  current: number;
  best: number;
  lastActivityDate: string | null; // YYYY-MM-DD
}

export interface MemorizationSettings {
  showTashkeel: boolean;
  fontScale: number; // 0.85 .. 1.4
  splitAyahSegments: boolean;
  defaultRepeatCount: number; // 3,5,7,10
  defaultGapMs: number; // 1000,3000,5000
  defaultSpeed: number; // 0.75,1,1.25
  highlightCurrent: boolean;
  nightMode: boolean;
}

export interface AyahRef {
  surahNumber: number;
  ayahNumber: number;
}

/**
 * Persisted snapshot of the day's assigned ward. Captured once per (date, plan)
 * so the daily ward stays stable across the day instead of refilling as ayahs
 * are marked. Lives in AsyncStorage under @rooh_memorization_today.
 */
export interface TodayPlanSnapshot {
  date: string; // YYYY-MM-DD
  planId: string;
  assignedNew: AyahRef[];
  assignedReview: AyahRef[];
}

export interface TodayPlan {
  date: string;
  // Remaining (not-yet-completed) items for today — drive the rings + session start.
  newAyahs: AyahRef[];
  reviewAyahs: AyahRef[];
  // Original assigned counts for today — stable ring denominators.
  assignedNewCount: number;
  assignedReviewCount: number;
  estimatedMinutes: number;
}

export interface MemorizationStats {
  totalMemorized: number;
  totalSurahsCompleted: number;
  weakAyahs: { surahNumber: number; ayahNumber: number; failures: number }[];
  perSurahProgress: Record<number, { memorized: number; total: number }>;
  lastReviewDate: string | null;
}

export type AyahKey = string; // "surahNumber:ayahNumber"

export const ayahKey = (s: number, a: number): AyahKey => `${s}:${a}`;
export const parseAyahKey = (k: AyahKey): { surahNumber: number; ayahNumber: number } => {
  const [s, a] = k.split(':').map(Number);
  return { surahNumber: s, ayahNumber: a };
};
