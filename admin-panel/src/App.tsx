// admin-panel/src/App.tsx
// الملف الرئيسي مع كل الـ Routes

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
  ChevronLeft,
  Smartphone
} from 'lucide-react';

// استيراد الصفحات
import Dashboard from './pages/Dashboard';
import Content from './pages/Content';
import Notifications from './pages/Notifications';
import Settings as SettingsPage from './pages/Settings';
import Themes from './pages/Themes';
import Seasonal from './pages/Seasonal';
import Analytics from './pages/Analytics';
import SplashScreens from './pages/SplashScreens';

// ==================== Sidebar ====================

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
    { path: '/splash-screens', icon: Sparkles, label: 'شاشات البداية' },
    { path: '/content', icon: FileText, label: 'المحتوى' },
    { path: '/notifications', icon: Bell, label: 'الإشعارات' },
    { path: '/themes', icon: Palette, label: 'الثيمات' },
    { path: '/seasonal', icon: Calendar, label: 'المحتوى الموسمي' },
    { path: '/analytics', icon: BarChart3, label: 'التحليلات' },
    { path: '/settings', icon: Settings, label: 'الإعدادات' },
  ];

  return (
    <>
      {/* Overlay للموبايل */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 right-0 h-full w-64 bg-slate-900 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        dir="rtl"
      >
        {/* Logo */}
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
            <button 
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
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

        {/* Footer */}
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

// ==================== Header ====================

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-500">مرحباً بك في لوحة التحكم</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Device Preview Button */}
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">معاينة الموبايل</span>
        </button>
        
        {/* User Avatar */}
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-emerald-600 font-bold">م</span>
        </div>
      </div>
    </header>
  );
};

// ==================== Mobile Preview Modal ====================

const MobilePreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  previewUrl?: string;
}> = ({ isOpen, onClose, previewUrl }) => {
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">معاينة التطبيق</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b flex items-center gap-4 bg-gray-50">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setDevice('iphone')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                device === 'iphone' ? 'bg-white shadow-sm' : ''
              }`}
            >
               iPhone
            </button>
            <button
              onClick={() => setDevice('android')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                device === 'android' ? 'bg-white shadow-sm' : ''
              }`}
            >
              🤖 Android
            </button>
          </div>

          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setColorScheme('light')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                colorScheme === 'light' ? 'bg-white shadow-sm' : ''
              }`}
            >
              ☀️ فاتح
            </button>
            <button
              onClick={() => setColorScheme('dark')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                colorScheme === 'dark' ? 'bg-white shadow-sm' : ''
              }`}
            >
              🌙 داكن
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-8 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center min-h-[500px]">
          <div 
            className={`relative ${
              device === 'iphone' 
                ? 'w-[300px] h-[620px] rounded-[50px]' 
                : 'w-[290px] h-[600px] rounded-[30px]'
            } bg-black p-3 shadow-2xl`}
          >
            {/* Screen */}
            <div 
              className={`w-full h-full overflow-hidden ${
                device === 'iphone' ? 'rounded-[40px]' : 'rounded-[24px]'
              } ${colorScheme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
            >
              {/* Notch for iPhone */}
              {device === 'iphone' && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-full z-10" />
              )}

              {/* App Preview Content */}
              <div className="h-full flex flex-col" dir="rtl">
                {/* Status Bar */}
                <div className={`flex items-center justify-between px-6 pt-4 pb-2 ${
                  colorScheme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                  <span className="text-xs font-medium">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-3 border border-current rounded-sm">
                      <div className="w-4 h-full bg-current rounded-sm" />
                    </div>
                  </div>
                </div>

                {/* App Header */}
                <div className={`px-4 py-3 ${colorScheme === 'dark' ? 'bg-gray-800' : 'bg-emerald-600'}`}>
                  <h1 className="text-white text-lg font-bold text-center">روح المسلم</h1>
                </div>

                {/* App Content */}
                <div className={`flex-1 p-4 ${colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {/* Hijri Date */}
                  <div className={`text-center mb-4 ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    <p className="text-sm">٣ رمضان ١٤٤٧</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['أذكار الصباح', 'أذكار المساء', 'القرآن'].map((item, i) => (
                      <div 
                        key={i}
                        className={`p-3 rounded-xl text-center ${
                          colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        } shadow-sm`}
                      >
                        <div className="text-2xl mb-1">
                          {i === 0 ? '🌅' : i === 1 ? '🌆' : '📖'}
                        </div>
                        <p className={`text-xs ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Categories */}
                  <div className={`p-4 rounded-xl ${colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                    <h3 className={`font-bold mb-3 ${colorScheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      الأذكار
                    </h3>
                    <div className="space-y-2">
                      {['أذكار الصباح', 'أذكار المساء', 'أذكار النوم'].map((item, i) => (
                        <div 
                          key={i}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                          }`}
                        >
                          <span className={`text-sm ${colorScheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                            {item}
                          </span>
                          <ChevronLeft className={`w-4 h-4 ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tab Bar */}
                <div className={`flex items-center justify-around py-3 border-t ${
                  colorScheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  {[
                    { icon: '📿', label: 'الأذكار', active: true },
                    { icon: '📖', label: 'القرآن' },
                    { icon: '🕌', label: 'الصلاة' },
                    { icon: '🧭', label: 'القبلة' },
                    { icon: '⚙️', label: 'الإعدادات' },
                  ].map((tab, i) => (
                    <div key={i} className="text-center">
                      <div className={`text-xl ${tab.active ? '' : 'opacity-50'}`}>{tab.icon}</div>
                      <p className={`text-xs mt-1 ${
                        tab.active 
                          ? 'text-emerald-500' 
                          : colorScheme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {tab.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Home Indicator */}
                {device === 'iphone' && (
                  <div className="flex justify-center pb-2">
                    <div className={`w-32 h-1 rounded-full ${
                      colorScheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Main App ====================

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100" dir="rtl">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="lg:mr-64">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page Content */}
          <main className="p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/splash-screens" element={<SplashScreens />} />
              <Route path="/content" element={<Content />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/themes" element={<Themes />} />
              <Route path="/seasonal" element={<Seasonal />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Mobile Preview Modal */}
        <MobilePreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />

        {/* Floating Preview Button */}
        <button
          onClick={() => setPreviewOpen(true)}
          className="fixed bottom-6 left-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
          title="معاينة التطبيق"
        >
          <Smartphone className="w-6 h-6" />
        </button>
      </div>
    </Router>
  );
};

export default App;
