// admin-panel/src/pages/Rewards.tsx
// صفحة إدارة المكافآت الشهرية — أفضل المستخدمين نشاطاً

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Save, Loader2, Settings, History, Users, Gift, AlertTriangle, Search, X, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { sendPrizeNotification, sendRewardsWeightsUpdateNotification } from '../services/pushNotifications';

interface ScoreWeights {
  app_open: number;
  azkar: number;
  quran: number;
  prayer: number;
  tasbih: number;
  khatma: number;
  fasting: number;
}

interface Winner {
  userId: string;
  displayName?: string;
  score: number;
  rewardedAt: string;
  notified: boolean;
  premiumExpiresAt: string;
}

interface RewardHistoryEntry {
  month: string;
  winners: Winner[];
  selectedAt: string;
  selectedBy: 'auto' | 'admin';
}

interface RewardsConfig {
  enabled: boolean;
  winnersCount: number;
  rewardDurationDays: number;
  autoSelect: boolean;
  autoNotify: boolean;
  scoreWeights: ScoreWeights;
  currentMonth: string;
  currentWinners: Winner[];
  history: RewardHistoryEntry[];
  // Bumped whenever scoreWeights change so the app can show users a
  // "points recalculated" banner prompting them to re-check the honor board.
  scoreWeightsVersion?: number;
  scoreWeightsUpdatedAt?: string;
}

interface LeaderboardUser {
  id: string;
  displayName?: string;
  email?: string;
  platform?: string;
  score: number;
  month: string;
  lastActive?: string;
  selected: boolean;
  hidden: boolean;
  deviceName?: string;
  deviceBrand?: string;
  installSource?: string;
  fcmToken?: string;
  rank?: number;
}

const DEFAULT_CONFIG: RewardsConfig = {
  enabled: false,
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
};

const WEIGHT_LABELS: Record<string, string> = {
  app_open: 'فتح التطبيق',
  azkar: 'الأذكار',
  quran: 'القرآن',
  prayer: 'الصلاة',
  tasbih: 'التسبيح',
  khatma: 'الختمة',
  fasting: 'الصيام',
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v2`;
};

// Arabic month names for human-readable history labels.
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// Strips the internal "-v2" reset marker and any day artifacts down to YYYY-MM
// so duplicate/legacy entries for the same calendar month group together.
const monthSortKey = (raw: string): string => {
  const m = String(raw).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : String(raw);
};

// "2026-05-v2" → "مايو 2026"
const formatMonthLabel = (raw: string): string => {
  const m = String(raw).match(/^(\d{4})-(\d{2})/);
  if (!m) return String(raw);
  return `${AR_MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
};

const weightsEqual = (a?: Partial<ScoreWeights> | null, b?: Partial<ScoreWeights> | null): boolean => {
  const keys: (keyof ScoreWeights)[] = ['app_open', 'azkar', 'quran', 'prayer', 'tasbih', 'khatma', 'fasting'];
  return keys.every(k => Number(a?.[k] ?? NaN) === Number(b?.[k] ?? NaN));
};

const normalizeRewardsConfig = (raw?: Partial<RewardsConfig> | null): RewardsConfig => ({
  ...DEFAULT_CONFIG,
  ...(raw || {}),
  scoreWeights: {
    ...DEFAULT_CONFIG.scoreWeights,
    ...((raw as any)?.scoreWeights || {}),
    khatma: (raw as any)?.scoreWeights?.khatma === undefined || (raw as any)?.scoreWeights?.khatma === 5
      ? DEFAULT_CONFIG.scoreWeights.khatma
      : (raw as any)?.scoreWeights?.khatma,
  },
  currentWinners: raw?.currentWinners || [],
  history: raw?.history || [],
});

const isWinnerEligible = (user: LeaderboardUser): boolean => {
  return !user.hidden && !!user.displayName?.trim();
};

const hasName = (user: LeaderboardUser): boolean => !!user.displayName?.trim();

const matchesLeaderboardSearch = (user: LeaderboardUser, rawTerm: string): boolean => {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return true;
  const fields = [
    user.displayName,
    user.email,
    user.id,
    user.platform,
    user.deviceName,
    user.deviceBrand,
    user.installSource,
    user.score,
    user.rank,
  ];
  return fields.some(value => String(value || '').toLowerCase().includes(term));
};

const buildLeaderboardUsers = (
  docs: Array<{ id: string; data: () => Record<string, any> }>,
  selectedIds = new Set<string>(),
): LeaderboardUser[] => {
  const users: LeaderboardUser[] = [];

  docs.forEach(docSnap => {
    const data = docSnap.data();
    // Only skip placeholders — admin sees ALL real users
    if (data.placeholder) return;
    const engagement = data.monthlyEngagement;
    if (engagement && engagement.score > 0) {
      const displayName = String(data.displayName || data.name || '').trim();
      users.push({
        id: docSnap.id,
        displayName,
        email: data.email,
        platform: data.platform,
        score: engagement.score,
        month: engagement.month,
        lastActive: data.lastActive?.toDate?.()?.toLocaleDateString('ar-EG') || '',
        selected: selectedIds.has(docSnap.id),
        hidden: !!data.hiddenFromLeaderboard,
        deviceName: data.deviceName,
        deviceBrand: data.deviceBrand,
        installSource: data.installSource,
        fcmToken: data.fcmToken,
      });
    }
  });

  users.sort((a, b) => b.score - a.score);

  let visibleRank = 0;
  return users.map(user => {
    const rank = isWinnerEligible(user) ? ++visibleRank : undefined;
    return { ...user, rank };
  });
};

export default function Rewards() {
  const [config, setConfig] = useState<RewardsConfig>(DEFAULT_CONFIG);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'settings' | 'history'>('leaderboard');
  const [showHidden, setShowHidden] = useState(false);
  const [hideUnnamed, setHideUnnamed] = useState(true);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [weightsJustChanged, setWeightsJustChanged] = useState(false);

  useEffect(() => {
    const unsubscribeConfig = onSnapshot(
      doc(db, 'config', 'rewards-settings'),
      (snap) => {
        if (snap.exists()) {
          setConfig(normalizeRewardsConfig(snap.data() as Partial<RewardsConfig>));
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to rewards config:', err);
        loadConfig();
      }
    );

    const currentMonth = getCurrentMonth();
    const usersRef = collection(db, 'users');
    const leaderboardQuery = query(
      usersRef,
      where('monthlyEngagement.month', '==', currentMonth),
      orderBy('monthlyEngagement.score', 'desc')
    );

    setLoadingBoard(true);
    const unsubscribeLeaderboard = onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        setLeaderboard(prev => {
          const selectedIds = new Set(prev.filter(u => u.selected).map(u => u.id));
          return buildLeaderboardUsers(snapshot.docs, selectedIds);
        });
        setLoadingBoard(false);
      },
      (err) => {
        console.error('Error listening to leaderboard:', err);
        setLoadingBoard(false);
        loadLeaderboard();
      }
    );

    return () => {
      unsubscribeConfig();
      unsubscribeLeaderboard();
    };
    // Initial listeners only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the newest history month by default (once, when history first loads).
  const [historyInitialized, setHistoryInitialized] = useState(false);
  useEffect(() => {
    if (historyInitialized || config.history.length === 0) return;
    const newest = monthSortKey(config.history[0].month);
    setOpenMonths(new Set([newest]));
    setHistoryInitialized(true);
  }, [config.history, historyInitialized]);

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /**
   * Save edited display name to Firestore and update local state
   */
  const saveUserName = async (userId: string) => {
    const trimmed = editingNameValue.trim();
    if (!trimmed) return;
    try {
      await updateDoc(doc(db, 'users', userId), { displayName: trimmed });
      setLeaderboard(prev => prev.map(u => u.id === userId ? { ...u, displayName: trimmed } : u));
      setEditingNameId(null);
    } catch (err) {
      console.error('Error saving user name:', err);
      alert('حدث خطأ أثناء حفظ الاسم');
    }
  };

  const loadConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'rewards-settings'));
      if (snap.exists()) {
        setConfig(normalizeRewardsConfig(snap.data() as Partial<RewardsConfig>));
      }
    } catch (err) {
      console.error('Error loading rewards config:', err);
    } finally {
      setLoading(false);
    }
    loadLeaderboard();
  };

  const loadLeaderboard = async () => {
    setLoadingBoard(true);
    try {
      const currentMonth = getCurrentMonth();
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('monthlyEngagement.month', '==', currentMonth),
        orderBy('monthlyEngagement.score', 'desc')
      );
      const snapshot = await getDocs(q);

      setLeaderboard(prev => {
        const selectedIds = new Set(prev.filter(u => u.selected).map(u => u.id));
        return buildLeaderboardUsers(snapshot.docs, selectedIds);
      });
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoadingBoard(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Read the currently-saved doc so we can tell whether the score weights
      // actually changed. Only then do we bump scoreWeightsVersion — this is
      // what triggers the in-app "points recalculated" banner for users, so we
      // must NOT bump it for unrelated edits (winners count, duration, enable).
      const ref = doc(db, 'config', 'rewards-settings');
      const prevSnap = await getDoc(ref);
      const prev = prevSnap.exists() ? (prevSnap.data() as Partial<RewardsConfig>) : null;
      const weightsChanged = !weightsEqual(prev?.scoreWeights, config.scoreWeights);

      const nextConfig: RewardsConfig = { ...config };
      if (weightsChanged) {
        nextConfig.scoreWeightsVersion = (Number(prev?.scoreWeightsVersion) || 0) + 1;
        nextConfig.scoreWeightsUpdatedAt = new Date().toISOString();
      }

      await setDoc(ref, nextConfig);
      setConfig(nextConfig);
      setWeightsJustChanged(weightsChanged);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Manually push a "points recalculated — check the honor board" notification
   * to all users. Used after editing the score weights so active users come
   * back and see their updated standing.
   */
  const handleSendUpdateNotification = async () => {
    if (!confirm('سيتم إرسال إشعار لجميع المستخدمين يدعوهم لمراجعة نقاطهم بعد تحديث الأوزان. متابعة؟')) {
      return;
    }
    setSendingNotif(true);
    try {
      const result = await sendRewardsWeightsUpdateNotification();
      if (result.success) {
        alert(`✅ تم إرسال التنبيه إلى ${result.sentCount} مستخدم`);
      } else {
        alert(`⚠️ تعذّر إرسال التنبيه: ${result.errors[0] || 'لا يوجد مستخدمون مطابقون'}`);
      }
    } catch (err) {
      console.error('Error sending rewards update notification:', err);
      alert('حدث خطأ أثناء إرسال التنبيه');
    } finally {
      setSendingNotif(false);
    }
  };

  const autoSelectWinners = () => {
    let selectedCount = 0;
    const updated = leaderboard.map((u) => {
      const selected = isWinnerEligible(u) && selectedCount < config.winnersCount;
      if (selected) selectedCount++;
      return { ...u, selected };
    });
    setLeaderboard(updated);
  };

  const toggleUserSelection = (userId: string) => {
    setLeaderboard(prev =>
      prev.map(u => (u.id === userId ? { ...u, selected: isWinnerEligible(u) ? !u.selected : false } : u))
    );
  };

  const toggleUserVisibility = async (userId: string) => {
    const user = leaderboard.find(u => u.id === userId);
    if (!user) return;
    const newHidden = !user.hidden;
    try {
      await updateDoc(doc(db, 'users', userId), { hiddenFromLeaderboard: newHidden });
      setLeaderboard(prev =>
        prev.map(u => (u.id === userId ? { ...u, hidden: newHidden } : u))
      );
    } catch (err) {
      console.error('Error toggling user visibility:', err);
    }
  };

  /**
   * Merge duplicate user: transfers score from source → target, deletes source doc
   */
  const mergeUsers = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setMerging(true);
    try {
      const sourceRef = doc(db, 'users', sourceId);
      const targetRef = doc(db, 'users', targetId);
      const [sourceSnap, targetSnap] = await Promise.all([getDoc(sourceRef), getDoc(targetRef)]);
      
      if (!sourceSnap.exists() || !targetSnap.exists()) {
        alert('أحد المستخدمين غير موجود');
        return;
      }

      const sourceData = sourceSnap.data();
      const targetData = targetSnap.data();
      const sourceEngagement = sourceData.monthlyEngagement || {};
      const targetEngagement = targetData.monthlyEngagement || {};

      // Merge scores if same month
      if (sourceEngagement.month && sourceEngagement.month === targetEngagement.month) {
        const mergedScore = (targetEngagement.score || 0) + (sourceEngagement.score || 0);
        const mergedActivities = { ...(targetEngagement.activities || {}) };
        for (const [key, count] of Object.entries(sourceEngagement.activities || {})) {
          mergedActivities[key] = (mergedActivities[key] || 0) + (count as number);
        }
        await updateDoc(targetRef, {
          'monthlyEngagement.score': mergedScore,
          'monthlyEngagement.activities': mergedActivities,
          // Store merge bonus so app can preserve merged points alongside local worship data
          mergeBonus: {
            activities: sourceEngagement.activities || {},
            score: sourceEngagement.score || 0,
            mergedFrom: sourceId,
            mergedAt: new Date().toISOString(),
          },
        });
      } else if (sourceEngagement.score > (targetEngagement.score || 0)) {
        // Source has more recent/higher data — copy it
        await updateDoc(targetRef, {
          monthlyEngagement: sourceEngagement,
          mergeBonus: {
            activities: sourceEngagement.activities || {},
            score: sourceEngagement.score || 0,
            mergedFrom: sourceId,
            mergedAt: new Date().toISOString(),
          },
        });
      }

      // Mark source as placeholder (soft delete) so it never shows again
      await updateDoc(sourceRef, { 
        placeholder: true, 
        mergedInto: targetId, 
        mergedAt: new Date().toISOString(),
        hiddenFromLeaderboard: true,
      });

      alert(`✅ تم دمج "${sourceData.displayName || sourceId}" في "${targetData.displayName || targetId}"`);
      setMergeSource(null);
      loadLeaderboard();
    } catch (err) {
      console.error('Error merging users:', err);
      alert('حدث خطأ أثناء الدمج');
    } finally {
      setMerging(false);
    }
  };

  const confirmWinners = async () => {
    const selected = leaderboard.filter(u => u.selected && isWinnerEligible(u));
    if (selected.length === 0) {
      alert('لا يوجد فائزون مؤهلون: يجب أن يكون المستخدم ظاهراً وله اسم عرض.');
      return;
    }

    const currentMonth = getCurrentMonth();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.rewardDurationDays);

    const winners: Winner[] = selected.map(u => ({
      userId: u.id,
      displayName: u.displayName,
      score: u.score,
      rewardedAt: new Date().toISOString(),
      notified: false,
      premiumExpiresAt: expiresAt.toISOString(),
    }));

    // Grant premium to each winner
    for (const winner of winners) {
      try {
        await updateDoc(doc(db, 'users', winner.userId), {
          adminPremium: {
            granted: true,
            grantedBy: 'reward_system',
            grantedAt: new Date().toISOString(),
            plan: 'monthly',
            expiresAt: expiresAt.toISOString(),
            reason: `فائز في مسابقة الشهر ${currentMonth}`,
          },
        });
      } catch (err) {
        console.error('Error granting premium to', winner.userId, err);
      }
    }

    // Update config
    const historyEntry: RewardHistoryEntry = {
      month: currentMonth,
      winners,
      selectedAt: new Date().toISOString(),
      selectedBy: 'admin',
    };

    const updatedConfig = {
      ...config,
      currentMonth,
      currentWinners: winners,
      history: [historyEntry, ...config.history.slice(0, 11)], // Keep last 12 months
    };

    setConfig(updatedConfig);
    await setDoc(doc(db, 'config', 'rewards-settings'), updatedConfig);

    // Auto-notify winners
    try {
      const result = await sendPrizeNotification(winners.map(w => w.userId));
      if (result.success) {
        // Mark winners as notified
        const notifiedWinners = winners.map(w => ({ ...w, notified: true }));
        const notifiedConfig = { ...updatedConfig, currentWinners: notifiedWinners };
        setConfig(notifiedConfig);
        await setDoc(doc(db, 'config', 'rewards-settings'), notifiedConfig);
      }
    } catch (err) {
      console.error('Error sending prize notifications:', err);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateWeight = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      scoreWeights: { ...prev.scoreWeights, [key]: value },
    }));
    setSaved(false);
  };

  const visibleLeaderboard = leaderboard.filter(
    user => (showHidden || !user.hidden) && (!hideUnnamed || hasName(user))
  );
  const filteredLeaderboard = visibleLeaderboard.filter(user => matchesLeaderboardSearch(user, leaderboardSearch));
  const unnamedCount = leaderboard.filter(user => !hasName(user)).length;

  // Group history by calendar month so duplicate selections and legacy -v1/-v2
  // keys fold under a single readable "مايو 2026" card, newest month first.
  const historyByMonth = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; entries: typeof config.history }>();
    for (const entry of config.history) {
      const key = monthSortKey(entry.month);
      if (!groups.has(key)) {
        groups.set(key, { key, label: formatMonthLabel(entry.month), entries: [] });
      }
      groups.get(key)!.entries.push(entry);
    }
    return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [config.history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl">
            <Trophy className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">المكافآت الشهرية</h1>
            <p className="text-sm text-slate-300">مكافأة أنشط المستخدمين ببريميوم مجاني</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-slate-200">{config.enabled ? 'مفعّل' : 'معطّل'}</span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="w-5 h-5 accent-emerald-500"
              aria-label="تفعيل المكافآت"
            />
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'leaderboard' as const, label: 'لوحة المتصدرين', icon: Users },
          { key: 'settings' as const, label: 'الإعدادات', icon: Settings },
          { key: 'history' as const, label: 'السجل', icon: History },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-300 hover:bg-admin-surface'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">
              شهر {formatMonthLabel(getCurrentMonth())} — {visibleLeaderboard.length} متسابق ظاهر
            </h2>
            <div className="flex gap-2">
              <button
                onClick={loadLeaderboard}
                disabled={loadingBoard}
                className="px-3 py-1.5 text-sm font-medium bg-admin-surface-light text-white border border-admin-border rounded-lg hover:bg-slate-700"
                aria-label="تحديث لوحة المتصدرين"
                title="تحديث لوحة المتصدرين"
              >
                {loadingBoard ? 'جاري التحميل...' : 'تحديث'}
              </button>
              <button
                onClick={autoSelectWinners}
                className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/30"
                aria-label="اختيار الفائزين تلقائياً"
                title="اختيار الفائزين تلقائياً"
              >
                اختيار تلقائي
              </button>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer mr-auto">
                <input
                  type="checkbox"
                  checked={hideUnnamed}
                  onChange={() => setHideUnnamed(v => !v)}
                  className="w-4 h-4 accent-emerald-500"
                />
                إخفاء بدون اسم ({unnamedCount})
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={() => setShowHidden(v => !v)}
                  className="w-4 h-4 accent-emerald-500"
                />
                عرض المخفيين ({leaderboard.filter(u => u.hidden).length})
              </label>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-admin-border bg-admin-surface p-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                placeholder="ابحث بالاسم، ID، الجهاز، المنصة، أو النقاط..."
                aria-label="بحث في متسابقي الشهر"
                dir="auto"
              />
              {leaderboardSearch && (
                <button
                  onClick={() => setLeaderboardSearch('')}
                  className="rounded-lg p-1 text-slate-400 hover:bg-admin-surface-light hover:text-white"
                  aria-label="مسح البحث"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {leaderboardSearch.trim()
                ? `نتائج البحث: ${filteredLeaderboard.length} من ${visibleLeaderboard.length}`
                : `البحث يعمل على كل متسابقي الشهر الحالي، وليس أول 50 فقط.`}
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد بيانات للشهر الحالي</p>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-admin-surface rounded-xl border border-admin-border">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد نتائج مطابقة للبحث</p>
            </div>
          ) : (
            <>
              {mergeSource && (
                <div className="mb-3 p-3 bg-orange-500/15 border border-orange-500/40 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-300 shrink-0" />
                  <div className="flex-1 text-sm text-orange-200">
                    <strong>وضع الدمج:</strong> اضغط "← دمج هنا" على المستخدم الذي تريد نقل النقاط إليه.
                    المستخدم المصدر: <strong>{leaderboard.find(u => u.id === mergeSource)?.displayName}</strong>
                  </div>
                  <button
                    onClick={() => setMergeSource(null)}
                    className="px-3 py-1 text-xs bg-admin-surface-light text-slate-200 border border-admin-border rounded-lg hover:bg-slate-700"
                  >
                    إلغاء
                  </button>
                </div>
              )}
              <div className="bg-admin-surface rounded-xl border border-admin-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-admin-surface-light/60">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm text-slate-200">#</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-200">المستخدم</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-200">الجهاز</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-200">نقاط</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-200">المنصة</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-200">آخر نشاط</th>
                      <th className="px-4 py-3 text-center text-sm text-slate-200">إخفاء</th>
                      <th className="px-4 py-3 text-center text-sm text-slate-200">دمج</th>
                      <th className="px-4 py-3 text-center text-sm text-slate-200">فائز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.map((user) => (
                      <tr
                        key={user.id}
                        className={`border-t border-admin-border hover:bg-admin-surface-light/40 transition-colors ${user.selected ? 'bg-amber-500/10' : ''} ${user.hidden ? 'opacity-50' : ''} ${
                          user.rank && user.rank <= 3 ? 'font-medium' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium flex items-center gap-1">
                            {editingNameId === user.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingNameValue}
                                  onChange={(e) => setEditingNameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveUserName(user.id);
                                    if (e.key === 'Escape') setEditingNameId(null);
                                  }}
                                  className="bg-admin-input text-white border border-admin-border rounded px-2 py-1 text-sm w-32 text-right outline-none focus:ring-2 focus:ring-accent"
                                  autoFocus
                                  dir="auto"
                                  aria-label="تعديل اسم المستخدم"
                                  placeholder="اسم المستخدم"
                                  title="تعديل اسم المستخدم"
                                />
                                <button
                                  onClick={() => saveUserName(user.id)}
                                  className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded hover:bg-emerald-500/30"
                                >
                                  حفظ
                                </button>
                                <button
                                  onClick={() => setEditingNameId(null)}
                                  className="text-xs bg-slate-700/60 text-slate-200 border border-slate-600 px-2 py-1 rounded hover:bg-slate-700"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer text-white hover:text-emerald-300 hover:underline"
                                onClick={() => { setEditingNameId(user.id); setEditingNameValue(user.displayName || ''); }}
                                title="انقر لتعديل الاسم"
                              >
                                {user.displayName}
                              </span>
                            )}
                            {user.hidden && <span className="text-xs text-red-300 mr-2">(مخفي)</span>}
                          </div>
                          {user.email && (
                            <div className="text-xs text-slate-200">{user.email}</div>
                          )}
                          <div className="text-[10px] text-slate-300 font-mono truncate max-w-[140px]" title={user.id}>{user.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-100">{user.deviceBrand || ''} {user.deviceName || '-'}</div>
                          <div className="text-[10px] text-slate-300">{user.installSource || '-'}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-amber-300">{user.score}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">{user.platform || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">{user.lastActive || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleUserVisibility(user.id)}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                              user.hidden
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                            }`}
                            title={user.hidden ? 'إظهار في لوحة الشرف' : 'إخفاء من لوحة الشرف'}
                          >
                            {user.hidden ? 'إظهار' : 'إخفاء'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {mergeSource === null ? (
                            <button
                              onClick={() => setMergeSource(user.id)}
                              className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-lg hover:bg-blue-500/30 transition-colors"
                              title="اختيار كمصدر للدمج"
                            >
                              دمج
                            </button>
                          ) : mergeSource === user.id ? (
                            <button
                              onClick={() => setMergeSource(null)}
                              className="px-2.5 py-1 text-xs bg-slate-700/60 text-slate-200 border border-slate-600 rounded-lg"
                              title="إلغاء الدمج"
                            >
                              إلغاء
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`دمج نقاط "${leaderboard.find(u => u.id === mergeSource)?.displayName}" في "${user.displayName}"؟\nسيتم حذف المستخدم المكرر.`)) {
                                  mergeUsers(mergeSource, user.id);
                                }
                              }}
                              disabled={merging}
                              className="px-2.5 py-1 text-xs bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                              title={`دمج في ${user.displayName}`}
                            >
                              {merging ? '...' : '← دمج هنا'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={user.selected}
                            onChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4 accent-amber-500"
                            aria-label="اختيار فائز"
                            title="اختيار فائز"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={confirmWinners}
                  disabled={!leaderboard.some(u => u.selected)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  <Gift className="w-4 h-4" />
                  تأكيد الفائزين ومنح البريميوم
                </button>
              </div>
            </>
          )}

          {/* Current Winners */}
          {config.currentWinners.length > 0 && (
            <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/40">
              <h3 className="font-bold text-amber-300 mb-3">
                🏆 فائزو شهر {config.currentMonth}
              </h3>
              <div className="space-y-2">
                {config.currentWinners.map((w, i) => (
                  <div key={w.userId} className="flex items-center justify-between bg-admin-surface border border-admin-border p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <span className="font-medium text-white">{w.displayName || w.userId.slice(0, 8)}</span>
                    </div>
                    <div className="text-sm text-slate-200">
                      {w.score} نقطة — ينتهي: {new Date(w.premiumExpiresAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-admin-surface p-5 rounded-xl border border-admin-border">
            <h3 className="font-bold text-white mb-4">الإعدادات العامة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">عدد الفائزين</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.winnersCount}
                  onChange={e => setConfig(prev => ({ ...prev, winnersCount: Number(e.target.value) }))}
                  className="input-admin-sm"
                  aria-label="عدد الفائزين"
                  title="عدد الفائزين"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">مدة المكافأة (أيام)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={config.rewardDurationDays}
                  onChange={e => setConfig(prev => ({ ...prev, rewardDurationDays: Number(e.target.value) }))}
                  className="input-admin-sm"
                  aria-label="مدة المكافأة"
                  title="مدة المكافأة"
                />
              </div>
            </div>
          </div>

          <div className="bg-admin-surface p-5 rounded-xl border border-admin-border">
            <h3 className="font-bold text-white mb-4">أوزان النقاط</h3>
            <p className="text-sm text-slate-400 mb-4">كل نشاط يمنح نقاط حسب الوزن المحدد</p>
            <div className="space-y-3">
              {Object.entries(config.scoreWeights).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-28 text-sm text-slate-200">{WEIGHT_LABELS[key] || key}</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={value}
                    onChange={e => updateWeight(key, Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                    aria-label={WEIGHT_LABELS[key] || key}
                    title={WEIGHT_LABELS[key] || key}
                  />
                  <span className="w-8 text-center font-bold text-amber-300">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notify users after changing weights */}
          <div className="bg-admin-surface p-5 rounded-xl border border-admin-border">
            <h3 className="font-bold text-white mb-1">تنبيه المستخدمين بالتحديث</h3>
            <p className="text-sm text-slate-400 mb-4">
              عند تغيير أوزان النقاط، يظهر للمستخدمين تنبيه داخل التطبيق تلقائياً عند فتح لوحة الشرف.
              يمكنك أيضاً إرسال إشعار فوري لدعوتهم لمراجعة نقاطهم الآن.
            </p>
            {weightsJustChanged && (
              <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-200">
                ✓ تم تحديث الأوزان — سيظهر للمستخدمين تنبيه داخل التطبيق تلقائياً. أرسل إشعاراً الآن لدعوتهم للرجوع.
              </div>
            )}
            <button
              onClick={handleSendUpdateNotification}
              disabled={sendingNotif}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
            >
              {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {sendingNotif ? 'جاري الإرسال...' : 'أرسل تنبيه للمستخدمين'}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {config.history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا يوجد سجل سابق</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyByMonth.map(group => {
                const isOpen = openMonths.has(group.key);
                return (
                  <div key={group.key} className="bg-admin-surface rounded-xl border border-admin-border overflow-hidden">
                    <button
                      onClick={() => toggleMonth(group.key)}
                      className="w-full flex items-center justify-between p-4 text-right hover:bg-admin-surface-light transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span className="flex items-center gap-2 font-bold text-white">
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        {group.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {group.entries.length} {group.entries.length === 1 ? 'اختيار' : 'اختيارات'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4 border-t border-admin-border pt-3">
                        {group.entries.map((entry, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="text-xs text-slate-400">
                              {entry.selectedBy === 'auto' ? 'اختيار تلقائي' : 'اختيار يدوي'} —{' '}
                              {new Date(entry.selectedAt).toLocaleDateString('ar-EG')}
                            </div>
                            {entry.winners.map((w, i) => (
                              <div key={w.userId} className="flex items-center justify-between text-sm">
                                <span className="text-slate-200">
                                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}{' '}
                                  {w.displayName || w.userId.slice(0, 8)}
                                </span>
                                <span className="text-amber-300 font-medium">{w.score} نقطة</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
