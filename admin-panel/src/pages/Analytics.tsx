import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Styled } from '../components/Styled';
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
  Target
} from 'lucide-react';

interface AppStats {
  totalUsers: number;
  activeUsers: number;
  avgSessionDuration: number;
  retentionRate: number;
  totalAzkar: number;
  totalQuran: number;
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
  avgSessionDuration: 0,
  retentionRate: 0,
  totalAzkar: 0,
  totalQuran: 0,
  totalPrayers: 0,
};

const Analytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [stats, setStats] = useState<AppStats>(DEFAULT_STATS);
  const [topCountries, setTopCountries] = useState<CountryStat[]>([]);
  const [topAzkar, setTopAzkar] = useState<AzkarStat[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStats>({ ios: 0, android: 0 });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Load main stats from config/analytics doc
      const statsSnap = await getDoc(doc(db, 'config', 'analytics'));
      if (statsSnap.exists()) {
        const data = statsSnap.data();
        setStats({ ...DEFAULT_STATS, ...data.stats });
        if (data.topCountries) setTopCountries(data.topCountries);
        if (data.topAzkar) setTopAzkar(data.topAzkar);
        if (data.platforms) setPlatforms(data.platforms);
      }

      // Also try loading from stats collection for aggregated data
      const statsCollection = await getDocs(collection(db, 'stats'));
      if (!statsCollection.empty) {
        let totalUsers = 0;
        let activeUsers = 0;
        statsCollection.forEach(docSnap => {
          const d = docSnap.data();
          if (d.totalUsers) totalUsers += d.totalUsers;
          if (d.activeUsers) activeUsers += d.activeUsers;
        });
        if (totalUsers > 0) {
          setStats(prev => ({
            ...prev,
            totalUsers: totalUsers || prev.totalUsers,
            activeUsers: activeUsers || prev.activeUsers,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const data = { stats, topCountries, topAzkar, platforms, exportedAt: new Date().toISOString() };
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
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            التحليلات والإحصائيات
          </h1>
          <p className="text-gray-500 mt-1">نظرة شاملة على أداء التطبيق</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            aria-label="نطاق التاريخ"
            className="px-4 py-2 border rounded-lg"
          >
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يوم</option>
            <option value="year">آخر سنة</option>
          </select>
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Download className="w-4 h-4" />
            تصدير
          </button>
        </div>
      </div>

      {stats.totalUsers === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          لم يتم العثور على بيانات تحليلية. سيتم تحديث الإحصائيات تلقائياً عند بدء استخدام التطبيق.
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي المستخدمين</p>
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
              <p className="text-sm text-gray-500">المستخدمين النشطين</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.activeUsers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">متوسط الجلسة</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.avgSessionDuration} د</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">معدل الاحتفاظ</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.retentionRate}%</p>
            </div>
            <div className="p-3 bg-pink-100 rounded-xl">
              <Target className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Moon className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-600">الأذكار المقروءة</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.totalAzkar.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-gray-600">صفحات القرآن</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.totalQuran.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-600">الصلوات المسجلة</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.totalPrayers.toLocaleString()}</p>
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
