// contexts/MemorizationContext.tsx
// مزود حالة وضع الحفظ — يكشف الخطة النشطة، حالات الآيات، وِرد اليوم، والإحصائيات.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  MemorizationPlan,
  AyahMemoryState,
  MemorizationSettings,
  MemorizationStreak,
  MemorizationStats,
  TodayPlan,
  TodayPlanSnapshot,
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
  getTodaySnapshot,
  saveTodaySnapshot,
  clearTodaySnapshot,
  DEFAULT_SETTINGS,
} from '@/lib/memorization-storage';
import { todayString } from '@/lib/memorization-srs';
import { getAyahCount } from '@/lib/memorization-helpers';
import {
  computeAssignedToday,
  deriveTodayPlan,
  EMPTY_TODAY_PLAN,
} from '@/lib/memorization-today-plan';

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
  // True once today's ward snapshot is loaded (or there is no active plan).
  // Session screens wait for this before freezing their working queue.
  isTodayReady: boolean;

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

const achievementTitleEn: Record<string, string> = {
  first_ayah: 'Blessed beginning',
  ten_ayahs: 'Ten ayahs',
  fifty_ayahs: 'Fifty ayahs',
  hundred_ayahs: 'One hundred ayahs',
  first_surah: 'First surah',
  five_surahs: 'Five surahs',
  juz_amma: 'Juz Amma',
  streak_3: 'Three days',
  streak_7: 'Full week',
  streak_30: 'Full month',
  streak_100: 'One hundred days',
};

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
  // Persisted snapshot of today's assigned ward (stable across the day).
  const [todaySnapshot, setTodaySnapshot] = useState<TodayPlanSnapshot | null>(null);
  // Calendar day key; ticks at midnight so the ward + due dates roll over
  // even if the app stays open.
  const [dayKey, setDayKey] = useState<string>(() => todayString());

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

  // Tick the calendar day key so the ward + due dates roll over at midnight
  // without an app restart: every minute while foregrounded, AND immediately
  // when the app returns to the foreground (JS timers are throttled/suspended
  // in the background, so a resume after midnight must re-check at once).
  useEffect(() => {
    const syncDay = () =>
      setDayKey((prev) => {
        const t = todayString();
        return prev === t ? prev : t;
      });
    const id = setInterval(syncDay, 60_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncDay();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  // Ensure a persisted snapshot exists for (today, active plan). Recompute only
  // when the date or the active plan changes — never on every mark — so the
  // day's assigned ward stays fixed (target enforced, ring completes).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activePlan) {
        if (!cancelled) setTodaySnapshot(null);
        return;
      }
      const stored = await getTodaySnapshot();
      if (
        stored &&
        stored.date === dayKey &&
        stored.planId === activePlan.id
      ) {
        if (!cancelled) setTodaySnapshot(stored);
        return;
      }
      const states = await getAllAyahStates();
      const { assignedNew, assignedReview } = computeAssignedToday(
        activePlan,
        states,
        dayKey,
      );
      const snap: TodayPlanSnapshot = {
        date: dayKey,
        planId: activePlan.id,
        assignedNew,
        assignedReview,
      };
      // Bail before persisting if a newer (day/plan) run superseded us, so a
      // slow in-flight computation can't overwrite storage with a stale snapshot.
      if (cancelled) return;
      await saveTodaySnapshot(snap);
      if (!cancelled) setTodaySnapshot(snap);
    })();
    return () => {
      cancelled = true;
    };
  }, [activePlan, dayKey]);

  const isTodayReady =
    !activePlan ||
    (todaySnapshot != null &&
      todaySnapshot.planId === activePlan.id &&
      todaySnapshot.date === dayKey);

  const todayPlan = useMemo<TodayPlan>(() => {
    if (
      !activePlan ||
      !todaySnapshot ||
      todaySnapshot.planId !== activePlan.id ||
      todaySnapshot.date !== dayKey
    ) {
      return { ...EMPTY_TODAY_PLAN, date: dayKey };
    }
    return deriveTodayPlan(todaySnapshot, ayahStates, dayKey);
  }, [activePlan, todaySnapshot, ayahStates, dayKey]);

  // Record one day's activity: bump the streak (idempotent per day) and check
  // achievements against FRESH persisted stats (avoids the off-by-one where the
  // memo `stats` lags the just-marked ayah). Used by markPassed/markPartial and
  // exposed as recordDailyActivity for screens (calling twice is harmless).
  // Serialize activity bumps. bumpActivity is fired from markPassed/markPartial
  // AND from screens' explicit recordDailyActivity AND can be double-tapped, so
  // concurrent runs would race the streak / unlocked-achievements RMW and could
  // surface a duplicate achievement toast. Chaining makes each run observe the
  // previous one's persisted result (same-day streak no-op, achievement deduped).
  const activityLockRef = useRef<Promise<unknown>>(Promise.resolve());
  const bumpActivity = useCallback((): Promise<MemorizationStreak> => {
    const run = activityLockRef.current.catch(() => {}).then(async () => {
      const nextStreak = await bumpStreak();
      setStreak(nextStreak);
      try {
        const { checkAndUnlockAchievements } = await import(
          '@/lib/memorization-achievements'
        );
        const { uiText } = await import('@/lib/ui-text');
        const freshStats = computeStats(await getAllAyahStates());
        const newly = await checkAndUnlockAchievements(freshStats, nextStreak);
        if (newly.length > 0) {
          const { Platform, ToastAndroid, Alert } = await import('react-native');
          const titleFor = (id: string, ar: string) =>
            uiText({ ar, en: achievementTitleEn[id] || id.replace(/_/g, ' ') });
          const achievementTitle = uiText({ ar: 'إنجاز جديد', en: 'New achievement' });
          const msg = `🏆 ${achievementTitle}: ${titleFor(newly[0].id, newly[0].titleAr)}`;
          if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
          else
            Alert.alert(
              achievementTitle,
              newly.map((a) => `🏆 ${titleFor(a.id, a.titleAr)}`).join('\n'),
            );
        }
      } catch {}
      return nextStreak;
    });
    activityLockRef.current = run.catch(() => {});
    return run;
  }, []);

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
      // Today's ward snapshot bakes in the daily target / assignment, so clear
      // it after an edit and let the snapshot effect recompute a fresh ward.
      await clearTodaySnapshot();
      setTodaySnapshot(null);
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
      // Any successful memorization counts as daily activity (covers every
      // mode, incl. Hide which previously never bumped the streak).
      void bumpActivity();
      return next;
    },
    [bumpActivity],
  );

  const markFailed = useCallback(async (surah: number, ayah: number) => {
    const next = await markAyahStorage(surah, ayah, false);
    setAyahStates((prev) => ({ ...prev, [ayahKey(surah, ayah)]: next }));
    return next;
  }, []);

  const markPartial = useCallback(
    async (surah: number, ayah: number) => {
      const next = await markAyahPartialStorage(surah, ayah);
      setAyahStates((prev) => ({ ...prev, [ayahKey(surah, ayah)]: next }));
      void bumpActivity();
      return next;
    },
    [bumpActivity],
  );

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

  // Exposed for screens; same fresh-stats activity bump used internally.
  const recordDailyActivity = bumpActivity;

  const value: MemorizationContextType = {
    isLoading,
    plans,
    activePlan,
    ayahStates,
    settings,
    streak,
    stats,
    todayPlan,
    isTodayReady,
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
