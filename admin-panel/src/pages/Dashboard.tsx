// admin-panel/src/pages/Dashboard.tsx
// لوحة التحكم الرئيسية - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  TrendingUp,
  Clock,
  BookOpen,
  Star,
  Bell,
  Settings,
  Smartphone,
  Globe,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Activity,
  PieChart,
  BarChart3,
  Zap,
} from 'lucide-react';

// ========================================
// الأنواع
// ========================================

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalAzkarRead: number;
  totalQuranPages: number;
  totalPrayers: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'azkar' | 'quran' | 'prayer' | 'error';
  message: string;
  timestamp: string;
}

interface SystemStatus {
  api: 'online' | 'offline' | 'degraded';
  database: 'online' | 'offline' | 'degraded';
  notifications: 'online' | 'offline' | 'degraded';
  cdn: 'online' | 'offline' | 'degraded';
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  link: string;
}

// ========================================
// البيانات الافتراضية
// ========================================

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'splash', label: 'شاشات البداية', icon: Smartphone, color: '#3b82f6', link: '/splash-screens' },
  { id: 'content', label: 'إدارة المحتوى', icon: BookOpen, color: '#2f7659', link: '/content' },
  { id: 'notifications', label: 'الإشعارات', icon: Bell, color: '#f59e0b', link: '/notifications' },
  { id: 'themes', label: 'الثيمات', icon: Star, color: '#8b5cf6', link: '/themes' },
  { id: 'seasonal', label: 'المحتوى الموسمي', icon: Calendar, color: '#ec4899', link: '/seasonal' },
  { id: 'settings', label: 'الإعدادات', icon: Settings, color: '#6b7280', link: '/settings' },
];

// ========================================
// المكونات الفرعية
// ========================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <TrendingUp size={14} className={change < 0 ? 'rotate-180' : ''} />
            <span>{Math.abs(change)}% من الأسبوع الماضي</span>
          </div>
        )}
      </div>
      <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon size={24} style={{ color }} />
      </div>
    </div>
  </div>
);

interface StatusIndicatorProps {
  name: string;
  status: 'online' | 'offline' | 'degraded';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ name, status }) => {
  const statusConfig = {
    online: { color: 'text-green-500', bg: 'bg-green-500', icon: CheckCircle, label: 'يعمل' },
    offline: { color: 'text-red-500', bg: 'bg-red-500', icon: XCircle, label: 'متوقف' },
    degraded: { color: 'text-yellow-500', bg: 'bg-yellow-500', icon: AlertTriangle, label: 'بطيء' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
      <span className="text-gray-300">{name}</span>
      <div className={`flex items-center gap-2 ${config.color}`}>
        <Icon size={16} />
        <span className="text-sm">{config.label}</span>
      </div>
    </div>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    dailyActiveUsers: 0,
    totalSessions: 0,
    avgSessionDuration: 0,
    totalAzkarRead: 0,
    totalQuranPages: 0,
    totalPrayers: 0,
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    api: 'online',
    database: 'online',
    notifications: 'online',
    cdn: 'online',
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // تحميل البيانات
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    
    // TODO: استبدال بـ API calls حقيقية
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setStats({
      totalUsers: 15420,
      activeUsers: 8750,
      dailyActiveUsers: 2340,
      totalSessions: 45600,
      avgSessionDuration: 8.5,
      totalAzkarRead: 125000,
      totalQuranPages: 89000,
      totalPrayers: 156000,
    });

    setRecentActivity([
      { id: '1', type: 'user', message: 'مستخدم جديد من مصر', timestamp: '2026-03-02T22:30:00Z' },
      { id: '2', type: 'azkar', message: 'أذكار الصباح الأكثر قراءة اليوم', timestamp: '2026-03-02T22:25:00Z' },
      { id: '3', type: 'quran', message: '50 ختمة مكتملة هذا الأسبوع', timestamp: '2026-03-02T22:20:00Z' },
      { id: '4', type: 'prayer', message: 'ارتفاع تسجيل الصلوات 15%', timestamp: '2026-03-02T22:15:00Z' },
    ]);

    setLastUpdate(new Date());
    setIsLoading(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return Users;
      case 'azkar': return Star;
      case 'quran': return BookOpen;
      case 'prayer': return Clock;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return '#3b82f6';
      case 'azkar': return '#2f7659';
      case 'quran': return '#f59e0b';
      case 'prayer': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diff < 1) return 'الآن';
    if (diff < 60) return `منذ ${diff} دقيقة`;
    if (diff < 1440) return `منذ ${Math.floor(diff / 60)} ساعة`;
    return `منذ ${Math.floor(diff / 1440)} يوم`;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-gray-400 mt-1">مرحباً بك في لوحة تحكم روح المسلم</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-EG')}
          </span>
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إجمالي المستخدمين"
          value={stats.totalUsers}
          change={12}
          icon={Users}
          color="#3b82f6"
        />
        <StatCard
          title="المستخدمين النشطين"
          value={stats.activeUsers}
          change={8}
          icon={Activity}
          color="#2f7659"
        />
        <StatCard
          title="المستخدمين اليوم"
          value={stats.dailyActiveUsers}
          change={-3}
          icon={Eye}
          color="#f59e0b"
        />
        <StatCard
          title="متوسط مدة الجلسة"
          value={`${stats.avgSessionDuration} د`}
          change={5}
          icon={Clock}
          color="#8b5cf6"
        />
      </div>

      {/* إحصائيات العبادات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="الأذكار المقروءة"
          value={stats.totalAzkarRead}
          icon={Star}
          color="#2f7659"
        />
        <StatCard
          title="صفحات القرآن"
          value={stats.totalQuranPages}
          icon={BookOpen}
          color="#f59e0b"
        />
        <StatCard
          title="الصلوات المسجلة"
          value={stats.totalPrayers}
          icon={Clock}
          color="#8b5cf6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الإجراءات السريعة */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h2 className="text-lg font-bold text-white mb-4">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map(action => (
                <a
                  key={action.id}
                  href={action.link}
                  className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all group"
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <action.icon size={20} style={{ color: action.color }} />
                  </div>
                  <span className="text-white text-sm">{action.label}</span>
                  <ChevronRight
                    size={16}
                    className="text-gray-500 mr-auto group-hover:translate-x-[-4px] transition-transform"
                  />
                </a>
              ))}
            </div>
          </div>

          {/* النشاط الأخير */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
            <h2 className="text-lg font-bold text-white mb-4">النشاط الأخير</h2>
            <div className="space-y-3">
              {recentActivity.map(activity => {
                const Icon = getActivityIcon(activity.type);
                const color = getActivityColor(activity.type);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg"
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{activity.message}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {formatTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* حالة النظام */}
        <div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">حالة النظام</h2>
              <div className="flex items-center gap-2 text-green-500 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>كل شيء يعمل</span>
              </div>
            </div>
            <div>
              <StatusIndicator name="API" status={systemStatus.api} />
              <StatusIndicator name="قاعدة البيانات" status={systemStatus.database} />
              <StatusIndicator name="الإشعارات" status={systemStatus.notifications} />
              <StatusIndicator name="CDN" status={systemStatus.cdn} />
            </div>
          </div>

          {/* معلومات التطبيق */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
            <h2 className="text-lg font-bold text-white mb-4">معلومات التطبيق</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">الإصدار الحالي</span>
                <span className="text-white font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">آخر تحديث</span>
                <span className="text-white">2 مارس 2026</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">وضع الصيانة</span>
                <span className="text-green-500">معطل</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">الإعلانات</span>
                <span className="text-green-500">مفعّلة</span>
              </div>
            </div>
          </div>

          {/* توزيع المستخدمين */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6">
            <h2 className="text-lg font-bold text-white mb-4">توزيع المستخدمين</h2>
            <div className="space-y-3">
              {[
                { platform: 'iOS', count: 8500, color: '#3b82f6' },
                { platform: 'Android', count: 6920, color: '#2f7659' },
              ].map(item => (
                <div key={item.platform}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{item.platform}</span>
                    <span className="text-white">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(item.count / stats.totalUsers) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
