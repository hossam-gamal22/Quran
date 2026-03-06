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
  ChevronLeft,
  RotateCcw,
  BookOpen,
  Users,
  CreditCard,
  Megaphone,
  DollarSign
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

// ==================== Mobile Preview Component ====================
const MobilePreview: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const screens = [
    { id: 'home', name: 'الرئيسية', icon: '🏠' },
    { id: 'azkar', name: 'الأذكار', icon: '📿' },
    { id: 'quran', name: 'القرآن', icon: '📖' },
    { id: 'prayer', name: 'الصلاة', icon: '🕌' },
    { id: 'qibla', name: 'القبلة', icon: '🧭' },
    { id: 'settings', name: 'الإعدادات', icon: '⚙️' },
  ];

  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const secondaryText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">معاينة التطبيق</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-700 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الجهاز:</span>
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setDevice('iphone')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  device === 'iphone' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                 iPhone
              </button>
              <button
                onClick={() => setDevice('android')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  device === 'android' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                🤖 Android
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الوضع:</span>
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  theme === 'light' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                ☀️ فاتح
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  theme === 'dark' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                🌙 داكن
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الشاشة:</span>
            <select
              value={currentScreen}
              onChange={(e) => setCurrentScreen(e.target.value)}
              className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border-none"
            >
              {screens.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setRotation(r => r + 90)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            تدوير
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-8 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 min-h-[600px]">
          <div
            className={`relative transition-transform duration-500 ${
              device === 'iphone' 
                ? 'w-[300px] h-[620px] rounded-[50px]' 
                : 'w-[290px] h-[600px] rounded-[30px]'
            } bg-black p-3 shadow-2xl`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div 
              className={`w-full h-full overflow-hidden ${
                device === 'iphone' ? 'rounded-[40px]' : 'rounded-[24px]'
              } ${bgColor}`}
            >
              {device === 'iphone' && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-[20px] z-20" />
              )}

              <div className={`flex items-center justify-between px-8 pt-4 pb-2 ${textColor}`}>
                <span className="text-xs font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3L2 12h3v9h6v-6h2v6h6v-9h3L12 3z"/>
                  </svg>
                  <div className="w-6 h-3 border-2 border-current rounded-sm">
                    <div className="w-4 h-full bg-current rounded-sm" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-full" dir="rtl">
                <div className="bg-emerald-600 px-4 py-4 flex items-center justify-between">
                  <h1 className="text-white text-lg font-bold">روح المسلم</h1>
                  <div className="text-white/80 text-xs">٣ رمضان ١٤٤٧</div>
                </div>

                <div className={`flex-1 p-4 overflow-auto ${bgColor}`}>
                  {currentScreen === 'home' && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-2xl text-white">
                        <p className="text-sm opacity-90">السلام عليكم</p>
                        <p className="font-bold mt-1">حان وقت أذكار المساء 🌙</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { icon: '🌅', name: 'الصباح' },
                          { icon: '🌆', name: 'المساء' },
                          { icon: '😴', name: 'النوم' },
                        ].map((item, i) => (
                          <div key={i} className={`${cardBg} p-3 rounded-xl text-center shadow-sm`}>
                            <span className="text-2xl">{item.icon}</span>
                            <p className={`text-xs mt-1 ${secondaryText}`}>{item.name}</p>
                          </div>
                        ))}
                      </div>
                      <div className={`${cardBg} p-4 rounded-xl shadow-sm`}>
                        <h3 className={`font-bold mb-3 ${textColor}`}>الأذكار</h3>
                        {['أذكار الصباح', 'أذكار المساء', 'أذكار النوم'].map((item, i) => (
                          <div key={i} className={`flex items-center justify-between py-2 ${i < 2 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                            <span className={`text-sm ${textColor}`}>{item}</span>
                            <ChevronLeft className={`w-4 h-4 ${secondaryText}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentScreen === 'azkar' && (
                    <div className="space-y-3">
                      <h2 className={`font-bold text-lg ${textColor}`}>أذكار الصباح</h2>
                      {[
                        { text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ...', count: 1 },
                        { text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا...', count: 1 },
                        { text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ...', count: 1 },
                      ].map((dhikr, i) => (
                        <div key={i} className={`${cardBg} p-4 rounded-xl shadow-sm`}>
                          <p className={`text-sm leading-relaxed ${textColor}`}>{dhikr.text}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className={`text-xs ${secondaryText}`}>مرة واحدة</span>
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {dhikr.count}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentScreen === 'quran' && (
                    <div className="space-y-3">
                      <h2 className={`font-bold text-lg ${textColor}`}>القرآن الكريم</h2>
                      <div className={`${cardBg} p-4 rounded-xl shadow-sm`}>
                        <p className={`text-xs ${secondaryText}`}>آخر قراءة</p>
                        <p className={`font-bold ${textColor}`}>سورة البقرة</p>
                        <p className={`text-sm ${secondaryText}`}>الآية 255</p>
                        <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <div className="h-full w-1/3 bg-emerald-500 rounded-full" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['الفاتحة', 'البقرة', 'آل عمران', 'النساء'].map((surah, i) => (
                          <div key={i} className={`${cardBg} p-3 rounded-xl shadow-sm`}>
                            <p className={`font-bold text-sm ${textColor}`}>{surah}</p>
                            <p className={`text-xs ${secondaryText}`}>جزء {i + 1}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentScreen === 'prayer' && (
                    <div className="space-y-3">
                      <h2 className={`font-bold text-lg ${textColor}`}>مواقيت الصلاة</h2>
                      <div className={`${cardBg} p-4 rounded-xl shadow-sm text-center`}>
                        <p className={`text-sm ${secondaryText}`}>الصلاة القادمة</p>
                        <p className="text-3xl font-bold text-emerald-500 mt-2">المغرب</p>
                        <p className={`text-2xl font-bold ${textColor} mt-1`}>5:45</p>
                        <p className={`text-sm ${secondaryText} mt-1`}>باقي ساعة و 23 دقيقة</p>
                      </div>
                      {['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'].map((prayer, i) => (
                        <div key={i} className={`${cardBg} p-3 rounded-xl shadow-sm flex items-center justify-between`}>
                          <span className={textColor}>{prayer}</span>
                          <span className={secondaryText}>{`${4 + i}:${30 + i * 5}`}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentScreen === 'qibla' && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="w-48 h-48 rounded-full border-4 border-emerald-500 flex items-center justify-center relative">
                        <div className="absolute w-1 h-20 bg-emerald-500 rounded-full origin-bottom" style={{ transform: 'rotate(45deg)' }} />
                        <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                      </div>
                      <p className={`mt-4 font-bold ${textColor}`}>اتجاه القبلة</p>
                      <p className={`text-sm ${secondaryText}`}>45° شمال شرق</p>
                    </div>
                  )}

                  {currentScreen === 'settings' && (
                    <div className="space-y-3">
                      <h2 className={`font-bold text-lg ${textColor}`}>الإعدادات</h2>
                      {[
                        { icon: '🌙', name: 'الوضع الداكن', toggle: true },
                        { icon: '🔔', name: 'الإشعارات', toggle: true },
                        { icon: '🌍', name: 'اللغة', value: 'العربية' },
                        { icon: '📍', name: 'الموقع', value: 'القاهرة' },
                        { icon: '⭐', name: 'قيّم التطبيق' },
                        { icon: '📤', name: 'مشاركة التطبيق' },
                      ].map((item, i) => (
                        <div key={i} className={`${cardBg} p-3 rounded-xl shadow-sm flex items-center justify-between`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{item.icon}</span>
                            <span className={textColor}>{item.name}</span>
                          </div>
                          {item.toggle && (
                            <div className="w-12 h-6 bg-emerald-500 rounded-full p-1">
                              <div className="w-4 h-4 bg-white rounded-full mr-auto" />
                            </div>
                          )}
                          {item.value && <span className={secondaryText}>{item.value}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${cardBg} border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} px-2 py-2 flex items-center justify-around`}>
                  {screens.slice(0, 5).map((screen) => (
                    <button
                      key={screen.id}
                      onClick={() => setCurrentScreen(screen.id)}
                      className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                        currentScreen === screen.id 
                          ? 'text-emerald-500' 
                          : secondaryText
                      }`}
                    >
                      <span className="text-xl">{screen.icon}</span>
                      <span className="text-[10px] mt-1">{screen.name}</span>
                    </button>
                  ))}
                </div>

                {device === 'iphone' && (
                  <div className="flex justify-center pb-2">
                    <div className={`w-32 h-1 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded-full`} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex items-center justify-between text-sm">
          <div className="text-slate-400">
            {device === 'iphone' ? 'iPhone 14 Pro' : 'Samsung Galaxy S23'} • {theme === 'light' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            معاينة مباشرة
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Sidebar ====================
const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
    { path: '/welcome-banner', icon: Megaphone, label: 'الرسالة الترحيبية' },
    { path: '/highlights', icon: Sparkles, label: 'الهايلايتس' },
    { path: '/splash-screens', icon: Sparkles, label: 'شاشات البداية' },
    { path: '/content', icon: FileText, label: 'المحتوى' },
    { path: '/azkar', icon: BookOpen, label: 'إدارة الأذكار' },
    { path: '/notifications', icon: Bell, label: 'الإشعارات' },
    { path: '/themes', icon: Palette, label: 'الثيمات' },
    { path: '/seasonal', icon: Calendar, label: 'المحتوى الموسمي' },
    { path: '/analytics', icon: BarChart3, label: 'التحليلات' },
    { path: '/users', icon: Users, label: 'المستخدمين' },
    { path: '/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
    { path: '/ads', icon: Megaphone, label: 'الإعلانات' },
    { path: '/pricing', icon: DollarSign, label: 'الأسعار' },
    { path: '/navigation-ui', icon: Smartphone, label: 'تخصيص التنقل' },
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
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
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
              <Route path="/azkar" element={<AzkarManager />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/themes" element={<Themes />} />
              <Route path="/seasonal" element={<Seasonal />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/ads" element={<Ads />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/navigation-ui" element={<NavigationUI />} />
              <Route path="/settings" element={<SettingsPage />} />
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
