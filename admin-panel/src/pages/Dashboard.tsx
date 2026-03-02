// admin-panel/src/pages/Dashboard.tsx
// لوحة التحكم الرئيسية - محدثة مع بيانات

import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Loader2,
  Star,
  Globe
} from 'lucide-react';

// ==================== الأنواع ====================

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  avgSessionDuration: number;
  totalAzkarRead: number;
  totalQuranPages: number;
  totalPrayers: number;
  totalSessions: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'azkar' | 'quran' | 'prayer' | 'share';
  description: string;
  time: string;
  country?: string;
}

interface SystemStatus {
  api: 'online' | 'offline' | 'degraded';
  database: 'online' | 'offline' | 'degraded';
  notifications: 'online' | 'offline' | 'degraded';
  cdn: 'online' | 'offline' | 'degraded';
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

// ==================== البيانات ====================

const INITIAL_STATS: DashboardStats = {
  totalUsers: 15420,
  activeUsers: 8750,
  dailyActiveUsers: 2340,
  avgSessionDuration: 8.5,
  totalAzkarRead: 125000,
  totalQuranPages: 89000,
  totalPrayers: 156000,
  totalSessions: 45600
};

const INITIAL_ACTIVITY: RecentActivity[] = [
  { id: '1', type: 'user', description: 'مستخدم جديد من مصر', time: 'منذ دقيقة', country: '🇪🇬' },
  { id: '2', type: 'azkar', description: 'أذكار الصباح الأكثر قراءة اليوم', time: 'منذ 5 دقائق' },
  { id: '3', type: 'quran', description: '50 مستخدم أكملوا سورة الكهف', time: 'منذ 15 دقيقة' },
  { id: '4', type: 'prayer', description: 'زيادة 15% في تسجيل الصلوات', time: 'منذ ساعة' },
  { id: '5', type: 'share', description: '200 مشاركة لآية الكرسي', time: 'منذ ساعتين' },
];

const INITIAL_STATUS: SystemStatus = {
  api: 'online',
  database: 'online',
  notifications: 'online',
  cdn: 'online'
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: '1', title: 'شاشات البداية', icon: <Sparkles className="w-5 h-5" />, path: '/splash-screens', color: 'bg-purple-100 text-purple-600' },
  { id: '2', title: 'إدارة المحتوى', icon: <FileText className="w-5 h-5" />, path: '/content', color: 'bg-blue-100 text-blue-600' },
  { id: '3', title: 'الإشعارات', icon: <Bell className="w-5 h-5" />, path: '/notifications', color: 'bg-amber-100 text-amber-600' },
  { id: '4', title: 'الثيمات', icon: <Palette className="w-5 h-5" />, path: '/themes', color: 'bg-pink-100 text-pink-600' },
  { id: '5', title: 'المحتوى الموسمي', icon: <Calendar className="w-5 h-5" />, path: '/seasonal', color: 'bg-emerald-100 text-emerald-600' },
  { id: '6', title: 'الإعدادات', icon: <Settings className="w-5 h-5" />, path: '/settings', color: 'bg-gray-100 text-gray-600' },
];

// ==================== المكونات ====================

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  change?: number;
  suffix?: string;
}> = ({ title, value, icon, color, change, suffix }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-lg text-gray-500 mr-1">{suffix}</span>}
        </p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${change < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(change)}% من الأسبوع الماضي</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const StatusIndicator: React.FC<{ status: 'online' | 'offline' | 'degraded'; label: string }> = ({ status, label }) => {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-amber-500'
  };
  const labels = {
    online: 'يعمل',
    offline: 'متوقف',
    degraded: 'بطيء'
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
        <span className={`text-sm ${status === 'online' ? 'text-green-600' : status === 'offline' ? 'text-red-600' : 'text-amber-600'}`}>
          {labels[status]}
        </span>
      </div>
    </div>
  );
};

// ==================== المكون الرئيسي ====================

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [activity, setActivity] = useState<RecentActivity[]>(INITIAL_ACTIVITY);
  const [status, setStatus] = useState<SystemStatus>(INITIAL_STATUS);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    // هنا يمكن إضافة API call حقيقي
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-gray-500 mt-1">مرحباً بك في لوحة تحكم روح المسلم</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
          </span>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={stats.totalUsers}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          color="bg-blue-100"
          change={12}
        />
        <StatCard
          title="المستخدمين النشطين"
          value={stats.activeUsers}
          icon={<Activity className="w-6 h-6 text-green-600" />}
          color="bg-green-100"
          change={8}
        />
        <StatCard
          title="المستخدمين اليوم"
          value={stats.dailyActiveUsers}
          icon={<Eye className="w-6 h-6 text-amber-600" />}
          color="bg-amber-100"
          change={3}
        />
        <StatCard
          title="متوسط مدة الجلسة"
          value={stats.avgSessionDuration}
          suffix="د"
          icon={<Clock className="w-6 h-6 text-purple-600" />}
          color="bg-purple-100"
          change={5}
        />
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="الأذكار المقروءة"
          value={stats.totalAzkarRead}
          icon={<Star className="w-6 h-6 text-emerald-600" />}
          color="bg-emerald-100"
        />
        <StatCard
          title="صفحات القرآن"
          value={stats.totalQuranPages}
          icon={<BookOpen className="w-6 h-6 text-amber-600" />}
          color="bg-amber-100"
        />
        <StatCard
          title="الصلوات المسجلة"
          value={stats.totalPrayers}
          icon={<Clock className="w-6 h-6 text-blue-600" />}
          color="bg-blue-100"
        />
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-bold text-gray-800 mb-4">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map(action => (
                <Link
                  key={action.id}
                  to={action.path}
                  className="flex items-center gap-3 p-4 rounded-xl border hover:shadow-md transition-all hover:-translate-y-1"
                >
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    {action.icon}
                  </div>
                  <span className="font-medium text-gray-700">{action.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-bold text-gray-800 mb-4">النشاط الأخير</h2>
          <div className="space-y-3">
            {activity.map(item => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className="mt-1">
                  {item.type === 'user' && <Users className="w-4 h-4 text-blue-500" />}
                  {item.type === 'azkar' && <Moon className="w-4 h-4 text-purple-500" />}
                  {item.type === 'quran' && <BookOpen className="w-4 h-4 text-emerald-500" />}
                  {item.type === 'prayer' && <Clock className="w-4 h-4 text-amber-500" />}
                  {item.type === 'share' && <Globe className="w-4 h-4 text-pink-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                </div>
                {item.country && <span className="text-lg">{item.country}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status & App Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">حالة النظام</h2>
            <span className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              كل شيء يعمل
            </span>
          </div>
          <div className="space-y-1">
            <StatusIndicator status={status.api} label="API" />
            <StatusIndicator status={status.database} label="قاعدة البيانات" />
            <StatusIndicator status={status.notifications} label="الإشعارات" />
            <StatusIndicator status={status.cdn} label="CDN" />
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-bold text-gray-800 mb-4">معلومات التطبيق</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">الإصدار الحالي</span>
              <span className="font-medium text-gray-800">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">آخر تحديث</span>
              <span className="font-medium text-gray-800">2 مارس 2026</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">وضع الصيانة</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">معطل</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">الإعلانات</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">مفعّلة</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-lg font-bold text-gray-800 mb-4">توزيع المستخدمين</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 flex items-center gap-2">
                 iOS
              </span>
              <span className="font-medium">8,500 (55%)</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '55%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 flex items-center gap-2">
                🤖 Android
              </span>
              <span className="font-medium">6,920 (45%)</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
