// contexts/MemorizationContext.tsx
// مزود حالة وضع الحفظ — يكشف الخطة النشطة، حالات الآيات، وِرد اليوم، والإحصائيات.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  MemorizationPlan,
  AyahMemoryState,
  MemorizationSettings,
  MemorizationStreak,
  MemorizationStats,
  TodayPlan,
  ayahKey,
} from '@/types/memorization';
import {
  getActivePlan,
  getAllPlans,
  getAllAyahStates,
  getMemorizationSettings,
  getStreak,
  createPlan as createPlanStorage,
  setActivePlan as setActivePlanStorage,
  deletePlan as deletePlanStorage,
  updatePlan as updatePlanStorage,
  markAyah as markAyahStorage,
  markAyahPartial as markAyahPartialStorage,
  bulkUpsertAyahStates,
  updateMemorizationSettings,
  bumpStreak,
  ensureAyahState as ensureAyahStateStorage,
  DEFAULT_SETTINGS,
} from '@/lib/memorization-storage';
import { todayString } from '@/lib/memorization-srs';
import { getAyahCount } from '@/lib/memorization-helpers';
import { computeTodayPlan } from '@/lib/memorization-today-plan';

// ===== Helpers =====

/**
 * اختر الآيات الجديدة التالية من نطاق الخطة (الآيات اللي ما اتسجلت لها حالة بعد).
 */
function pickNextNewAyahs(
  plan: MemorizationPlan,
  states: Record<string, AyahMemoryState>,
  count: number,
): { surahNumber: number; ayahNumber: number }[] {
  const out: { surahNumber: number; ayahNumber: number }[] = [];
  const planAyahs = enumeratePlanAyahs(plan);
  for (const a of planAyahs) {
    if (out.length >= count) break;
    const k = ayahKey(a.surahNumber, a.ayahNumber);
    const st = states[k];
    if (!st || st.status === 'new') out.push(a);
  }
  return out;
}

/**
 * عَدّ كل آيات الخطة (لكل سورة في الخطة).
 * ملاحظة: لا نعرف عدد الآيات الفعلي لكل سورة هنا، فنرجّع surahNumbers فقط ويترك للـ caller التوسيع
 * عبر بيانات Quran. للحصول على دقة كاملة استدعِ enumerateWithCounts من Phase 2.
 */
export function enumeratePlanAyahs(
  plan: MemorizationPlan,
): { surahNumber: number; ayahNumber: number }[] {
  const out: { surahNumber: number; ayahNumber: number }[] = [];
  if (plan.scope === 'range' && plan.ayahRange) {
    for (let a = plan.ayahRange.fromAyah; a <= plan.ayahRange.toAyah; a += 1) {
      out.push({ surahNumber: plan.ayahRange.surahNumber, ayahNumber: a });
    }
  }
  // للأنواع الأخرى نتركها تُملأ من المُستهلك حسب بيانات القرآن الكاملة.
  return out;
}

/**
 * احسب إحصائيات سريعة من خريطة الحالات.
 */
function computeStats(
  states: Record<string, AyahMemoryState>,
): MemorizationStats {
  let totalMemorized = 0;
  const perSurah: Record<number, { memorized: number; total: number }> = {};
  const weak: { surahNumber: number; ayahNumber: number; failures: number }[] = [];
  let lastReviewDate: string | null = null;

  for (const k in states) {
    const s = states[k];
    if (!s) continue;
    perSurah[s.surahNumber] ??= {
      memorized: 0,
      total: getAyahCount(s.surahNumber) || 0,
    };
    if (s.status === 'memorized' || s.status === 'mastered') {
      totalMemorized += 1;
      perSurah[s.surahNumber].memorized += 1;
    }
    if (s.failures >= 2) {
      weak.push({
        surahNumber: s.surahNumber,
        ayahNumber: s.ayahNumber,
        failures: s.failures,
      });
    }
    if (s.lastReviewDate && (!lastReviewDate || s.lastReviewDate > lastReviewDate)) {
      lastReviewDate = s.lastReviewDate;
    }
  }
  weak.sort((a, b) => b.failures - a.failures);

  let totalSurahsCompleted = 0;
  for (const sk in perSurah) {
    const v = perSurah[sk];
    if (v.total > 0 && v.memorized === v.total) totalSurahsCompleted += 1;
  }

  return {
    totalMemorized,
    totalSurahsCompleted,
    weakAyahs: weak.slice(0, 10),
    perSurahProgress: perSurah,
    lastReviewDate,
  };
}

// ===== Context =====

interface MemorizationContextType {
  // Data
  isLoading: boolean;
  plans: MemorizationPlan[];
  activePlan: MemorizationPlan | null;
  ayahStates: Record<string, AyahMemoryState>;
  settings: MemorizationSettings;
  streak: MemorizationStreak;
  stats: MemorizationStats;
  todayPlan: TodayPlan;

  // Actions
  refresh: () => Promise<void>;
  createPlan: typeof createPlanStorage;
  setActivePlan: (id: string | null) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  updatePlan: (id: string, patch: Partial<MemorizationPlan>) => Promise<void>;
  markPassed: (surah: number, ayah: number) => Promise<AyahMemoryState>;
  markFailed: (surah: number, ayah: number) => Promise<AyahMemoryState>;
  markPartial: (surah: number, ayah: number) => Promise<AyahMemoryState>;
  ensureAyahState: (surah: number, ayah: number) => Promise<AyahMemoryState>;
  registerAyahsForPlan: (
    ayahs: { surahNumber: number; ayahNumber: number }[],
  ) => Promise<void>;
  updateSettings: (
    patch: Partial<MemorizationSettings>,
  ) => Promise<MemorizationSettings>;
  recordDailyActivity: () => Promise<MemorizationStreak>;
}

const MemorizationContext = createContext<MemorizationContextType | undefined>(
  undefined,
);

interface ProviderProps {
  children: ReactNode;
}

export function MemorizationProvider({ children }: ProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<MemorizationPlan[]>([]);
  const [activePlan, setActivePlanState] = useState<MemorizationPlan | null>(null);
  const [ayahStates, setAyahStates] = useState<Record<string, AyahMemoryState>>({});
  const [settings, setSettings] = useState<MemorizationSettings>(DEFAULT_SETTINGS);
  const [streak, setStreak] = useState<MemorizationStreak>({
    current: 0,
    best: 0,
    lastActivityDate: null,
  });

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allPlans, active, states, st, sk] = await Promise.all([
        getAllPlans(),
        getActivePlan(),
        getAllAyahStates(),
        getMemorizationSettings(),
        getStreak(),
      ]);
      setPlans(allPlans);
      setActivePlanState(active);
      setAyahStates(states);
      setSettings(st);
      setStreak(sk);
    } catch (e) {
      console.warn('[MemorizationContext] refresh failed', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => computeStats(ayahStates), [ayahStates]);

  const todayPlan = useMemo<TodayPlan>(() => {
    return computeTodayPlan(activePlan, ayahStates, todayString());
  }, [activePlan, ayahStates]);

  const createPlanWrapped = useCallback<typeof createPlanStorage>(
    async (partial) => {
      const plan = await createPlanStorage(partial);
      try {
        const { scheduleMemorizationReminder } = await import('@/lib/memorization-notifications');
        await scheduleMemorizationReminder(plan);
      } catch {}
      await refresh();
      return plan;
    },
    [refresh],
  );

  const setActivePlanWrapped = useCallback(
    async (id: string | null) => {
      await setActivePlanStorage(id);
      await refresh();
    },
    [refresh],
  );

  const deletePlanWrapped = useCallback(
    async (id: string) => {
      try {
        const { cancelMemorizationReminder } = await import('@/lib/memorization-notifications');
        await cancelMemorizationReminder(id);
      } catch {}
      await deletePlanStorage(id);
      await refresh();
    },
    [refresh],
  );

  const updatePlanWrapped = useCallback(
    async (id: string, patch: Partial<MemorizationPlan>) => {
      await updatePlanStorage(id, patch);
      try {
        const updated = await (await import('@/lib/memorization-storage')).getAllPlans();
        const found = updated.find((p) => p.id === id);
        if (found) {
          const { scheduleMemorizationReminder } = await import('@/lib/memorization-notifications');
          await scheduleMemorizationReminder(found);
        }
      } catch {}
      await refresh();
    },
    [refresh],
  );

  const markPassed = useCallback(
    async (surah: number, ayah: number) => {
      const next = await markAyahStorage(surah, ayah, true);
      setAyahStates((prev) => ({ ...prev, [ayahKey(surah, ayah)]: next }));
      return next;
    },
    [],
  );

  const markFailed = useCallback(async (surah: number, ayah: number) => {
    const next = await markAyahStorage(surah, ayah, false);
    setAyahStates((prev) => ({ ...prev, [ayahKey(surah, ayah)]: next }));
    return next;
  }, []);

  const markPartial = useCallback(async (surah: number, ayah: number) => {
    const next = await markAyahPartialStorage(surah, ayah);
    setAyahStates((prev) => ({ ...prev, [ayahKey(surah, ayah)]: next }));
    return next;
  }, []);

  const ensureAyahState = useCallback(async (surah: number, ayah: number) => {
    const next = await ensureAyahStateStorage(surah, ayah);
    setAyahStates((prev) => {
      const k = ayahKey(surah, ayah);
      if (prev[k]) return prev;
      return { ...prev, [k]: next };
    });
    return next;
  }, []);

  const registerAyahsForPlan = useCallback(
    async (ayahs: { surahNumber: number; ayahNumber: number }[]) => {
      await bulkUpsertAyahStates(ayahs);
      const fresh = await getAllAyahStates();
      setAyahStates(fresh);
    },
    [],
  );

  const updateSettingsWrapped = useCallback(
    async (patch: Partial<MemorizationSettings>) => {
      const next = await updateMemorizationSettings(patch);
      setSettings(next);
      return next;
    },
    [],
  );

  const recordDailyActivity = useCallback(async () => {
    const next = await bumpStreak();
    setStreak(next);
    // Fire-and-forget achievement check
    try {
      const { checkAndUnlockAchievements } = await import('@/lib/memorization-achievements');
      const newly = await checkAndUnlockAchievements(stats, next);
      if (newly.length > 0) {
        const { Platform, ToastAndroid, Alert } = await import('react-native');
        const msg = `🏆 إنجاز جديد: ${newly[0].titleAr}`;
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
        else Alert.alert('إنجاز جديد', newly.map((a) => `🏆 ${a.titleAr}`).join('\n'));
      }
    } catch {}
    return next;
  }, [stats]);

  const value: MemorizationContextType = {
    isLoading,
    plans,
    activePlan,
    ayahStates,
    settings,
    streak,
    stats,
    todayPlan,
    refresh,
    createPlan: createPlanWrapped,
    setActivePlan: setActivePlanWrapped,
    deletePlan: deletePlanWrapped,
    updatePlan: updatePlanWrapped,
    markPassed,
    markFailed,
    markPartial,
    ensureAyahState,
    registerAyahsForPlan,
    updateSettings: updateSettingsWrapped,
    recordDailyActivity,
  };

  return (
    <MemorizationContext.Provider value={value}>
      {children}
    </MemorizationContext.Provider>
  );
}

export function useMemorization(): MemorizationContextType {
  const ctx = useContext(MemorizationContext);
  if (!ctx) {
    throw new Error('useMemorization must be used inside MemorizationProvider');
  }
  return ctx;
}
