// admin-panel/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Activity, Clock, Eye, BookOpen, Moon, TrendingUp, RefreshCw,
  Sparkles, FileText, Bell, Palette, Calendar, Settings, CheckCircle, Star, Globe, AlertCircle,
  Heart, HandMetal
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Styled } from '../components/Styled';
import { fetchActiveDevices } from '../utils/user-query';

// ✅ استخدام jsDelivr CDN بدل raw.githubusercontent (يحل مشكلة CORS)
const AZKAR_JSON_URL = 'https://cdn.jsdelivr.net/gh/hossam-gamal22/Quran@main/data/json/azkar.json';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  avgSessionDuration: number;
  totalAzkar: number;
  totalAzkarRead: number;
  totalQuranPages: number;
  totalPrayers: number;
  iosUsers: number;
  androidUsers: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  time: string;
  country?: string;
}

const QUICK_ACTIONS = [
  { id: '1', title: 'شاشات البداية', icon: Sparkles, path: '/splash-screens', color: 'bg-purple-500/20 text-purple-400' },
  { id: '2', title: 'إدارة المحتوى', icon: FileText, path: '/content', color: 'bg-blue-500/20 text-blue-400' },
  { id: '3', title: 'الأذكار', icon: Moon, path: '/azkar', color: 'bg-accent/20 text-accent-light' },
  { id: '4', title: 'الإشعارات', icon: Bell, path: '/notifications', color: 'bg-amber-500/20 text-amber-400' },
  { id: '5', title: 'المستخدمين', icon: Users, path: '/users', color: 'bg-pink-500/20 text-pink-400' },
  { id: '6', title: 'الإعدادات', icon: Settings, path: '/settings', color: 'bg-admin-muted/20 text-slate-400' },
];

/** Generate a human-readable Arabic description from activity doc fields */
const getActivityDescription = (data: Record<string, any>): string => {
  switch (data.type) {
    case 'azkar':
      return data.category ? `قراءة ذكر — ${data.category}` : 'قراءة ذكر';
    case 'quran':
      return data.surahName ? `قراءة ${data.surahName}` : 'قراءة صفحة قرآن';
    case 'prayer':
      return data.prayerName
        ? `تسجيل صلاة ${data.prayerName}${data.onTime ? ' ✓' : ''}`
        : 'تسجيل صلاة';
    case 'tasbih':
      return data.count ? `تسبيح ${data.count} مرة` : 'تسبيح';
    case 'khatma':
      return data.surahName
        ? `تقدم في الختمة — ${data.surahName} (${data.progressPercent || 0}%)`
        : 'تقدم في الختمة';
    case 'app_open':
      return 'فتح التطبيق';
    default:
      return '';
  }
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    dailyActiveUsers: 0,
    avgSessionDuration: 0,
    totalAzkar: 0,
    totalAzkarRead: 0,
    totalQuranPages: 0,
    totalPrayers: 0,
    iosUsers: 0,
    androidUsers: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [azkarLoaded, setAzkarLoaded] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    let totalAzkar = 0;

    // 1. تحميل عدد الأذكار من GitHub JSON (عبر jsDelivr)
    try {
      const azkarResponse = await fetch(AZKAR_JSON_URL, {
        headers: { 'Accept': 'application/json' }
      });
      if (azkarResponse.ok) {
        const azkarData = await azkarResponse.json();
        totalAzkar = azkarData.totalCount || azkarData.azkar?.length || 0;
        setAzkarLoaded(true);
      }
    } catch (azkarError) {
      console.error('Error loading azkar JSON:', azkarError);
      setAzkarLoaded(false);
    }

    // 2. محاولة تحميل البيانات من Firebase
    let usersData = { total: 0, active: 0, daily: 0, ios: 0, android: 0 };
    let statsData = { azkarRead: 0, quranPages: 0, prayers: 0, avgSession: 0 };
    let activityData: ActivityItem[] = [];

    try {
      // تحميل المستخدمين (SSOT: unified query + dedup)
      const { stats: deviceStats } = await fetchActiveDevices();

      usersData = {
        total: deviceStats.total,
        active: deviceStats.active,
        daily: deviceStats.daily,
        ios: deviceStats.ios,
        android: deviceStats.android,
      };

      // تحميل الإحصائيات
      const statsSnapshot = await getDocs(collection(db, 'stats'));
      if (!statsSnapshot.empty) {
        const statsDoc = statsSnapshot.docs[0].data();
        statsData = {
          azkarRead: statsDoc.totalAzkarRead || 0,
          quranPages: statsDoc.totalQuranPages || 0,
          prayers: statsDoc.totalPrayers || 0,
          avgSession: statsDoc.avgSessionDuration || 0,
        };
      }

      // تحميل آخر النشاطات
      try {
        const activitySnapshot = await getDocs(
          query(collection(db, 'activity'), orderBy('timestamp', 'desc'), limit(20))
        );
        activityData = activitySnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: data.type || 'user',
              description: data.description || getActivityDescription(data),
              time: data.timestamp ? formatTimeAgo(data.timestamp.toDate()) : 'منذ قليل',
              country: data.country,
            };
          })
          .filter(item => item.type !== 'app_open' && item.description.trim().length > 0)
          .slice(0, 8);
      } catch (e) {
        console.log('Activity collection not found or empty');
      }

      setFirebaseConnected(true);
    } catch (firebaseError) {
      console.log('Firebase error:', firebaseError);
      setFirebaseConnected(false);
    }

    // تعيين البيانات النهائية
    setStats({
      totalUsers: usersData.total,
      activeUsers: usersData.active,
      dailyActiveUsers: usersData.daily,
      avgSessionDuration: statsData.avgSession,
      totalAzkar: totalAzkar,
      totalAzkarRead: statsData.azkarRead,
      totalQuranPages: statsData.quranPages,
      totalPrayers: statsData.prayers,
      iosUsers: usersData.ios,
      androidUsers: usersData.android,
    });

    // النشاط الافتراضي إذا لم يوجد
    if (activityData.length === 0) {
      activityData = [
        { id: '1', type: 'info', description: 'لا توجد أنشطة حديثة بعد', time: 'الآن' },
      ];
    }
    setActivity(activityData);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    iconBg: string;
    subtitle?: string;
  }> = ({ title, value, icon, iconBg, subtitle }) => (
    <div className="bg-admin-surface/50 backdrop-blur-sm p-5 rounded-2xl border border-admin-border/50 hover:border-accent/30 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-slate-400 mt-1">
            {firebaseConnected ? '🟢 متصل بـ Firebase' : '🟡 وضع العرض - Firebase غير مُعد'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
          </span>
          <button
            onClick={loadAllData}
            disabled={isLoading}
            aria-label="تحديث البيانات"
            title="تحديث البيانات"
            className="flex items-center gap-2 px-4 py-2 bg-accent-dark hover:bg-accent-dark rounded-xl text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Stats Row 1 - Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={stats.totalUsers}
          icon={<Users className="w-6 h-6 text-blue-400" />}
          iconBg="bg-blue-500/20"
          subtitle={stats.totalUsers === 0 ? "انتظار النشر" : undefined}
        />
        <StatCard
          title="المستخدمين النشطين"
          value={stats.activeUsers}
          icon={<Activity className="w-6 h-6 text-accent-light" />}
          iconBg="bg-accent/20"
          subtitle="آخر 7 أيام"
        />
        <StatCard
          title="المستخدمين اليوم"
          value={stats.dailyActiveUsers}
          icon={<Eye className="w-6 h-6 text-amber-400" />}
          iconBg="bg-amber-500/20"
        />
        <StatCard
          title="الأذكار المتاحة"
          value={stats.totalAzkar}
          icon={<Moon className="w-6 h-6 text-purple-400" />}
          iconBg="bg-purple-500/20"
          subtitle={azkarLoaded ? "من ملف JSON ✅" : "جاري التحميل..."}
        />
      </div>

      {/* Stats Row 2 - Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="الأذكار المقروءة"
          value={stats.totalAzkarRead}
          icon={<Star className="w-6 h-6 text-yellow-400" />}
          iconBg="bg-yellow-500/20"
        />
        <StatCard
          title="صفحات القرآن"
          value={stats.totalQuranPages}
          icon={<BookOpen className="w-6 h-6 text-accent-light" />}
          iconBg="bg-accent/20"
        />
        <StatCard
          title="الصلوات المسجلة"
          value={stats.totalPrayers}
          icon={<Clock className="w-6 h-6 text-blue-400" />}
          iconBg="bg-blue-500/20"
        />
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-admin-surface/50 backdrop-blur-sm p-6 rounded-2xl border border-admin-border/50">
            <h2 className="text-lg font-bold text-white mb-4">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map(action => (
                <Link
                  key={action.id}
                  to={action.path}
                  className="flex items-center gap-3 p-4 rounded-xl bg-admin-surface-light/30 border border-admin-border/30 hover:border-accent/30 hover:bg-admin-surface-light/50 transition-all"
                >
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-slate-300">{action.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-admin-surface/50 backdrop-blur-sm p-6 rounded-2xl border border-admin-border/50">
          <h2 className="text-lg font-bold text-white mb-4">النشاط الأخير</h2>
          <div className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">لا يوجد نشاط حالي</p>
            ) : (
              activity.map(item => (
                <div key={item.id} className="flex items-start gap-3 py-2 border-b border-admin-border/50 last:border-0">
                  <div className="mt-1">
                    {item.type === 'user' && <Users className="w-4 h-4 text-blue-400" />}
                    {item.type === 'azkar' && <Moon className="w-4 h-4 text-purple-400" />}
                    {item.type === 'quran' && <BookOpen className="w-4 h-4 text-accent-light" />}
                    {item.type === 'prayer' && <Clock className="w-4 h-4 text-blue-400" />}
                    {item.type === 'tasbih' && <Heart className="w-4 h-4 text-pink-400" />}
                    {item.type === 'khatma' && <Star className="w-4 h-4 text-yellow-400" />}
                    {item.type === 'info' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">{item.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                  </div>
                  {item.country && <span className="text-lg">{item.country}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Platform Distribution */}
      {stats.totalUsers > 0 && (
        <div className="bg-admin-surface/50 backdrop-blur-sm p-6 rounded-2xl border border-admin-border/50">
          <h2 className="text-lg font-bold text-white mb-4">توزيع المستخدمين</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400"> iOS</span>
                <span className="font-medium text-white">
                  {stats.iosUsers.toLocaleString()} ({stats.totalUsers > 0 ? Math.round((stats.iosUsers / stats.totalUsers) * 100) : 0}%)
                </span>
              </div>
              <div className="h-3 bg-admin-surface-light rounded-full overflow-hidden">
                <Styled 
                  className="h-full bg-blue-500 rounded-full transition-all" 
                  css={{ width: `${stats.totalUsers > 0 ? (stats.iosUsers / stats.totalUsers) * 100 : 0}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">🤖 Android</span>
                <span className="font-medium text-white">
                  {stats.androidUsers.toLocaleString()} ({stats.totalUsers > 0 ? Math.round((stats.androidUsers / stats.totalUsers) * 100) : 0}%)
                </span>
              </div>
              <div className="h-3 bg-admin-surface-light rounded-full overflow-hidden">
                <Styled 
                  className="h-full bg-accent rounded-full transition-all" 
                  css={{ width: `${stats.totalUsers > 0 ? (stats.androidUsers / stats.totalUsers) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="bg-admin-surface/50 backdrop-blur-sm p-6 rounded-2xl border border-admin-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">حالة النظام</h2>
          <span className="flex items-center gap-2 text-sm text-accent-light">
            <CheckCircle className="w-4 h-4" />
            جاهز للنشر
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'ملف الأذكار', status: azkarLoaded },
            { name: 'Firebase', status: firebaseConnected },
            { name: 'Admin Panel', status: true },
            { name: 'API', status: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 bg-admin-surface-light/30 rounded-lg">
              <span className="text-slate-400">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.status ? 'bg-accent' : 'bg-yellow-500'} animate-pulse`} />
                <span className={`text-sm ${item.status ? 'text-accent-light' : 'text-yellow-400'}`}>
                  {item.status ? 'يعمل' : 'انتظار'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
