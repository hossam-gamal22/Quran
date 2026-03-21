// admin-panel/src/App.tsx
import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bell,
  Palette,
  Calendar,
  BarChart3,
  Settings,
  Sparkles,
  Menu,
  X,
  Moon,
  LogOut,
  Smartphone,
  BookOpen,
  Users,
  CreditCard,
  Megaphone,
  DollarSign,
  Globe,
  Volume2,
  Image as ImageIcon,
  Map,
  Shield,
  Trophy,
  Timer,
  CalendarHeart,
  Fingerprint,
  CalendarDays,
  Repeat,
  LayoutGrid,
  UserPlus,
  Heart,
  Languages,
  Radio,
  ChevronDown,
  Music,
  AlertTriangle,
} from 'lucide-react';

// ==================== Error Boundary ====================
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-2xl w-full border border-red-500/50">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h1 className="text-xl font-bold text-white">حدث خطأ في التطبيق</h1>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 mb-4 overflow-auto max-h-60">
              <p className="text-red-400 font-mono text-sm whitespace-pre-wrap">
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo && (
                <p className="text-slate-500 font-mono text-xs mt-2 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// استيراد الصفحات
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import SettingsPage from './pages/Settings';
import Seasonal from './pages/Seasonal';
import Analytics from './pages/Analytics';
import AzkarManager from './pages/AzkarManager';
import UsersPage from './pages/Users';
import Subscriptions from './pages/Subscriptions';
import Ads from './pages/Ads';
import Pricing from './pages/Pricing';
import WelcomeBanner from './pages/WelcomeBanner';
import HighlightsManager from './pages/HighlightsManager';
import NavigationUI from './pages/NavigationUI';
import AppContentManager from './pages/AppContentManager';
import HomePageManager from './pages/HomePageManager';
import SoundManager from './pages/SoundManager';
import BundledSoundsManager from './pages/BundledSoundsManager';
import TempPagesManager from './pages/TempPagesManager';
import DailyContentManager from './pages/DailyContentManager';
import DailyDhikrManager from './pages/DailyDhikrManager';
import QuranThemesManager from './pages/QuranThemesManager';
import TasbihPresetsManager from './pages/TasbihPresetsManager';
import IslamicEventsManager from './pages/IslamicEventsManager';
import SDUIManager from './pages/SDUIManager';
import OnboardingManager from './pages/OnboardingManager';
import DuasManager from './pages/DuasManager';
import FeatureGating from './pages/FeatureGating';
import PdfTemplatesManager from './pages/PdfTemplatesManager';
import Rewards from './pages/Rewards';
import TranslationOverrides from './pages/TranslationOverrides';
import ContentManager from './pages/ContentManager';
import RadioManager from './pages/RadioManager';
import HijriOverrides from './pages/HijriOverrides';
import RouteGuide from './pages/RouteGuide';
import MobilePreview from './components/MobilePreview';

// ==================== Sidebar Groups ====================
interface NavItem { path: string; icon: React.FC<{ className?: string }>; label: string }
interface NavGroup { id: string; label: string; icon: React.FC<{ className?: string }>; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: 'الصفحة الرئيسية',
    icon: LayoutDashboard,
    items: [
      { path: '/home-page', icon: LayoutDashboard, label: 'إدارة الرئيسية' },
      { path: '/welcome-banner', icon: Megaphone, label: 'الرسالة الترحيبية' },
      { path: '/highlights', icon: Sparkles, label: 'الهايلايتس' },
    ],
  },
  {
    id: 'content',
    label: 'المحتوى',
    icon: FileText,
    items: [
      { path: '/daily-content', icon: CalendarHeart, label: 'المحتوى اليومي' },
      { path: '/content-manager', icon: BookOpen, label: 'المحتوى الديني' },
      { path: '/temp-pages', icon: Timer, label: 'صفحات مؤقتة' },
    ],
  },
  {
    id: 'adhkar',
    label: 'الأذكار والأدعية',
    icon: Heart,
    items: [
      { path: '/azkar', icon: BookOpen, label: 'إدارة الأذكار' },
      { path: '/daily-dhikr', icon: BookOpen, label: 'الأذكار اليومية' },
      { path: '/duas', icon: Heart, label: 'الأدعية المختارة' },
      { path: '/tasbih-presets', icon: Repeat, label: 'التسبيحات' },
    ],
  },
  {
    id: 'quran-themes',
    label: 'ثيمات القرآن',
    icon: Fingerprint,
    items: [
      { path: '/quran-themes', icon: Fingerprint, label: 'ثيمات القرآن' },
    ],
  },
  {
    id: 'calendar',
    label: 'التقويم والمواسم',
    icon: Calendar,
    items: [
      { path: '/islamic-events', icon: CalendarDays, label: 'المناسبات الإسلامية' },
      { path: '/hijri-overrides', icon: Globe, label: 'تعديلات الهجري' },
      { path: '/seasonal', icon: Calendar, label: 'المحتوى الموسمي' },
    ],
  },
  {
    id: 'media',
    label: 'الوسائط',
    icon: Volume2,
    items: [
      { path: '/sounds', icon: Volume2, label: 'إعدادات الأصوات' },
      { path: '/bundled-sounds', icon: Music, label: 'أصوات الإشعارات' },
      { path: '/radio', icon: Radio, label: 'الراديو' },
    ],
  },
  {
    id: 'notifications',
    label: 'الإشعارات',
    icon: Bell,
    items: [
      { path: '/notifications', icon: Bell, label: 'إدارة الإشعارات' },
    ],
  },
  {
    id: 'users',
    label: 'المستخدمين والتحليلات',
    icon: Users,
    items: [
      { path: '/users', icon: Users, label: 'المستخدمين' },
      { path: '/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
      { path: '/rewards', icon: Trophy, label: 'المكافآت' },
      { path: '/analytics', icon: BarChart3, label: 'التحليلات' },
    ],
  },
  {
    id: 'monetization',
    label: 'الإعلانات والأسعار',
    icon: DollarSign,
    items: [
      { path: '/ads', icon: Megaphone, label: 'الإعلانات' },
      { path: '/pricing', icon: DollarSign, label: 'الأسعار' },
    ],
  },
  {
    id: 'localization',
    label: 'الترجمة والتوطين',
    icon: Languages,
    items: [
      { path: '/app-content', icon: Globe, label: 'محتوى التطبيق' },
      { path: '/translations', icon: Languages, label: 'إدارة الترجمات' },
    ],
  },
  {
    id: 'app-settings',
    label: 'إعدادات التطبيق',
    icon: Settings,
    items: [
      { path: '/navigation-ui', icon: Smartphone, label: 'تخصيص التنقل' },
      { path: '/onboarding', icon: UserPlus, label: 'شاشات التأهيل' },
      { path: '/feature-gating', icon: Shield, label: 'بوابة الميزات' },
      { path: '/settings', icon: Settings, label: 'الإعدادات العامة' },
    ],
  },
  {
    id: 'developer',
    label: 'أدوات المطور',
    icon: LayoutGrid,
    items: [
      { path: '/sdui', icon: LayoutGrid, label: 'واجهات SDUI' },
      { path: '/pdf-templates', icon: FileText, label: 'قوالب PDF' },
      { path: '/route-guide', icon: Map, label: 'دليل المسارات' },
    ],
  },
];

// ==================== Sidebar ====================
const SidebarGroupItem: React.FC<{
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  onNavClick: () => void;
}> = ({ group, isOpen, onToggle, onNavClick }) => {
  const location = useLocation();
  const isActive = group.items.some(item => item.path === location.pathname);

  // Single-item groups render as direct link
  if (group.items.length === 1) {
    const item = group.items[0];
    return (
      <NavLink
        to={item.path}
        onClick={onNavClick}
        className={({ isActive: active }) =>
          `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
            active
              ? 'bg-emerald-500 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`
        }
      >
        <group.icon className="w-4 h-4" />
        <span>{group.label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-sm ${
          isActive && !isOpen
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <group.icon className="w-4 h-4" />
          <span>{group.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mr-4 mt-0.5 space-y-0.5 border-r border-slate-700/50 pr-2">
          {group.items.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              className={({ isActive: active }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs ${
                  active
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const location = useLocation();
  // Auto-open the group that contains the current route
  const getActiveGroupId = () => {
    for (const g of NAV_GROUPS) {
      if (g.items.some(i => i.path === location.pathname)) return g.id;
    }
    return '';
  };
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = getActiveGroupId();
    return active ? new Set([active]) : new Set<string>();
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      
      <aside 
        className={`fixed top-0 right-0 h-full w-64 bg-slate-900 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        dir="rtl"
      >
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">روح المسلم</h1>
                <p className="text-xs text-slate-400">لوحة التحكم</p>
              </div>
            </div>
            <button onClick={onClose} title="إغلاق القائمة" className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-3 space-y-0.5 max-h-[calc(100vh-160px)] overflow-y-auto">
          {/* Dashboard — always at top */}
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive: active }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
                active
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة التحكم</span>
          </NavLink>

          <div className="border-t border-slate-800 my-2" />

          {NAV_GROUPS.map(group => (
            <SidebarGroupItem
              key={group.id}
              group={group}
              isOpen={openGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              onNavClick={onClose}
            />
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-all">
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </div>
        </div>
      </aside>
    </>
  );
};

// ==================== Main App ====================
const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-slate-900" dir="rtl">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="lg:mr-64">
          <header className="h-16 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                title="فتح القائمة"
                className="lg:hidden p-2 hover:bg-slate-700 rounded-lg"
              >
                <Menu className="w-6 h-6 text-slate-400" />
              </button>
              <p className="text-sm text-slate-400 hidden sm:block">مرحباً بك في لوحة التحكم</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">معاينة التطبيق</span>
              </button>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 font-bold">م</span>
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/welcome-banner" element={<WelcomeBanner />} />
              <Route path="/highlights" element={<HighlightsManager />} />

              <Route path="/daily-content" element={<DailyContentManager />} />
              <Route path="/daily-dhikr" element={<DailyDhikrManager />} />

              <Route path="/azkar" element={<AzkarManager />} />
              <Route path="/duas" element={<DuasManager />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/quran-themes" element={<QuranThemesManager />} />
              <Route path="/tasbih-presets" element={<TasbihPresetsManager />} />
              <Route path="/islamic-events" element={<IslamicEventsManager />} />
              <Route path="/hijri-overrides" element={<HijriOverrides />} />
              <Route path="/seasonal" element={<Seasonal />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/feature-gating" element={<FeatureGating />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/ads" element={<Ads />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/navigation-ui" element={<NavigationUI />} />
              <Route path="/app-content" element={<AppContentManager />} />
              <Route path="/home-page" element={<HomePageManager />} />
              <Route path="/sounds" element={<SoundManager />} />
              <Route path="/bundled-sounds" element={<BundledSoundsManager />} />
              <Route path="/radio" element={<RadioManager />} />
              <Route path="/pdf-templates" element={<PdfTemplatesManager />} />
              <Route path="/temp-pages" element={<TempPagesManager />} />
              <Route path="/sdui" element={<SDUIManager />} />
              <Route path="/onboarding" element={<OnboardingManager />} />

              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/translations" element={<TranslationOverrides />} />
              <Route path="/content-manager" element={<ContentManager />} />
              <Route path="/route-guide" element={<RouteGuide />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        <MobilePreview isOpen={previewOpen} onClose={() => setPreviewOpen(false)} />

        <button
          onClick={() => setPreviewOpen(true)}
          className="fixed bottom-6 left-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all hover:scale-110 z-40"
          title="معاينة التطبيق"
        >
          <Smartphone className="w-6 h-6" />
        </button>
      </div>
    </Router>
  );
};

// تصدير التطبيق مع Error Boundary
const AppWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
