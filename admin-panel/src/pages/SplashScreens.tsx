// admin-panel/src/pages/SplashScreens.tsx
// إدارة شاشات البداية الديناميكية - لوحة تحكم روح المسلم

import React, { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Image,
  Type,
  Link,
  Calendar,
  Clock,
  Smartphone,
  Save,
  X,
  ChevronDown,
  Upload,
  Palette,
  AlignCenter,
  BookOpen,
  Star,
  Bell,
  Gift,
  Sparkles,
} from 'lucide-react';
import { Styled } from '../components/Styled';

// ========================================
// الأنواع
// ========================================

type SplashType = 'azkar' | 'ayah' | 'hadith' | 'feature' | 'announcement' | 'seasonal' | 'custom';
type ActionType = 'none' | 'navigate' | 'external_link' | 'deep_link';
type DisplayFrequency = 'always' | 'once' | 'daily' | 'weekly' | 'session';

interface SplashScreen {
  id: string;
  type: SplashType;
  isActive: boolean;
  priority: number;
  
  // المحتوى
  titleAr: string;
  titleEn?: string;
  contentAr: string;
  contentEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  sourceAr?: string;
  sourceEn?: string;
  
  // التصميم
  backgroundColor: string;
  backgroundImage?: string;
  backgroundGradient?: string[];
  textColor: string;
  accentColor: string;
  
  // الأيقونة
  iconName?: string;
  iconColor?: string;
  showIcon: boolean;
  
  // الإجراء
  actionType: ActionType;
  actionLabel?: string;
  actionTarget?: string; // screen name or URL
  
  // التوقيت
  displayFrequency: DisplayFrequency;
  startDate?: string;
  endDate?: string;
  showDuration: number; // بالثواني
  
  // الإحصائيات
  viewCount: number;
  clickCount: number;
  dismissCount: number;
  
  // التواريخ
  createdAt: string;
  updatedAt: string;
}

// ========================================
// البيانات الافتراضية
// ========================================

const SPLASH_TYPES: { value: SplashType; label: string; icon: LucideIcon }[] = [
  { value: 'azkar', label: 'ذكر', icon: Star },
  { value: 'ayah', label: 'آية قرآنية', icon: BookOpen },
  { value: 'hadith', label: 'حديث شريف', icon: BookOpen },
  { value: 'feature', label: 'خاصية جديدة', icon: Sparkles },
  { value: 'announcement', label: 'إعلان', icon: Bell },
  { value: 'seasonal', label: 'موسمي', icon: Gift },
  { value: 'custom', label: 'مخصص', icon: Palette },
];

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'none', label: 'بدون إجراء' },
  { value: 'navigate', label: 'الانتقال لصفحة' },
  { value: 'external_link', label: 'رابط خارجي' },
  { value: 'deep_link', label: 'رابط عميق' },
];

const DISPLAY_FREQUENCIES: { value: DisplayFrequency; label: string }[] = [
  { value: 'always', label: 'دائماً' },
  { value: 'once', label: 'مرة واحدة' },
  { value: 'daily', label: 'مرة يومياً' },
  { value: 'weekly', label: 'مرة أسبوعياً' },
  { value: 'session', label: 'كل جلسة' },
];

const APP_SCREENS = [
  { value: '/azkar/morning', label: 'أذكار الصباح' },
  { value: '/azkar/evening', label: 'أذكار المساء' },
  { value: '/quran', label: 'القرآن الكريم' },
  { value: '/prayer', label: 'أوقات الصلاة' },
  { value: '/tasbih', label: 'التسبيح' },
  { value: '/khatma', label: 'الختمة' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/seasonal/ramadan', label: 'رمضان' },
  { value: '/settings', label: 'الإعدادات' },
];

const PRESET_GRADIENTS = [
  ['#2f7659', '#1d5a3a'],
  ['#1a1a2e', '#16213e'],
  ['#5d4e8c', '#3a3a5c'],
  ['#f5a623', '#e08e0b'],
  ['#3a7ca5', '#2a5a7a'],
  ['#c17f59', '#a66b47'],
  ['#e91e63', '#c2185b'],
  ['#00bcd4', '#0097a7'],
];

const PRESET_BACKGROUNDS = [
  '#11151c',
  '#1a1a2e',
  '#2f7659',
  '#1d3557',
  '#5d4e8c',
  '#0d1b2a',
  '#2d3436',
  '#192a56',
];

// ========================================
// المكون الرئيسي
// ========================================

const SplashScreensPage: React.FC = () => {
  const [splashScreens, setSplashScreens] = useState<SplashScreen[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<SplashScreen | null>(null);
  const [previewScreen, setPreviewScreen] = useState<SplashScreen | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'action' | 'schedule'>('content');

  // نموذج فارغ
  const emptyScreen: SplashScreen = {
    id: '',
    type: 'azkar',
    isActive: true,
    priority: 1,
    titleAr: '',
    contentAr: '',
    backgroundColor: '#11151c',
    textColor: '#ffffff',
    accentColor: '#2f7659',
    showIcon: true,
    actionType: 'none',
    displayFrequency: 'daily',
    showDuration: 5,
    viewCount: 0,
    clickCount: 0,
    dismissCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [formData, setFormData] = useState<SplashScreen>(emptyScreen);

  // تحميل البيانات
  useEffect(() => {
    loadSplashScreens();
  }, []);

  const loadSplashScreens = async () => {
    try {
      const snap = await getDocs(collection(db, 'splashScreens'));
      if (!snap.empty) {
        setSplashScreens(snap.docs.map(d => ({ ...d.data(), id: d.id } as SplashScreen)));
        return;
      }
    } catch (err) {
      console.error('Error loading splash screens:', err);
    }
    // Empty state — no mock data
    setSplashScreens([]);
  };

  // فتح نافذة الإضافة
  const handleAdd = () => {
    setEditingScreen(null);
    setFormData({ ...emptyScreen, id: `splash_${Date.now()}` });
    setActiveTab('content');
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const handleEdit = (screen: SplashScreen) => {
    setEditingScreen(screen);
    setFormData({ ...screen });
    setActiveTab('content');
    setIsModalOpen(true);
  };

  // حفظ
  const handleSave = async () => {
    const updatedScreen = { ...formData, updatedAt: new Date().toISOString() };
    
    try {
      const { id, ...data } = updatedScreen;
      await setDoc(doc(db, 'splashScreens', id), data);
      if (editingScreen) {
        setSplashScreens(prev =>
          prev.map(s => (s.id === editingScreen.id ? updatedScreen : s))
        );
      } else {
        setSplashScreens(prev => [...prev, updatedScreen]);
      }
    } catch (err) {
      console.error('Error saving splash screen:', err);
    }
    
    setIsModalOpen(false);
  };

  // حذف
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الشاشة؟')) {
      try {
        await deleteDoc(doc(db, 'splashScreens', id));
        setSplashScreens(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error('Error deleting splash screen:', err);
      }
    }
  };

  // تفعيل/تعطيل
  const handleToggleActive = async (id: string) => {
    const screen = splashScreens.find(s => s.id === id);
    if (screen) {
      try {
        const { id: _, ...data } = screen;
        await setDoc(doc(db, 'splashScreens', id), { ...data, isActive: !screen.isActive });
        setSplashScreens(prev =>
          prev.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s))
        );
      } catch (err) {
        console.error('Error toggling splash screen:', err);
      }
    }
  };

  // حساب نسبة التفاعل
  const getEngagementRate = (screen: SplashScreen): string => {
    if (screen.viewCount === 0) return '0%';
    const rate = (screen.clickCount / screen.viewCount) * 100;
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">شاشات البداية</h1>
          <p className="text-gray-400 mt-1">
            إدارة الشاشات الترحيبية والإعلانات الديناميكية
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>إضافة شاشة جديدة</span>
        </button>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm">إجمالي الشاشات</div>
          <div className="text-2xl font-bold mt-1">{splashScreens.length}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm">الشاشات النشطة</div>
          <div className="text-2xl font-bold mt-1 text-green-500">
            {splashScreens.filter(s => s.isActive).length}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm">إجمالي المشاهدات</div>
          <div className="text-2xl font-bold mt-1">
            {splashScreens.reduce((acc, s) => acc + s.viewCount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm">متوسط التفاعل</div>
          <div className="text-2xl font-bold mt-1 text-blue-500">
            {(() => {
              const totalViews = splashScreens.reduce((acc, s) => acc + s.viewCount, 0);
              const totalClicks = splashScreens.reduce((acc, s) => acc + s.clickCount, 0);
              return totalViews > 0 ? `${((totalClicks / totalViews) * 100).toFixed(1)}%` : '0%';
            })()}
          </div>
        </div>
      </div>

      {/* قائمة الشاشات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {splashScreens.map(screen => (
          <div
            key={screen.id}
            className={`bg-gray-800 rounded-xl overflow-hidden border-2 transition-all ${
              screen.isActive ? 'border-green-500/50' : 'border-gray-700'
            }`}
          >
            {/* معاينة مصغرة */}
            <Styled
              className="h-40 p-4 flex flex-col justify-center items-center relative"
              css={{
                background: screen.backgroundGradient
                  ? `linear-gradient(135deg, ${screen.backgroundGradient.join(', ')})`
                  : screen.backgroundColor,
              }}
            >
              {!screen.isActive && (
                <div className="absolute top-2 left-2 bg-red-500/80 text-xs px-2 py-1 rounded">
                  معطّل
                </div>
              )}
              <Styled className="text-center" css={{ color: screen.textColor }}>
                <div className="text-lg font-bold mb-1">{screen.titleAr}</div>
                <div className="text-sm opacity-80 line-clamp-2">{screen.contentAr}</div>
              </Styled>
            </Styled>

            {/* المعلومات */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Styled
                    as="span"
                    className="px-2 py-1 rounded text-xs"
                    css={{ backgroundColor: `${screen.accentColor}30`, color: screen.accentColor }}
                  >
                    {SPLASH_TYPES.find(t => t.value === screen.type)?.label}
                  </Styled>
                  <span className="text-gray-400 text-xs">
                    {DISPLAY_FREQUENCIES.find(f => f.value === screen.displayFrequency)?.label}
                  </span>
                </div>
                <span className="text-gray-400 text-xs">
                  الأولوية: {screen.priority}
                </span>
              </div>

              {/* الإحصائيات */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-xs text-gray-400">مشاهدات</div>
                  <div className="font-bold">{screen.viewCount.toLocaleString()}</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-xs text-gray-400">نقرات</div>
                  <div className="font-bold">{screen.clickCount.toLocaleString()}</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-xs text-gray-400">تفاعل</div>
                  <div className="font-bold text-green-500">{getEngagementRate(screen)}</div>
                </div>
              </div>

              {/* الأزرار */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewScreen(screen)}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 py-2 rounded transition-colors"
                >
                  <Eye size={16} />
                  <span>معاينة</span>
                </button>
                <button
                  onClick={() => handleEdit(screen)}
                  className="flex-1 flex items-center justify-center gap-1 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 py-2 rounded transition-colors"
                >
                  <Edit2 size={16} />
                  <span>تعديل</span>
                </button>
                <button
                  onClick={() => handleToggleActive(screen.id)}
                  aria-label={screen.isActive ? 'تعطيل الشاشة' : 'تفعيل الشاشة'}
                  title={screen.isActive ? 'تعطيل الشاشة' : 'تفعيل الشاشة'}
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded transition-colors ${
                    screen.isActive
                      ? 'bg-red-600/20 text-red-500 hover:bg-red-600/30'
                      : 'bg-green-600/20 text-green-500 hover:bg-green-600/30'
                  }`}
                >
                  {screen.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(screen.id)}
                  aria-label="حذف الشاشة"
                  title="حذف الشاشة"
                  className="flex items-center justify-center px-3 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* رسالة فارغة */}
      {splashScreens.length === 0 && (
        <div className="text-center py-20">
          <Smartphone size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">لا توجد شاشات</h3>
          <p className="text-gray-500 mt-2">أضف شاشة بداية جديدة لعرضها للمستخدمين</p>
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold">
                {editingScreen ? 'تعديل الشاشة' : 'إضافة شاشة جديدة'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="إغلاق النافذة"
                title="إغلاق النافذة"
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              {[
                { id: 'content', label: 'المحتوى', icon: Type },
                { id: 'design', label: 'التصميم', icon: Palette },
                { id: 'action', label: 'الإجراء', icon: Link },
                { id: 'schedule', label: 'الجدولة', icon: Calendar },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'content' | 'design' | 'action' | 'schedule')}
                  className={`flex items-center gap-2 px-6 py-3 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-700 text-white border-b-2 border-green-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* تاب المحتوى */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  {/* النوع */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">نوع الشاشة</label>
                    <div className="grid grid-cols-4 gap-2">
                      {SPLASH_TYPES.map(type => (
                        <button
                          key={type.value}
                          onClick={() => setFormData({ ...formData, type: type.value })}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            formData.type === type.value
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <type.icon size={24} />
                          <span className="text-sm">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* العنوان */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">العنوان (عربي) *</label>
                      <input
                        type="text"
                        value={formData.titleAr}
                        onChange={e => setFormData({ ...formData, titleAr: e.target.value })}
                        aria-label="العنوان بالعربية"
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="ذكر اليوم"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">العنوان (إنجليزي)</label>
                      <input
                        type="text"
                        value={formData.titleEn || ''}
                        onChange={e => setFormData({ ...formData, titleEn: e.target.value })}
                        aria-label="العنوان بالإنجليزية"
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="Daily Dhikr"
                      />
                    </div>
                  </div>

                  {/* المحتوى */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">المحتوى الرئيسي (عربي) *</label>
                    <textarea
                      value={formData.contentAr}
                      onChange={e => setFormData({ ...formData, contentAr: e.target.value })}
                      rows={4}
                      aria-label="المحتوى الرئيسي بالعربية"
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                      placeholder="سُبْحَانَ اللَّهِ وَبِحَمْدِهِ..."
                    />
                  </div>

                  {/* العنوان الفرعي */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">العنوان الفرعي (اختياري)</label>
                    <input
                      type="text"
                      value={formData.subtitleAr || ''}
                      onChange={e => setFormData({ ...formData, subtitleAr: e.target.value })}                        aria-label="العنوان الفرعي"                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="فضل هذا الذكر..."
                    />
                  </div>

                  {/* المصدر */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">المصدر</label>
                    <input
                      type="text"
                      value={formData.sourceAr || ''}
                      onChange={e => setFormData({ ...formData, sourceAr: e.target.value })}                        aria-label="المصدر"                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="رواه البخاري"
                    />
                  </div>
                </div>
              )}

              {/* تاب التصميم */}
              {activeTab === 'design' && (
                <div className="space-y-6">
                  {/* لون الخلفية */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">لون الخلفية</label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_BACKGROUNDS.map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({ ...formData, backgroundColor: color, backgroundGradient: undefined })}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            formData.backgroundColor === color && !formData.backgroundGradient
                              ? 'border-white scale-110'
                              : 'border-transparent'
                          }`}
                          css={{ backgroundColor: color }}
                          aria-label={`اختيار اللون ${color}`}
                          title={color}
                        />
                      ))}
                      <input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={e => setFormData({ ...formData, backgroundColor: e.target.value, backgroundGradient: undefined })}
                        aria-label="اختيار لون الخلفية"
                        className="w-10 h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* التدرج اللوني */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">التدرج اللوني (اختياري)</label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_GRADIENTS.map((gradient, i) => (
                        <button
                          key={i}
                          onClick={() => setFormData({ ...formData, backgroundGradient: gradient })}
                          className={`w-16 h-10 rounded-lg border-2 transition-all ${
                            JSON.stringify(formData.backgroundGradient) === JSON.stringify(gradient)
                              ? 'border-white scale-110'
                              : 'border-transparent'
                          }`}
                          css={{ background: `linear-gradient(135deg, ${gradient.join(', ')})` }}
                          aria-label={`اختيار تدرج ${gradient[0]} إلى ${gradient[1]}`}
                          title={`${gradient[0]} → ${gradient[1]}`}
                        />
                      ))}
                      <button
                        onClick={() => setFormData({ ...formData, backgroundGradient: undefined })}
                        className="px-3 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600"
                      >
                        بدون تدرج
                      </button>
                    </div>
                  </div>

                  {/* ألوان النص */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">لون النص</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.textColor}
                          onChange={e => setFormData({ ...formData, textColor: e.target.value })}
                          aria-label="اختيار لون النص"
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.textColor}
                          onChange={e => setFormData({ ...formData, textColor: e.target.value })}
                          aria-label="كود لون النص"
                          placeholder="#ffffff"
                          className="flex-1 bg-gray-700 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">اللون المميز</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.accentColor}
                          onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                          aria-label="اختيار اللون المميز"
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.accentColor}
                          onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                          aria-label="كود اللون المميز"
                          placeholder="#2f7659"
                          className="flex-1 bg-gray-700 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* الأيقونة */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <input
                        type="checkbox"
                        checked={formData.showIcon}
                        onChange={e => setFormData({ ...formData, showIcon: e.target.checked })}
                        aria-label="إظهار أيقونة"
                        className="rounded"
                      />
                      إظهار أيقونة
                    </label>
                  </div>

                  {/* رابط الصورة */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">صورة الخلفية (URL)</label>
                    <input
                      type="url"
                      value={formData.backgroundImage || ''}
                      onChange={e => setFormData({ ...formData, backgroundImage: e.target.value })}
                      aria-label="رابط صورة الخلفية"
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              )}

              {/* تاب الإجراء */}
              {activeTab === 'action' && (
                <div className="space-y-4">
                  {/* نوع الإجراء */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">نوع الإجراء</label>
                    <select
                      value={formData.actionType}
                      onChange={e => setFormData({ ...formData, actionType: e.target.value as ActionType })}
                      aria-label="نوع الإجراء"
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      {ACTION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.actionType !== 'none' && (
                    <>
                      {/* نص الزر */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">نص الزر</label>
                        <input
                          type="text"
                          value={formData.actionLabel || ''}
                          onChange={e => setFormData({ ...formData, actionLabel: e.target.value })}                          aria-label="نص الزر"                          className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                          placeholder="ابدأ الآن"
                        />
                      </div>

                      {/* الهدف */}
                      {formData.actionType === 'navigate' ? (
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">الصفحة المستهدفة</label>
                          <select
                            value={formData.actionTarget || ''}
                            onChange={e => setFormData({ ...formData, actionTarget: e.target.value })}
                            aria-label="الصفحة المستهدفة"
                            className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                          >
                            <option value="">اختر صفحة</option>
                            {APP_SCREENS.map(screen => (
                              <option key={screen.value} value={screen.value}>
                                {screen.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">الرابط</label>
                          <input
                            type="url"
                            value={formData.actionTarget || ''}
                            onChange={e => setFormData({ ...formData, actionTarget: e.target.value })}
                            aria-label="الرابط"
                            className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="https://..."
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* تاب الجدولة */}
              {activeTab === 'schedule' && (
                <div className="space-y-4">
                  {/* تكرار العرض */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">تكرار العرض</label>
                    <select
                      value={formData.displayFrequency}
                      onChange={e => setFormData({ ...formData, displayFrequency: e.target.value as DisplayFrequency })}
                      aria-label="تكرار العرض"
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      {DISPLAY_FREQUENCIES.map(freq => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* مدة العرض */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      مدة العرض (ثواني): {formData.showDuration}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      value={formData.showDuration}
                      onChange={e => setFormData({ ...formData, showDuration: parseInt(e.target.value) })}
                      aria-label="مدة العرض بالثواني"
                      className="w-full"
                    />
                  </div>

                  {/* الأولوية */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">الأولوية (1 = الأعلى)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                      aria-label="الأولوية"
                      placeholder="1"
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  {/* تاريخ البدء والانتهاء */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">تاريخ البدء (اختياري)</label>
                      <input
                        type="date"
                        value={formData.startDate ? formData.startDate.split('T')[0] : ''}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })}
                        aria-label="تاريخ البدء"
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">تاريخ الانتهاء (اختياري)</label>
                      <input
                        type="date"
                        value={formData.endDate ? formData.endDate.split('T')[0] : ''}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value ? `${e.target.value}T23:59:59Z` : undefined })}
                        aria-label="تاريخ الانتهاء"
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* التفعيل */}
                  <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      aria-label="تفعيل الشاشة فوراً بعد الحفظ"
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="isActive" className="text-sm">
                      تفعيل الشاشة فوراً بعد الحفظ
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-700">
              <button
                onClick={() => setPreviewScreen(formData)}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-400"
              >
                <Eye size={18} />
                <span>معاينة</span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.titleAr || !formData.contentAr}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Save size={18} />
                  <span>حفظ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة المعاينة */}
      {previewScreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setPreviewScreen(null)}
        >
          <div className="absolute inset-0 bg-black/80" />
          
          {/* محاكاة الموبايل */}
          <div className="relative w-[375px] h-[812px] bg-black rounded-[50px] border-4 border-gray-700 overflow-hidden shadow-2xl">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10" />
            
            {/* الشاشة */}
            <Styled
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
              css={{
                background: previewScreen.backgroundGradient
                  ? `linear-gradient(180deg, ${previewScreen.backgroundGradient.join(', ')})`
                  : previewScreen.backgroundColor,
                backgroundImage: previewScreen.backgroundImage
                  ? `url(${previewScreen.backgroundImage})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* الأيقونة */}
              {previewScreen.showIcon && (
                <Styled
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  css={{ backgroundColor: `${previewScreen.accentColor}30` }}
                >
                  <Star size={40} style={{ color: previewScreen.accentColor }} />
                </Styled>
              )}

              {/* العنوان */}
              <Styled
                as="h1"
                className="text-2xl font-bold mb-4"
                css={{ color: previewScreen.textColor }}
              >
                {previewScreen.titleAr}
              </Styled>

              {/* المحتوى */}
              <Styled
                as="p"
                className="text-xl leading-relaxed mb-4"
                css={{ color: previewScreen.textColor }}
              >
                {previewScreen.contentAr}
              </Styled>

              {/* العنوان الفرعي */}
              {previewScreen.subtitleAr && (
                <Styled
                  as="p"
                  className="text-sm opacity-80 mb-4"
                  css={{ color: previewScreen.textColor }}
                >
                  {previewScreen.subtitleAr}
                </Styled>
              )}

              {/* المصدر */}
              {previewScreen.sourceAr && (
                <Styled
                  as="p"
                  className="text-xs opacity-60 mb-8"
                  css={{ color: previewScreen.textColor }}
                >
                  [{previewScreen.sourceAr}]
                </Styled>
              )}

              {/* زر الإجراء */}
              {previewScreen.actionType !== 'none' && previewScreen.actionLabel && (
                <Styled
                  as="button"
                  className="px-8 py-3 rounded-full font-bold"
                  css={{
                    backgroundColor: previewScreen.accentColor,
                    color: '#fff',
                  }}
                >
                  {previewScreen.actionLabel}
                </Styled>
              )}

              {/* زر التخطي */}
              <Styled
                as="button"
                className="absolute bottom-12 text-sm opacity-60"
                css={{ color: previewScreen.textColor }}
              >
                تخطي
              </Styled>
            </Styled>
          </div>

          {/* زر الإغلاق */}
          <button
            onClick={() => setPreviewScreen(null)}
            aria-label="إغلاق المعاينة"
            title="إغلاق المعاينة"
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SplashScreensPage;
