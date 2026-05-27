import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { asyncStorage, firestoreState, monthlyStats } = vi.hoisted(() => ({
  asyncStorage: new Map<string, string>(),
  monthlyStats: {
    prayers: 0,
    quranPages: 0,
    khatmas: 0,
    azkar: 0,
    tasbih: 0,
    fasting: 0,
  },
  firestoreState: {
    users: new Map<string, Record<string, any>>(),
    config: {
      enabled: true,
      winnersCount: 3,
      rewardDurationDays: 30,
      autoSelect: false,
      autoNotify: false,
      scoreWeights: {
        app_open: 1,
        azkar: 2,
        quran: 3,
        prayer: 5,
        tasbih: 1,
        khatma: 100,
        fasting: 4,
      },
      currentMonth: '',
      currentWinners: [],
      history: [],
    },
  },
}));

const clone = <T,>(value: T): T => (
  value === undefined ? value : JSON.parse(JSON.stringify(value))
);

const getByPath = (target: Record<string, any>, path: string) => {
  return path.split('.').reduce((acc, key) => acc?.[key], target);
};

const setByPath = (target: Record<string, any>, path: string, value: any) => {
  const keys = path.split('.');
  let current = target;
  for (const key of keys.slice(0, -1)) {
    current[key] = current[key] || {};
    current = current[key];
  }
  const lastKey = keys[keys.length - 1];
  if (value?.__increment !== undefined) {
    current[lastKey] = (Number(current[lastKey]) || 0) + value.__increment;
  } else {
    current[lastKey] = value;
  }
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(asyncStorage.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      asyncStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      asyncStorage.delete(key);
      return Promise.resolve();
    }),
  },
}));

vi.mock('../lib/firebase-config', () => ({ db: {} }));
vi.mock('../lib/push-notifications', () => ({ scheduleLocalNotification: vi.fn() }));
vi.mock('@/lib/worship-storage', () => ({
  getTodayDate: vi.fn(() => '2026-05-07'),
  getMonthlyActivityStats: vi.fn(() => Promise.resolve({ ...monthlyStats })),
}));

vi.mock('firebase/firestore', () => {
  const getDataForRef = (ref: { path: string }) => {
    if (ref.path === 'config/rewards-settings') return firestoreState.config;
    if (ref.path.startsWith('users/')) return firestoreState.users.get(ref.path.slice('users/'.length));
    return undefined;
  };

  return {
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
    collection: (_db: unknown, name: string) => ({ collection: name }),
    increment: (amount: number) => ({ __increment: amount }),
    where: (field: string, op: string, value: unknown) => ({ type: 'where', field, op, value }),
    orderBy: (field: string, direction: string) => ({ type: 'orderBy', field, direction }),
    limit: (count: number) => ({ type: 'limit', count }),
    query: (ref: any, ...constraints: any[]) => ({ ref, constraints }),
    onSnapshot: vi.fn(() => () => {}),
    getDoc: vi.fn((ref: { path: string }) => {
      const data = getDataForRef(ref);
      return Promise.resolve({
        exists: () => !!data,
        data: () => clone(data),
      });
    }),
    setDoc: vi.fn((ref: { path: string }, value: Record<string, any>, options?: { merge?: boolean }) => {
      if (ref.path === 'config/rewards-settings') {
        firestoreState.config = options?.merge ? { ...firestoreState.config, ...clone(value) } : clone(value);
        return Promise.resolve();
      }
      if (ref.path.startsWith('users/')) {
        const id = ref.path.slice('users/'.length);
        const existing = firestoreState.users.get(id) || {};
        firestoreState.users.set(id, options?.merge ? { ...existing, ...clone(value) } : clone(value));
      }
      return Promise.resolve();
    }),
    updateDoc: vi.fn((ref: { path: string }, updates: Record<string, any>) => {
      const target = ref.path === 'config/rewards-settings'
        ? firestoreState.config
        : firestoreState.users.get(ref.path.slice('users/'.length));
      if (!target) throw new Error(`missing doc ${ref.path}`);
      for (const [key, value] of Object.entries(updates)) {
        if (key.includes('.')) {
          setByPath(target, key, value);
        } else {
          target[key] = clone(value);
        }
      }
      return Promise.resolve();
    }),
    getDocs: vi.fn((q: { ref: { collection: string }; constraints: any[] }) => {
      let docs = Array.from(firestoreState.users.entries()).map(([id, data]) => ({ id, data: () => clone(data) }));
      for (const constraint of q.constraints || []) {
        if (constraint.type === 'where') {
          docs = docs.filter((doc) => getByPath(doc.data(), constraint.field) === constraint.value);
        }
      }
      const order = q.constraints?.find((constraint) => constraint.type === 'orderBy');
      if (order) {
        docs.sort((a, b) => (Number(getByPath(b.data(), order.field)) || 0) - (Number(getByPath(a.data(), order.field)) || 0));
      }
      const limitConstraint = q.constraints?.find((constraint) => constraint.type === 'limit');
      if (limitConstraint) {
        docs = docs.slice(0, limitConstraint.count);
      }
      return Promise.resolve({
        forEach: (callback: (doc: any) => void) => docs.forEach(callback),
      });
    }),
  };
});

import {
  autoSelectMonthlyWinners,
  getCurrentMonth,
  getMonthlyLeaderboard,
  getUserMonthlyInfo,
  mergeCurrentUserIntoLeaderboard,
  syncMonthlyEngagementFromLocalWorship,
  syncPendingScores,
  updateMonthlyScore,
} from '../lib/rewards-manager';

describe('rewards-manager monthly sync', () => {
  beforeEach(() => {
    asyncStorage.clear();
    firestoreState.users.clear();
    Object.assign(monthlyStats, {
      prayers: 0,
      quranPages: 0,
      khatmas: 0,
      azkar: 0,
      tasbih: 0,
      fasting: 0,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not upload the same pending app_open score twice after a successful increment', async () => {
    const month = getCurrentMonth();
    firestoreState.users.set('u1', {
      displayName: 'User One',
      monthlyEngagement: { month, score: 0, activities: {} },
    });

    await updateMonthlyScore('u1', 'app_open');
    await syncPendingScores('u1');

    expect(firestoreState.users.get('u1')?.monthlyEngagement).toMatchObject({
      month,
      score: 1,
      activities: { app_open: 1 },
    });
    expect(asyncStorage.get('@pending_monthly_scores')).toBeUndefined();
  });

  it('preserves higher cloud score while keeping app_open and merge bonuses', async () => {
    const month = getCurrentMonth();
    Object.assign(monthlyStats, {
      prayers: 3,
      quranPages: 4,
      khatmas: 1,
      azkar: 1,
      tasbih: 5,
      fasting: 1,
    });
    firestoreState.users.set('u1', {
      displayName: 'User One',
      monthlyEngagement: {
        month,
        score: 999,
        activities: { app_open: 2, prayer: 100 },
      },
      mergeBonus: {
        activities: { quran: 2 },
        score: 6,
        mergedFrom: 'old-user',
      },
    });

    const result = await syncMonthlyEngagementFromLocalWorship('u1');

    expect(result?.activities).toEqual({
      app_open: 2,
      prayer: 100,
      quran: 6,
      khatma: 1,
      azkar: 1,
      tasbih: 5,
      fasting: 1,
    });
    expect(result?.score).toBe(999);
    expect(result?.mergeBonus?.mergedFrom).toBe('old-user');
    expect(firestoreState.users.get('u1')?.monthlyEngagement.score).toBe(999);
  });

  it('uploads higher local worship activity when it exceeds the cloud copy', async () => {
    const month = getCurrentMonth();
    Object.assign(monthlyStats, {
      prayers: 12,
      quranPages: 10,
      khatmas: 0,
      azkar: 3,
      tasbih: 50,
      fasting: 0,
    });
    firestoreState.users.set('u1', {
      displayName: 'User One',
      monthlyEngagement: {
        month,
        score: 11,
        activities: { app_open: 2, prayer: 1, quran: 2 },
      },
    });

    const result = await syncMonthlyEngagementFromLocalWorship('u1');

    expect(result?.activities).toMatchObject({
      app_open: 2,
      prayer: 12,
      quran: 10,
      azkar: 3,
      tasbih: 50,
    });
    expect(firestoreState.users.get('u1')?.monthlyEngagement.score).toBe(148);
  });

  it('does not reset existing cloud points when legacy users have no activity breakdown', async () => {
    const month = getCurrentMonth();
    firestoreState.users.set('legacy-points', {
      displayName: 'Legacy Points',
      monthlyEngagement: {
        month,
        score: 432,
      },
    });

    const result = await syncMonthlyEngagementFromLocalWorship('legacy-points');

    expect(result?.score).toBe(432);
    expect(firestoreState.users.get('legacy-points')?.monthlyEngagement.score).toBe(432);
  });

  it('uses the cloud score floor for current user info when local device history is lower', async () => {
    const month = getCurrentMonth();
    Object.assign(monthlyStats, {
      prayers: 0,
      quranPages: 0,
      khatmas: 0,
      azkar: 1,
      tasbih: 0,
      fasting: 0,
    });
    firestoreState.users.set('me', {
      displayName: 'Me',
      monthlyEngagement: {
        month,
        score: 5357,
        activities: { azkar: 1 },
      },
    });

    const result = await getUserMonthlyInfo('me');

    expect(result?.score).toBe(5357);
  });

  it('uses month-scoped leaderboard queries and filters hidden, placeholder, and nameless users', async () => {
    const month = getCurrentMonth();
    firestoreState.users.set('visible', {
      displayName: 'Visible',
      monthlyEngagement: { month, score: 10, activities: { app_open: 10 } },
    });
    firestoreState.users.set('legacy-name', {
      name: 'Legacy Name',
      monthlyEngagement: { month, score: 8, activities: { app_open: 8 } },
    });
    firestoreState.users.set('hidden', {
      displayName: 'Hidden',
      hiddenFromLeaderboard: true,
      monthlyEngagement: { month, score: 100, activities: { app_open: 100 } },
    });
    firestoreState.users.set('placeholder', {
      displayName: 'Placeholder',
      placeholder: true,
      monthlyEngagement: { month, score: 90, activities: { app_open: 90 } },
    });
    firestoreState.users.set('nameless', {
      displayName: ' ',
      monthlyEngagement: { month, score: 80, activities: { app_open: 80 } },
    });
    firestoreState.users.set('old-month', {
      displayName: 'Old Month',
      monthlyEngagement: { month: '2026-04-v2', score: 200, activities: { app_open: 200 } },
    });

    await expect(getMonthlyLeaderboard(20)).resolves.toEqual([
      { userId: 'visible', displayName: 'Visible', score: 10 },
      { userId: 'legacy-name', displayName: 'Legacy Name', score: 8 },
    ]);
  });

  it('re-sorts the leaderboard after merging the current user recalculated score', () => {
    const board = [
      { userId: 'rank-9', displayName: 'Rank 9', score: 758 },
      { userId: 'me', displayName: 'Me Old', score: 700 },
      { userId: 'rank-11', displayName: 'Rank 11', score: 569 },
      { userId: 'rank-12', displayName: 'Rank 12', score: 554 },
      { userId: 'rank-13', displayName: 'Rank 13', score: 513 },
    ];

    expect(mergeCurrentUserIntoLeaderboard(
      board,
      { userId: 'me', displayName: 'Me', score: 533 },
      20,
    )).toEqual([
      { userId: 'rank-9', displayName: 'Rank 9', score: 758 },
      { userId: 'rank-11', displayName: 'Rank 11', score: 569 },
      { userId: 'rank-12', displayName: 'Rank 12', score: 554 },
      { userId: 'me', displayName: 'Me', score: 533 },
      { userId: 'rank-13', displayName: 'Rank 13', score: 513 },
    ]);
  });

  it('keeps app-side monthly winner selection read-only; server grants premium', async () => {
    const previousMonth = '2026-04-v2';
    firestoreState.config.currentMonth = '';
    firestoreState.config.currentWinners = [];
    firestoreState.config.history = [];
    firestoreState.config.processedMonth = undefined;
    firestoreState.config.rewardDurationDays = 30;

    firestoreState.users.set('first', {
      displayName: 'First',
      monthlyEngagement: { month: previousMonth, score: 300, activities: { prayer: 60 } },
    });
    firestoreState.users.set('second', {
      displayName: 'Second',
      monthlyEngagement: { month: previousMonth, score: 200, activities: { quran: 60 } },
    });
    firestoreState.users.set('third', {
      displayName: 'Third',
      monthlyEngagement: { month: previousMonth, score: 100, activities: { azkar: 50 } },
    });
    firestoreState.users.set('fourth', {
      displayName: 'Fourth',
      monthlyEngagement: { month: previousMonth, score: 50, activities: { app_open: 50 } },
    });
    firestoreState.users.set('hidden-winner', {
      displayName: 'Hidden Winner',
      hiddenFromLeaderboard: true,
      monthlyEngagement: { month: previousMonth, score: 500, activities: { prayer: 100 } },
    });

    await autoSelectMonthlyWinners();

    expect(firestoreState.config.currentMonth).toBe('');
    expect(firestoreState.config.processedMonth).toBeUndefined();
    expect(firestoreState.config.currentWinners).toEqual([]);
    expect(firestoreState.config.history).toEqual([]);

    for (const userId of ['first', 'second', 'third', 'fourth', 'hidden-winner']) {
      expect(firestoreState.users.get(userId)?.adminPremium).toBeUndefined();
    }
  });
});
