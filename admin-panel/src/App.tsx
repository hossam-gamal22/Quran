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
  ChevronLeft,
  Smartphone
} from 'lucide-react';

// استيراد الصفحات - تصحيح أسماء الاستيراد
import Dashboard from './pages/Dashboard';
import Content from './pages/Content';
import Notifications from './pages/Notifications';
import SettingsPage from './pages/Settings';  // ✅ تغيير الاسم هنا
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
        {/* User Avatar */}
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-emerald-600 font-bold">م</span>
        </div>
      </div>
    </header>
  );
};

// ==================== Main App ====================

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      </div>
    </Router>
  );
};

export default App;
