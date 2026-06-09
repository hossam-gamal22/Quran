// lib/memorization-storage.ts
// تخزين وضع الحفظ في AsyncStorage (محمي بـ try/catch لكل JSON.parse)

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MemorizationPlan,
  AyahMemoryState,
  MemorizationSession,
  MemorizationStreak,
  MemorizationSettings,
  TestResult,
  TodayPlanSnapshot,
  ayahKey,
  ReviewOutcome,
} from '@/types/memorization';
import { computeNextReview, todayString } from './memorization-srs';

const K_PLANS = '@rooh_memorization_plans';
const K_ACTIVE_PLAN = '@rooh_memorization_active_plan';
const K_STATES = '@rooh_ayah_states';
const K_SESSIONS = '@rooh_memorization_sessions';
const K_TESTS = '@rooh_memorization_tests';
const K_SETTINGS = '@rooh_memorization_settings';
const K_STREAK = '@rooh_memorization_streak';
const K_ACHIEVEMENTS = '@rooh_memorization_achievements';
const K_TODAY = '@rooh_memorization_today';

export const DEFAULT_SETTINGS: MemorizationSettings = {
  showTashkeel: true,
  fontScale: 1.0,
  splitAyahSegments: true,
  defaultRepeatCount: 5,
  defaultGapMs: 3000,
  defaultSpeed: 1,
  highlightCurrent: true,
  nightMode: false,
};

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ===== Safe JSON helpers =====
async function safeReadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[memorization-storage] Failed to parse ${key}`, e);
    return fallback;
  }
}

async function safeWriteJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[memorization-storage] Failed to write ${key}`, e);
  }
}

// ===== PLANS =====
export async function getAllPlans(): Promise<MemorizationPlan[]> {
  return safeReadJSON<MemorizationPlan[]>(K_PLANS, []);
}

export async function getActivePlan(): Promise<MemorizationPlan | null> {
  const id = await AsyncStorage.getItem(K_ACTIVE_PLAN);
  if (!id) return null;
  const plans = await getAllPlans();
  return plans.find((p) => p.id === id) ?? null;
}

export async function setActivePlan(id: string | null): Promise<void> {
  if (id) await AsyncStorage.setItem(K_ACTIVE_PLAN, id);
  else await AsyncStorage.removeItem(K_ACTIVE_PLAN);
}

export async function createPlan(
  partial: Omit<MemorizationPlan, 'id' | 'createdAt' | 'isActive' | 'isCompleted' | 'startDate'> &
    Partial<Pick<MemorizationPlan, 'startDate'>>,
): Promise<MemorizationPlan> {
  const plan: MemorizationPlan = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    startDate: partial.startDate ?? todayString(),
    isActive: true,
    isCompleted: false,
    ...partial,
  };
  const all = await getAllPlans();
  // قم بإلغاء تنشيط الخطط السابقة
  const next = all.map((p) => ({ ...p, isActive: false })).concat(plan);
  await safeWriteJSON(K_PLANS, next);
  await setActivePlan(plan.id);
  return plan;
}

export async function deletePlan(id: string): Promise<void> {
  const all = await getAllPlans();
  const next = all.filter((p) => p.id !== id);
  await safeWriteJSON(K_PLANS, next);
  const active = await getActivePlan();
  if (active?.id === id) {
    await setActivePlan(next[0]?.id ?? null);
  }
}

export async function updatePlan(
  id: string,
  patch: Partial<MemorizationPlan>,
): Promise<MemorizationPlan | null> {
  const all = await getAllPlans();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...patch };
  all[idx] = updated;
  await safeWriteJSON(K_PLANS, all);
  return updated;
}

// ===== AYAH STATES =====
export async function getAllAyahStates(): Promise<Record<string, AyahMemoryState>> {
  return safeReadJSON<Record<string, AyahMemoryState>>(K_STATES, {});
}

export async function getAyahState(
  surah: number,
  ayah: number,
): Promise<AyahMemoryState | null> {
  const map = await getAllAyahStates();
  return map[ayahKey(surah, ayah)] ?? null;
}

async function persistAyahStates(map: Record<string, AyahMemoryState>): Promise<void> {
  await safeWriteJSON(K_STATES, map);
}

// Serialize ayah-state read-modify-write operations so two near-simultaneous
// marks can't clobber each other (last-write-wins drop). Each op runs only
// after the previous one settles.
let statesWriteLock: Promise<unknown> = Promise.resolve();
function withStatesLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = statesWriteLock.then(fn, fn);
  statesWriteLock = run.catch(() => {});
  return run;
}

function blankState(surah: number, ayah: number): AyahMemoryState {
  const today = todayString();
  return {
    surahNumber: surah,
    ayahNumber: ayah,
    status: 'new',
    intervalStage: 0,
    repeatCount: 0,
    lastReviewDate: null,
    nextReviewDate: today,
    confidenceScore: 0,
    failures: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function ensureAyahState(
  surah: number,
  ayah: number,
): Promise<AyahMemoryState> {
  return withStatesLock(async () => {
    const map = await getAllAyahStates();
    const k = ayahKey(surah, ayah);
    if (!map[k]) {
      map[k] = blankState(surah, ayah);
      await persistAyahStates(map);
    }
    return map[k];
  });
}

export async function markAyah(
  surah: number,
  ayah: number,
  outcome: boolean | ReviewOutcome,
): Promise<AyahMemoryState> {
  return withStatesLock(async () => {
    const map = await getAllAyahStates();
    const k = ayahKey(surah, ayah);
    const cur = map[k] ?? blankState(surah, ayah);
    const srs = computeNextReview(cur, outcome);
    const today = todayString();
    const next: AyahMemoryState = {
      ...cur,
      ...srs,
      lastReviewDate: today,
      updatedAt: new Date().toISOString(),
    };
    map[k] = next;
    await persistAyahStates(map);
    return next;
  });
}

export async function markAyahPartial(
  surah: number,
  ayah: number,
): Promise<AyahMemoryState> {
  return markAyah(surah, ayah, 'partial');
}

export async function bulkUpsertAyahStates(
  ayahs: { surahNumber: number; ayahNumber: number }[],
): Promise<void> {
  return withStatesLock(async () => {
    const map = await getAllAyahStates();
    let changed = false;
    for (const a of ayahs) {
      const k = ayahKey(a.surahNumber, a.ayahNumber);
      if (!map[k]) {
        map[k] = blankState(a.surahNumber, a.ayahNumber);
        changed = true;
      }
    }
    if (changed) await persistAyahStates(map);
  });
}

export async function resetAyahState(surah: number, ayah: number): Promise<void> {
  return withStatesLock(async () => {
    const map = await getAllAyahStates();
    delete map[ayahKey(surah, ayah)];
    await persistAyahStates(map);
  });
}

// ===== SESSIONS =====
export async function getSessions(): Promise<MemorizationSession[]> {
  return safeReadJSON<MemorizationSession[]>(K_SESSIONS, []);
}

export async function startSession(
  mode: MemorizationSession['mode'],
): Promise<MemorizationSession> {
  const session: MemorizationSession = {
    id: generateId(),
    date: todayString(),
    mode,
    ayahsLearned: [],
    ayahsReviewed: [],
    durationMin: 0,
    startedAt: new Date().toISOString(),
    endedAt: null,
  };
  const all = await getSessions();
  all.push(session);
  await safeWriteJSON(K_SESSIONS, all);
  return session;
}

export async function endSession(
  id: string,
  patch: Partial<Pick<MemorizationSession, 'ayahsLearned' | 'ayahsReviewed' | 'durationMin'>>,
): Promise<void> {
  const all = await getSessions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    ...patch,
    endedAt: new Date().toISOString(),
  };
  await safeWriteJSON(K_SESSIONS, all);
}

export async function getSessionsInRange(
  fromDate: string,
  toDate: string,
): Promise<MemorizationSession[]> {
  const all = await getSessions();
  return all.filter((s) => s.date >= fromDate && s.date <= toDate);
}

// ===== TEST RESULTS =====
export async function getTestResults(): Promise<TestResult[]> {
  return safeReadJSON<TestResult[]>(K_TESTS, []);
}

export async function recordTestResult(r: TestResult): Promise<void> {
  const all = await getTestResults();
  all.push(r);
  // اقطع للأحدث 1000 نتيجة
  const trimmed = all.slice(-1000);
  await safeWriteJSON(K_TESTS, trimmed);
}

// ===== SETTINGS =====
export async function getMemorizationSettings(): Promise<MemorizationSettings> {
  const stored = await safeReadJSON<Partial<MemorizationSettings>>(K_SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateMemorizationSettings(
  patch: Partial<MemorizationSettings>,
): Promise<MemorizationSettings> {
  const cur = await getMemorizationSettings();
  const next = { ...cur, ...patch };
  await safeWriteJSON(K_SETTINGS, next);
  return next;
}

// ===== STREAK =====
const DEFAULT_STREAK: MemorizationStreak = { current: 0, best: 0, lastActivityDate: null };

export async function getStreak(): Promise<MemorizationStreak> {
  return safeReadJSON<MemorizationStreak>(K_STREAK, DEFAULT_STREAK);
}

export async function bumpStreak(): Promise<MemorizationStreak> {
  const today = todayString();
  const streak = await getStreak();
  if (streak.lastActivityDate === today) return streak;

  let current = 1;
  if (streak.lastActivityDate) {
    const last = new Date(streak.lastActivityDate + 'T00:00:00');
    const t = new Date(today + 'T00:00:00');
    const diffDays = Math.round((t.getTime() - last.getTime()) / 86_400_000);
    if (diffDays === 1) current = streak.current + 1;
    else if (diffDays === 0) current = streak.current;
    else current = 1;
  }
  const best = Math.max(streak.best, current);
  const next: MemorizationStreak = { current, best, lastActivityDate: today };
  await safeWriteJSON(K_STREAK, next);
  return next;
}

// ===== TODAY PLAN SNAPSHOT =====
// Stable per-day ward assignment so the daily ward does not refill as ayahs
// are marked. Recomputed only when the date or active plan changes.
export async function getTodaySnapshot(): Promise<TodayPlanSnapshot | null> {
  return safeReadJSON<TodayPlanSnapshot | null>(K_TODAY, null);
}

export async function saveTodaySnapshot(snapshot: TodayPlanSnapshot): Promise<void> {
  await safeWriteJSON(K_TODAY, snapshot);
}

export async function clearTodaySnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(K_TODAY);
  } catch {}
}

// ===== ACHIEVEMENTS =====
export async function getUnlockedAchievements(): Promise<string[]> {
  return safeReadJSON<string[]>(K_ACHIEVEMENTS, []);
}

export async function unlockAchievement(id: string): Promise<boolean> {
  const all = await getUnlockedAchievements();
  if (all.includes(id)) return false;
  all.push(id);
  await safeWriteJSON(K_ACHIEVEMENTS, all);
  return true;
}

// ===== UTILITIES =====
export async function clearAllMemorizationData(): Promise<void> {
  await Promise.all(
    [K_PLANS, K_ACTIVE_PLAN, K_STATES, K_SESSIONS, K_TESTS, K_SETTINGS, K_STREAK, K_ACHIEVEMENTS, K_TODAY].map(
      (k) => AsyncStorage.removeItem(k),
    ),
  );
}
