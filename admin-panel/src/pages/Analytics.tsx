// admin-panel/src/pages/Analytics.tsx
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  Smartphone,
  Globe,
  BookOpen,
  Moon,
  Download,
  Loader2,
  Activity,
  Target
} from 'lucide-react';

const Analytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const stats = {
    totalUsers: 45680,
    activeUsers: 12450,
    avgSessionDuration: 8.5,
    retentionRate: 68.5,
    totalAzkar: 2450000,
    totalQuran: 1250000,
    totalPrayers: 3200000
  };

  const topCountries = [
    { country: 'مصر', flag: '🇪🇬', users: 12500, percentage: 27.4 },
    { country: 'السعودية', flag: '🇸🇦', users: 9800, percentage: 21.5 },
    { country: 'الإمارات', flag: '🇦🇪', users: 4200, percentage: 9.2 },
    { country: 'الكويت', flag: '🇰🇼', users: 3100, percentage: 6.8 },
    { country: 'الأردن', flag: '🇯🇴', users: 2200, percentage: 4.8 },
  ];

  const topAzkar = [
    { name: 'أذكار الصباح', count: 450000, percentage: 28.5 },
    { name: 'أذكار المساء', count: 420000, percentage: 26.6 },
    { name: 'أذكار النوم', count: 280000, percentage: 17.7 },
    { name: 'أذكار الصلاة', count: 195000, percentage: 12.3 },
  ];

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
            className="px-4 py-2 border rounded-lg"
          >
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يوم</option>
            <option value="year">آخر سنة</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
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
              <p className="text-sm text-gray-500">إجمالي المستخدمين</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalUsers.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>12.5% من الشهر الماضي</span>
              </div>
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
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>8.3% من الأسبوع الماضي</span>
              </div>
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
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>5.2%</span>
              </div>
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
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>2.1%</span>
              </div>
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

        {/* Top Azkar */}
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
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${azkar.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-600" />
          توزيع المنصات
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600"> iOS</span>
              <span className="font-medium">24,800 (54%)</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '54%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">🤖 Android</span>
              <span className="font-medium">20,880 (46%)</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '46%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
