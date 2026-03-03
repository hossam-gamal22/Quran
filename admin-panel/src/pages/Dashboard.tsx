// admin-panel/src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Activity,
  Clock,
  Eye,
  BookOpen,
  Moon,
  TrendingUp,
  RefreshCw,
  Sparkles,
  FileText,
  Bell,
  Palette,
  Calendar,
  Settings,
  CheckCircle,
  Star,
  Globe
} from 'lucide-react';

// ==================== البيانات ====================

const INITIAL_STATS = {
  totalUsers: 15420,
  activeUsers: 8750,
  dailyActiveUsers: 2340,
  avgSessionDuration: 8.5,
  totalAzkarRead: 125000,
  totalQuranPages: 89000,
  totalPrayers: 156000
};

const INITIAL_ACTIVITY = [
  { id: '1', type: 'user', description: 'مستخدم جديد من مصر', time: 'منذ دقيقة', country: '🇪🇬' },
  { id: '2', type: 'azkar', description: 'أذكار الصباح الأكثر قراءة اليوم', time: 'منذ 5 دقائق' },
  { id: '3', type: 'quran', description: '50 مستخدم أكملوا سورة الكهف', time: 'منذ 15 دقيقة' },
  { id: '4', type: 'prayer', description: 'زيادة 15% في تسجيل الصلوات', time: 'منذ ساعة' },
  { id: '5', type: 'share', description: '200 مشاركة لآية الكرسي', time: 'منذ ساعتين' },
];

const QUICK_ACTIONS = [
  { id: '1', title: 'شاشات البداية', icon: Sparkles, path: '/splash-screens', color: 'bg-purple-500/20 text-purple-400' },
  { id: '2', title: 'إدارة المحتوى', icon: FileText, path: '/content', color: 'bg-blue-500/20 text-blue-400' },
  { id: '3', title: 'الإشعارات', icon: Bell, path: '/notifications', color: 'bg-amber-500/20 text-amber-400' },
  { id: '4', title: 'الثيمات', icon: Palette, path: '/themes', color: 'bg-pink-500/20 text-pink-400' },
  { id: '5', title: 'المحتوى الموسمي', icon: Calendar, path: '/seasonal', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: '6', title: 'الإعدادات', icon: Settings, path: '/settings', color: 'bg-slate-500/20 text-slate-400' },
];

// ==================== المكونات ====================

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  change?: number;
  suffix?: string;
}> = ({ title, value, icon, iconBg, change, suffix }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-lg text-slate-400 mr-1">{suffix}</span>}
        </p>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-sm text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span>{change}% من الأسبوع الماضي</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>
        {icon}
      </div>
    </div>
  </div>
);

// ==================== المكون الرئيسي ====================

const Dashboard: React.FC = () => {
  const [stats] = useState(INITIAL_STATS);
  const [activity] = useState(INITIAL_ACTIVITY);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-slate-400 mt-1">مرحباً بك في لوحة تحكم روح المسلم</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
          </span>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={stats.totalUsers}
          icon={<Users className="w-6 h-6 text-blue-400" />}
          iconBg="bg-blue-500/20"
          change={12}
        />
        <StatCard
          title="المستخدمين النشطين"
          value={stats.activeUsers}
          icon={<Activity className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/20"
          change={8}
        />
        <StatCard
          title="المستخدمين اليوم"
          value={stats.dailyActiveUsers}
          icon={<Eye className="w-6 h-6 text-amber-400" />}
          iconBg="bg-amber-500/20"
          change={3}
        />
        <StatCard
          title="متوسط مدة الجلسة"
          value={stats.avgSessionDuration}
          suffix="د"
          icon={<Clock className="w-6 h-6 text-purple-400" />}
          iconBg="bg-purple-500/20"
          change={5}
        />
      </div>

      {/* Stats Row 2 */}
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
          icon={<BookOpen className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/20"
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
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50">
            <h2 className="text-lg font-bold text-white mb-4">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map(action => (
                <Link
                  key={action.id}
                  to={action.path}
                  className="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:border-emerald-500/30 hover:bg-slate-700/50 transition-all"
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

        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-4">النشاط الأخير</h2>
          <div className="space-y-3">
            {activity.map(item => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-slate-700/50 last:border-0">
                <div className="mt-1">
                  {item.type === 'user' && <Users className="w-4 h-4 text-blue-400" />}
                  {item.type === 'azkar' && <Moon className="w-4 h-4 text-purple-400" />}
                  {item.type === 'quran' && <BookOpen className="w-4 h-4 text-emerald-400" />}
                  {item.type === 'prayer' && <Clock className="w-4 h-4 text-amber-400" />}
                  {item.type === 'share' && <Globe className="w-4 h-4 text-pink-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{item.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                </div>
                {item.country && <span className="text-lg">{item.country}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status & App Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">حالة النظام</h2>
            <span className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              كل شيء يعمل
            </span>
          </div>
          <div className="space-y-2">
            {['API', 'قاعدة البيانات', 'الإشعارات', 'CDN'].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-slate-400">{item}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm text-emerald-400">يعمل</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-4">معلومات التطبيق</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">الإصدار الحالي</span>
              <span className="font-medium text-white">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">آخر تحديث</span>
              <span className="font-medium text-white">2 مارس 2026</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">وضع الصيانة</span>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">معطل</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">الإعلانات</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">مفعّلة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Distribution */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50">
        <h2 className="text-lg font-bold text-white mb-4">توزيع المستخدمين</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400"> iOS</span>
              <span className="font-medium text-white">8,500 (55%)</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '55%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">🤖 Android</span>
              <span className="font-medium text-white">6,920 (45%)</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
