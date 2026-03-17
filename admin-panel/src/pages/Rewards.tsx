// admin-panel/src/pages/Rewards.tsx
// صفحة إدارة المكافآت الشهرية — أفضل المستخدمين نشاطاً

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Save, Loader2, Settings, History, Users, Gift, Bell } from 'lucide-react';
import { sendPrizeNotification } from '../services/pushNotifications';

interface ScoreWeights {
  app_open: number;
  azkar: number;
  quran: number;
  prayer: number;
  tasbih: number;
  khatma: number;
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
    khatma: 5,
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
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function Rewards() {
  const [config, setConfig] = useState<RewardsConfig>(DEFAULT_CONFIG);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'settings' | 'history'>('leaderboard');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'rewards-settings'));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as RewardsConfig);
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
      const q = query(usersRef, orderBy('monthlyEngagement.score', 'desc'), limit(20));
      const snapshot = await getDocs(q);

      const users: LeaderboardUser[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const engagement = data.monthlyEngagement;
        if (engagement && engagement.month === currentMonth && engagement.score > 0) {
          users.push({
            id: docSnap.id,
            displayName: data.displayName || data.name || docSnap.id.slice(0, 8),
            email: data.email,
            platform: data.platform,
            score: engagement.score,
            month: engagement.month,
            lastActive: data.lastActive?.toDate?.()?.toLocaleDateString('ar-EG') || '',
            selected: false,
          });
        }
      });
      setLeaderboard(users);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoadingBoard(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'rewards-settings'), config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const autoSelectWinners = () => {
    const updated = leaderboard.map((u, i) => ({
      ...u,
      selected: i < config.winnersCount,
    }));
    setLeaderboard(updated);
  };

  const toggleUserSelection = (userId: string) => {
    setLeaderboard(prev =>
      prev.map(u => (u.id === userId ? { ...u, selected: !u.selected } : u))
    );
  };

  const confirmWinners = async () => {
    const selected = leaderboard.filter(u => u.selected);
    if (selected.length === 0) return;

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
          <div className="p-3 bg-amber-100 rounded-xl">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">المكافآت الشهرية</h1>
            <p className="text-sm text-slate-500">مكافأة أنشط المستخدمين ببريميوم مجاني</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-slate-600">{config.enabled ? 'مفعّل' : 'معطّل'}</span>
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
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
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
                ? 'bg-amber-100 text-amber-700 font-bold'
                : 'text-slate-500 hover:bg-slate-100'
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
            <h2 className="font-bold text-slate-700">
              شهر {getCurrentMonth()} — أفضل {config.winnersCount} مستخدمين
            </h2>
            <div className="flex gap-2">
              <button
                onClick={loadLeaderboard}
                disabled={loadingBoard}
                className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200"
                aria-label="تحديث لوحة المتصدرين"
                title="تحديث لوحة المتصدرين"
              >
                {loadingBoard ? 'جاري التحميل...' : 'تحديث'}
              </button>
              <button
                onClick={autoSelectWinners}
                className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                aria-label="اختيار الفائزين تلقائياً"
                title="اختيار الفائزين تلقائياً"
              >
                اختيار تلقائي
              </button>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد بيانات للشهر الحالي</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm text-slate-500">#</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-500">المستخدم</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-500">نقاط</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-500">المنصة</th>
                      <th className="px-4 py-3 text-right text-sm text-slate-500">آخر نشاط</th>
                      <th className="px-4 py-3 text-center text-sm text-slate-500">فائز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((user, i) => (
                      <tr
                        key={user.id}
                        className={`border-t ${user.selected ? 'bg-amber-50' : ''} ${
                          i < 3 ? 'font-medium' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{user.displayName}</div>
                          {user.email && (
                            <div className="text-xs text-slate-400">{user.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-amber-600">{user.score}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{user.platform || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{user.lastActive || '-'}</td>
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
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-bold text-amber-700 mb-3">
                🏆 فائزو شهر {config.currentMonth}
              </h3>
              <div className="space-y-2">
                {config.currentWinners.map((w, i) => (
                  <div key={w.userId} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <span className="font-medium">{w.displayName || w.userId.slice(0, 8)}</span>
                    </div>
                    <div className="text-sm text-slate-500">
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
          <div className="bg-white p-5 rounded-xl border">
            <h3 className="font-bold text-slate-700 mb-4">الإعدادات العامة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">عدد الفائزين</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.winnersCount}
                  onChange={e => setConfig(prev => ({ ...prev, winnersCount: Number(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                  aria-label="عدد الفائزين"
                  title="عدد الفائزين"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">مدة المكافأة (أيام)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={config.rewardDurationDays}
                  onChange={e => setConfig(prev => ({ ...prev, rewardDurationDays: Number(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                  aria-label="مدة المكافأة"
                  title="مدة المكافأة"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border">
            <h3 className="font-bold text-slate-700 mb-4">أوزان النقاط</h3>
            <p className="text-sm text-slate-500 mb-4">كل نشاط يمنح نقاط حسب الوزن المحدد</p>
            <div className="space-y-3">
              {Object.entries(config.scoreWeights).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-28 text-sm text-slate-600">{WEIGHT_LABELS[key] || key}</span>
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
                  <span className="w-8 text-center font-bold text-amber-600">{value}</span>
                </div>
              ))}
            </div>
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
            <div className="space-y-4">
              {config.history.map((entry, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-700">شهر {entry.month}</h3>
                    <span className="text-xs text-slate-400">
                      {entry.selectedBy === 'auto' ? 'اختيار تلقائي' : 'اختيار يدوي'} —{' '}
                      {new Date(entry.selectedAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {entry.winners.map((w, i) => (
                      <div key={w.userId} className="flex items-center justify-between text-sm">
                        <span>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}{' '}
                          {w.displayName || w.userId.slice(0, 8)}
                        </span>
                        <span className="text-amber-600 font-medium">{w.score} نقطة</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
