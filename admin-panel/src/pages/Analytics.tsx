import React, { useState, useEffect } from 'react';
import { Styled } from '../components/Styled';
import {
  fetchActiveDevices,
  fetchActiveUsersLifetimeEngagement,
  subscribeActiveDevices,
  type ActiveDevicesResult,
  type LifetimeEngagement,
} from '../utils/user-query';
import { collection, collectionGroup, getDocs, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  BarChart3,
  Users,
  Clock,
  Smartphone,
  Globe,
  BookOpen,
  Moon,
  Download,
  Loader2,
  Activity,
  Target,
  TrendingUp
} from 'lucide-react';

interface AppStats {
  totalUsers: number;
  activeUsers: number;
  appOpens: number;
  retentionRate: number;
  totalAzkar: number;
  totalTasbih: number;
  totalPrayers: number;
}

interface CountryStat {
  country: string;
  flag: string;
  users: number;
  percentage: number;
}

interface AzkarStat {
  name: string;
  count: number;
  percentage: number;
}

interface PlatformStats {
  ios: number;
  android: number;
}

const DEFAULT_STATS: AppStats = {
  totalUsers: 0,
  activeUsers: 0,
  appOpens: 0,
  retentionRate: 0,
  totalAzkar: 0,
  totalTasbih: 0,
  totalPrayers: 0,
};

const COUNTRY_FLAGS: Record<string, string> = {
  SA: '🇸🇦', EG: '🇪🇬', AE: '🇦🇪', MA: '🇲🇦', DZ: '🇩🇿', TN: '🇹🇳',
  IQ: '🇮🇶', SY: '🇸🇾', JO: '🇯🇴', LB: '🇱🇧', KW: '🇰🇼', QA: '🇶🇦',
  BH: '🇧🇭', OM: '🇴🇲', YE: '🇾🇪', ID: '🇮🇩', PK: '🇵🇰', TR: '🇹🇷',
  IN: '🇮🇳', BD: '🇧🇩', MY: '🇲🇾', GB: '🇬🇧', US: '🇺🇸', DE: '🇩🇪',
  FR: '🇫🇷', RU: '🇷🇺', SG: '🇸🇬',
};

type DateRange = 'today' | 'week' | 'month' | 'year';

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'اليوم',
  week: 'آخر 7 أيام',
  month: 'آخر 30 يوم',
  year: 'آخر سنة',
};

const getRangeStart = (range: DateRange): Date => {
  const now = new Date();
  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
  start.setTime(now.getTime() - days * 24 * 60 * 60 * 1000);
  return start;
};

const getActivityStatsForRange = async (range: DateRange) => {
  const start = getRangeStart(range);
  const snapshot = await getDocs(query(
    collection(db, 'activity'),
    where('timestamp', '>=', Timestamp.fromDate(start))
  ));

  const activeUserIds = new Set<string>();
  let appOpens = 0;
  let azkar = 0;
  let tasbih = 0;
  let prayers = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const userId = typeof data.userId === 'string' ? data.userId : '';
    if (userId) activeUserIds.add(userId);

    if (data.type === 'app_open') appOpens += 1;
    if (data.type === 'azkar') azkar += 1;
    if (data.type === 'prayer') prayers += 1;
    if (data.type === 'tasbih') tasbih += Number(data.count) || 1;
  });

  return {
    activeUsers: activeUserIds.size,
    appOpens,
    azkar,
    tasbih,
    prayers,
  };
};

const buildActivityStats = (
  docs: Array<{ data: () => Record<string, any> }>
) => {
  const activeUserIds = new Set<string>();
  let appOpens = 0;
  let azkar = 0;
  let tasbih = 0;
  let prayers = 0;

  docs.forEach((docSnap) => {
    const data = docSnap.data();
    const userId = typeof data.userId === 'string' ? data.userId : '';
    if (userId) activeUserIds.add(userId);

    if (data.type === 'app_open') appOpens += 1;
    if (data.type === 'azkar') azkar += 1;
    if (data.type === 'prayer') prayers += 1;
    if (data.type === 'tasbih') tasbih += Number(data.count) || 1;
  });

  return {
    activeUsers: activeUserIds.size,
    appOpens,
    azkar,
    tasbih,
    prayers,
  };
};

const Analytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [stats, setStats] = useState<AppStats>(DEFAULT_STATS);
  const [topCountries, setTopCountries] = useState<CountryStat[]>([]);
  const [topAzkar] = useState<AzkarStat[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStats>({ ios: 0, android: 0 });
  const [lifetime, setLifetime] = useState<LifetimeEngagement>({ totalAzkar: 0, totalQuran: 0, totalPrayers: 0 });

  // Live SSOT load — both demographics + engagement
  useEffect(() => {
    setIsLoading(true);
    let mounted = true;
    let latestDevices: ActiveDevicesResult | null = null;
    let latestActivity: Awaited<ReturnType<typeof getActivityStatsForRange>> | null = null;
    let latestLifetimeByUser: Record<string, LifetimeEngagement> | null = null;
    let lifetimeRequestId = 0;

    const applyStats = () => {
      if (!mounted || !latestDevices || !latestActivity) return;
      const deviceStats = latestDevices.stats;
      const sortedCountries = Object.entries(deviceStats.storeByCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([code, count]) => ({
          country: code,
          flag: COUNTRY_FLAGS[code] || '🌍',
          users: count,
          percentage: deviceStats.storeRegistered > 0 ? Math.round((count / deviceStats.storeRegistered) * 100) : 0,
        }));

      setStats({
        totalUsers: deviceStats.storeRegistered,
        activeUsers: latestActivity.activeUsers,
        appOpens: latestActivity.appOpens,
        retentionRate: deviceStats.storeRegistered > 0
          ? Math.round((latestActivity.activeUsers / deviceStats.storeRegistered) * 100)
          : 0,
        totalAzkar: latestActivity.azkar,
        totalTasbih: latestActivity.tasbih,
        totalPrayers: latestActivity.prayers,
      });
      setPlatforms({ ios: deviceStats.storeIos, android: deviceStats.storeAndroid });
      setTopCountries(sortedCountries);
      setIsLoading(false);
    };

    const applyLifetime = () => {
      if (!mounted || !latestDevices || !latestLifetimeByUser) return;
      const activeUserIds = new Set(latestDevices.users.map(u => u.id));
      let totalAzkar = 0;
      let totalQuran = 0;
      let totalPrayers = 0;

      Object.entries(latestLifetimeByUser).forEach(([userId, userLifetime]) => {
        if (!activeUserIds.has(userId)) return;
        totalAzkar += userLifetime.totalAzkar;
        totalQuran += userLifetime.totalQuran;
        totalPrayers += userLifetime.totalPrayers;
      });

      setLifetime({ totalAzkar, totalQuran, totalPrayers });
    };

    const refreshLifetime = async (result: ActiveDevicesResult) => {
      const requestId = ++lifetimeRequestId;
      try {
        const userIds = result.users.map(u => u.id);
        const lifetimeData = await fetchActiveUsersLifetimeEngagement(userIds);
        if (mounted && requestId === lifetimeRequestId) {
          setLifetime(lifetimeData);
        }
      } catch (error) {
        console.error('Error loading lifetime engagement:', error);
      }
    };

    const unsubscribeDevices = subscribeActiveDevices(
      (result) => {
        latestDevices = result;
        applyStats();
        applyLifetime();
      },
      (error) => {
        console.error('Error listening to device stats:', error);
        loadDeviceStats();
      }
    );

    const start = getRangeStart(dateRange);
    const unsubscribeActivity = onSnapshot(
      query(
        collection(db, 'activity'),
        where('timestamp', '>=', Timestamp.fromDate(start))
      ),
      (snapshot) => {
        latestActivity = buildActivityStats(snapshot.docs);
        applyStats();
      },
      (error) => {
        console.error('Error listening to activity stats:', error);
        loadDeviceStats();
      }
    );

    const unsubscribeLifetime = onSnapshot(
      collectionGroup(db, 'stats'),
      (snapshot) => {
        const nextLifetimeByUser: Record<string, LifetimeEngagement> = {};
        snapshot.docs.forEach((docSnap) => {
          if (docSnap.id !== 'lifetime') return;
          const userId = docSnap.ref.parent.parent?.id;
          if (!userId) return;
          const data = docSnap.data();
          nextLifetimeByUser[userId] = {
            totalAzkar: Number(data.azkarRead) || 0,
            totalQuran: Number(data.quranPages) || 0,
            totalPrayers: Number(data.prayers) || 0,
          };
        });
        latestLifetimeByUser = nextLifetimeByUser;
        applyLifetime();
      },
      (error) => {
        console.error('Error listening to lifetime engagement:', error);
        if (latestDevices) refreshLifetime(latestDevices);
      }
    );

    return () => {
      mounted = false;
      unsubscribeDevices();
      unsubscribeActivity();
      unsubscribeLifetime();
    };
  }, [dateRange]);

  const loadDeviceStats = async () => {
    setIsLoading(true);
    try {
      // SSOT: unified query — all active devices with valid FCM tokens, deduplicated
      const { users, stats: deviceStats } = await fetchActiveDevices();

      const sortedCountries = Object.entries(deviceStats.storeByCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([code, count]) => ({
          country: code,
          flag: COUNTRY_FLAGS[code] || '🌍',
          users: count,
          percentage: deviceStats.storeRegistered > 0 ? Math.round((count / deviceStats.storeRegistered) * 100) : 0,
        }));

      const activityStats = await getActivityStatsForRange(dateRange);

      setStats({
        totalUsers: deviceStats.storeRegistered,
        activeUsers: activityStats.activeUsers,
        appOpens: activityStats.appOpens,
        retentionRate: deviceStats.storeRegistered > 0
          ? Math.round((activityStats.activeUsers / deviceStats.storeRegistered) * 100)
          : 0,
        totalAzkar: activityStats.azkar,
        totalTasbih: activityStats.tasbih,
        totalPrayers: activityStats.prayers,
      });
      setPlatforms({ ios: deviceStats.storeIos, android: deviceStats.storeAndroid });
      if (sortedCountries.length > 0) setTopCountries(sortedCountries);

      // Lifetime engagement — from users/{uid}/stats/lifetime subcollection
      const userIds = users.map(u => u.id);
      const lifetimeData = await fetchActiveUsersLifetimeEngagement(userIds);
      setLifetime(lifetimeData);
    } catch (error) {
      console.error('Error loading device stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const data = { dateRange, rangeLabel: RANGE_LABELS[dateRange], stats, topCountries, topAzkar, platforms, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPlatformUsers = platforms.ios + platforms.android;
  const iosPercent = totalPlatformUsers > 0 ? Math.round((platforms.ios / totalPlatformUsers) * 100) : 0;
  const androidPercent = totalPlatformUsers > 0 ? 100 - iosPercent : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="mr-2 text-gray-600">جاري تحميل التحليلات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            التحليلات والإحصائيات
          </h1>
          <p className="text-slate-300 mt-1">نظرة شاملة على أداء التطبيق</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            aria-label="نطاق التاريخ"
            className="px-4 py-2 border rounded-lg"
          >
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يوم</option>
            <option value="year">آخر سنة</option>
          </select>
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-accent-dark text-white rounded-lg hover:bg-accent-dark">
            <Download className="w-4 h-4" />
            تصدير
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">مسجلون من المتاجر</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">مستخدمون فتحوا التطبيق</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.activeUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{RANGE_LABELS[dateRange]}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">مرات فتح التطبيق</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.appOpens.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{RANGE_LABELS[dateRange]}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">نسبة النشاط</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.retentionRate}%</p>
              <p className="text-xs text-gray-400 mt-1">من مسجلي المتاجر في {RANGE_LABELS[dateRange]}</p>
            </div>
            <div className="p-3 bg-pink-100 rounded-xl">
              <Target className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Stats — SSOT: strictly from active users only */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          تفاعل المستخدمين
          <span className="text-xs font-normal text-gray-400 mr-1">(من سجل النشاط — {RANGE_LABELS[dateRange]})</span>
        </h2>

        {/* Range Engagement */}
        <p className="text-sm text-gray-500 mb-2 font-medium">📅 {RANGE_LABELS[dateRange]}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Moon className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-gray-600">الأذكار المقروءة</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalAzkar.toLocaleString()}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-gray-600">التسبيحات المسجلة</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalTasbih.toLocaleString()}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-gray-600">الصلوات المسجلة</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalPrayers.toLocaleString()}</p>
          </div>
        </div>

        {/* Lifetime Engagement */}
        <p className="text-sm text-gray-500 mb-2 font-medium">📊 إجمالي (كل الأوقات)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-5 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Moon className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-500">الأذكار المقروءة</span>
            </div>
            <p className="text-3xl font-bold text-gray-700">{lifetime.totalAzkar.toLocaleString()}</p>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-gray-500">صفحات القرآن</span>
            </div>
            <p className="text-3xl font-bold text-gray-700">{lifetime.totalQuran.toLocaleString()}</p>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-gray-500">الصلوات المسجلة</span>
            </div>
            <p className="text-3xl font-bold text-gray-700">{lifetime.totalPrayers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        {topCountries.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              أعلى الدول
            </h3>
            <div className="space-y-3">
              {topCountries.map((country, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl">{country.flag}</span>
                  <span className="flex-1 font-medium">{country.country}</span>
                  <span className="text-gray-600">{country.users.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 w-12 text-left">{country.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Azkar */}
        {topAzkar.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-600" />
              أكثر الأذكار قراءة
            </h3>
            <div className="space-y-3">
              {topAzkar.map((azkar, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{azkar.name}</span>
                    <span className="text-gray-600">{azkar.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <Styled
                      className="h-full bg-purple-500 rounded-full"
                      css={{ width: `${azkar.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Platform Distribution */}
      {totalPlatformUsers > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            توزيع المنصات
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600"> iOS</span>
                <span className="font-medium">{platforms.ios.toLocaleString()} ({iosPercent}%)</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <Styled className="h-full bg-blue-500 rounded-full" css={{ width: `${iosPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">🤖 Android</span>
                <span className="font-medium">{platforms.android.toLocaleString()} ({androidPercent}%)</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <Styled className="h-full bg-green-500 rounded-full" css={{ width: `${androidPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
