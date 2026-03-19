// admin-panel/src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
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
  Shield,
  Trophy,
  Timer,
  CalendarHeart,
  Quote,
  Fingerprint,
  CalendarDays,
  Repeat,
  LayoutGrid,
  UserPlus,
  Heart,
  Languages,
  Radio
} from 'lucide-react';

// استيراد الصفحات
import Dashboard from './pages/Dashboard';
import Content from './pages/Content';
import Notifications from './pages/Notifications';
import SettingsPage from './pages/Settings';
import Themes from './pages/Themes';
import Seasonal from './pages/Seasonal';
import Analytics from './pages/Analytics';
import SplashScreens from './pages/SplashScreens';
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
import BackgroundManager from './pages/BackgroundManager';
import PhotoBackgroundManager from './pages/PhotoBackgroundManager';
import WidgetDesignManager from './pages/WidgetDesignManager';
import TempPagesManager from './pages/TempPagesManager';
import DailyContentManager from './pages/DailyContentManager';
import DailyDhikrManager from './pages/DailyDhikrManager';
import QuotesManager from './pages/QuotesManager';
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
import MobilePreview from './components/MobilePreview';

// ==================== Sidebar ====================
const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
    { path: '/welcome-banner', icon: Megaphone, label: 'الرسالة الترحيبية' },
    { path: '/highlights', icon: Sparkles, label: 'الهايلايتس' },
    { path: '/splash-screens', icon: Sparkles, label: 'شاشات البداية' },
    { path: '/content', icon: FileText, label: 'المحتوى' },
    { path: '/daily-content', icon: CalendarHeart, label: 'المحتوى اليومي' },
    { path: '/daily-dhikr', icon: BookOpen, label: 'الأذكار اليومية' },
    { path: '/quotes', icon: Quote, label: 'إدارة الحكم' },
    { path: '/azkar', icon: BookOpen, label: 'إدارة الأذكار' },
    { path: '/duas', icon: Heart, label: 'الأدعية المختارة' },
    { path: '/notifications', icon: Bell, label: 'الإشعارات' },
    { path: '/themes', icon: Palette, label: 'الثيمات' },
    { path: '/quran-themes', icon: Fingerprint, label: 'ثيمات القرآن' },
    { path: '/tasbih-presets', icon: Repeat, label: 'التسبيحات' },
    { path: '/islamic-events', icon: CalendarDays, label: 'المناسبات' },
    { path: '/hijri-overrides', icon: Globe, label: 'تعديلات الهجري' },
    { path: '/seasonal', icon: Calendar, label: 'المحتوى الموسمي' },
    { path: '/analytics', icon: BarChart3, label: 'التحليلات' },
    { path: '/users', icon: Users, label: 'المستخدمين' },
    { path: '/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
    { path: '/feature-gating', icon: Shield, label: 'بوابة الميزات' },
    { path: '/rewards', icon: Trophy, label: 'المكافآت' },
    { path: '/ads', icon: Megaphone, label: 'الإعلانات' },
    { path: '/pricing', icon: DollarSign, label: 'الأسعار' },
    { path: '/navigation-ui', icon: Smartphone, label: 'تخصيص التنقل' },
    { path: '/app-content', icon: Globe, label: 'محتوى التطبيق' },
    { path: '/translations', icon: Languages, label: 'إدارة الترجمات' },
    { path: '/content-manager', icon: BookOpen, label: 'إدارة المحتوى الديني' },
    { path: '/home-page', icon: LayoutDashboard, label: 'إدارة الرئيسية' },
    { path: '/sounds', icon: Volume2, label: 'إدارة الأصوات' },
    { path: '/radio', icon: Radio, label: 'إدارة الراديو' },
    { path: '/backgrounds', icon: ImageIcon, label: 'إدارة الخلفيات' },
    { path: '/photo-backgrounds', icon: ImageIcon, label: 'خلفيات الصور' },
    { path: '/widget-designs', icon: Smartphone, label: 'تصميمات الودجات' },
    { path: '/pdf-templates', icon: FileText, label: 'قوالب PDF' },
    { path: '/temp-pages', icon: Timer, label: 'صفحات مؤقتة' },
    { path: '/sdui', icon: LayoutGrid, label: 'واجهات SDUI' },
    { path: '/onboarding', icon: UserPlus, label: 'شاشات التأهيل' },
    { path: '/settings', icon: Settings, label: 'الإعدادات' },
  ];

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
        <div className="p-6 border-b border-slate-700">
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

        <nav className="p-4 space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
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
              <Route path="/splash-screens" element={<SplashScreens />} />
              <Route path="/content" element={<Content />} />
              <Route path="/daily-content" element={<DailyContentManager />} />
              <Route path="/daily-dhikr" element={<DailyDhikrManager />} />
              <Route path="/quotes" element={<QuotesManager />} />
              <Route path="/azkar" element={<AzkarManager />} />
              <Route path="/duas" element={<DuasManager />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/themes" element={<Themes />} />
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
              <Route path="/radio" element={<RadioManager />} />
              <Route path="/backgrounds" element={<BackgroundManager />} />
              <Route path="/photo-backgrounds" element={<PhotoBackgroundManager />} />
              <Route path="/widget-designs" element={<WidgetDesignManager />} />
              <Route path="/pdf-templates" element={<PdfTemplatesManager />} />
              <Route path="/temp-pages" element={<TempPagesManager />} />
              <Route path="/sdui" element={<SDUIManager />} />
              <Route path="/onboarding" element={<OnboardingManager />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/translations" element={<TranslationOverrides />} />
              <Route path="/content-manager" element={<ContentManager />} />
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

export default App;
