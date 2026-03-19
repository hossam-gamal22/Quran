// admin-panel/src/pages/HomePageManager.tsx
// إدارة الصفحة الرئيسية - تحكم كامل

import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Home,
  Layers,
  Palette,
  BookOpen,
  Star,
  Settings2,
  Type,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Styled } from '../components/Styled';

// ==================== Types ====================

interface HomeHighlightItem {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  order: number;
  builtIn: boolean;
}

interface HomeSection {
  id: string;
  name: string;
  titleAr: string;
  titleEn: string;
  enabled: boolean;
  order: number;
}

interface DailyContentConfig {
  storyMode: 'auto' | 'manual';
  storyVerse: { surah: number; ayah: number } | null;
  storyCustomText: string;
  verseMode: 'auto' | 'manual';
  verse: { surah: number; ayah: number } | null;
  verseCustomText: string;
}

interface QuickAccessItem {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  enabled: boolean;
  order: number;
  route?: string;
}

interface ThemeConfig {
  primary: string;
  accent: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  headerGradientStart: string;
  headerGradientEnd: string;
  backgroundImageUrl: string;
  appIconUrl: string;
}

interface HomePageConfig {
  highlights: {
    items: HomeHighlightItem[];
  };
  sections: {
    items: HomeSection[];
  };
  quickAccess: {
    items: QuickAccessItem[];
  };
  dailyContent: DailyContentConfig;
  theme: ThemeConfig;
  updatedAt?: string;
}

// ==================== Defaults ====================

const FIRESTORE_DOC = 'appConfig/homePageConfig';

// يجب أن تتطابق مع builtInHighlights في DailyHighlights.tsx
const DEFAULT_HIGHLIGHTS: HomeHighlightItem[] = [
  { id: 'hijri-date', name: 'التاريخ الهجري', icon: '📅', enabled: true, order: 0, builtIn: true },
  { id: 'radio', name: 'إذاعة القرآن', icon: '📻', enabled: true, order: 1, builtIn: true },
  { id: 'azkar-adhkar', name: 'ذكر اليوم', icon: '🤲', enabled: true, order: 2, builtIn: true },
  { id: 'daily-dua', name: 'دعاء اليوم', icon: '📖', enabled: true, order: 3, builtIn: true },
  { id: 'daily-ayah', name: 'آية اليوم', icon: '📗', enabled: true, order: 4, builtIn: true },
  { id: 'daily-story', name: 'فيديو اليوم', icon: '▶️', enabled: true, order: 5, builtIn: true },
  { id: 'next-prayer', name: 'الصلاة القادمة', icon: '🕌', enabled: true, order: 6, builtIn: true },
];

// يجب أن تتطابق مع MODAL_CATEGORIES في index.tsx + الأقسام الثابتة
const DEFAULT_SECTIONS: HomeSection[] = [
  { id: 'welcome_banner', name: 'الرسالة الترحيبية', titleAr: '', titleEn: '', enabled: true, order: 0 },
  { id: 'highlights', name: 'الهايلايتس', titleAr: '', titleEn: '', enabled: true, order: 1 },
  { id: 'quick_access', name: 'الوصول السريع', titleAr: 'الوصول السريع', titleEn: 'Quick Access', enabled: true, order: 2 },
  { id: 'cat_azkar', name: '📿 الأذكار', titleAr: 'الأذكار', titleEn: 'Azkar', enabled: true, order: 3 },
  { id: 'cat_stories', name: '📖 القصص', titleAr: 'القصص', titleEn: 'Stories', enabled: true, order: 4 },
  { id: 'cat_hajj', name: '🕋 الحج والعمرة', titleAr: 'مناسك الحج والعمرة', titleEn: 'Hajj & Umrah', enabled: true, order: 5 },
  { id: 'cat_quran', name: '📗 سور وآيات قرآنية', titleAr: 'سور وآيات قرآنية', titleEn: 'Quran Surahs & Verses', enabled: true, order: 6 },
  { id: 'cat_duas', name: '🤲 أدعية وأحاديث', titleAr: 'أدعية وأحاديث', titleEn: 'Duas & Hadith', enabled: true, order: 7 },
  { id: 'cat_worship', name: '🕌 عبادات', titleAr: 'عبادات', titleEn: 'Worship', enabled: true, order: 8 },
  { id: 'cat_tasbih', name: '📿 تسبيح واستغفار', titleAr: 'تسبيح واستغفار', titleEn: 'Tasbih & Istighfar', enabled: true, order: 9 },
  { id: 'cat_marifat', name: '✨ معرفة الله', titleAr: 'معرفة الله', titleEn: 'Know Allah', enabled: true, order: 10 },
  { id: 'ads', name: '📢 الإعلانات', titleAr: '', titleEn: '', enabled: true, order: 11 },
];

const DEFAULT_QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'qibla', nameAr: 'القبلة', nameEn: 'Qibla', icon: 'compass', color: '#5856D6', enabled: true, order: 0, route: '' },
  { id: 'favorites', nameAr: 'المحفوظات', nameEn: 'Favorites', icon: 'heart', color: '#FF6B6B', enabled: true, order: 1, route: '' },
  { id: 'ayat_kursi', nameAr: 'آية الكرسي', nameEn: 'Ayat Al-Kursi', icon: 'shield-star', color: '#DAA520', enabled: true, order: 2, route: '' },
  { id: 'surah_kahf', nameAr: 'سورة الكهف', nameEn: 'Al-Kahf', icon: 'book-open-page-variant', color: '#3a7ca5', enabled: true, order: 3, route: '' },
  { id: 'surah_yasin', nameAr: 'سورة يس', nameEn: 'Yasin', icon: 'book-open-page-variant', color: '#5d4e8c', enabled: true, order: 4, route: '' },
  { id: 'surah_mulk', nameAr: 'سورة الملك', nameEn: 'Al-Mulk', icon: 'book-open-page-variant', color: '#0D9488', enabled: true, order: 5, route: '' },
  { id: 'names', nameAr: 'أسماء الله الحسنى', nameEn: 'Names of Allah', icon: 'star-crescent', color: '#c17f59', enabled: true, order: 6, route: '' },
  { id: 'tasbih', nameAr: 'التسبيح', nameEn: 'Tasbih', icon: 'counter', color: '#2f7659', enabled: true, order: 7, route: '' },
  { id: 'salawat', nameAr: 'الصلاة على النبي', nameEn: 'Salawat', icon: 'star-crescent', color: '#e91e63', enabled: true, order: 8, route: '' },
  { id: 'istighfar', nameAr: 'الاستغفار', nameEn: 'Istighfar', icon: 'heart', color: '#8B5CF6', enabled: true, order: 9, route: '' },
  { id: 'hajj', nameAr: 'الحج والعمرة', nameEn: 'Hajj & Umrah', icon: 'star-crescent', color: '#0D9488', enabled: true, order: 10, route: '' },
  { id: 'seerah', nameAr: 'السيرة النبوية', nameEn: 'Seerah', icon: 'book-account', color: '#6366F1', enabled: true, order: 11, route: '' },
  { id: 'benefit_azkar', nameAr: 'فضل الأذكار', nameEn: 'Azkar Benefits', icon: 'information', color: '#f5a623', enabled: true, order: 12, route: '' },
  { id: 'radio', nameAr: 'إذاعة القرآن', nameEn: 'Quran Radio', icon: 'radio', color: '#22C55E', enabled: true, order: 13, route: '' },
  // صفحات إضافية يمكن إضافتها للوصول السريع
  { id: 'page_browse_tafsir', nameAr: 'استعراض التفسير', nameEn: 'Browse Tafsir', icon: 'book-search', color: '#3a7ca5', enabled: false, order: 14, route: '/browse-tafsir' },
  { id: 'page_hijri', nameAr: 'التقويم الهجري', nameEn: 'Hijri Calendar', icon: 'calendar-month', color: '#0D9488', enabled: false, order: 15, route: '/hijri' },
  { id: 'page_widget_settings', nameAr: 'إعدادات الودجات', nameEn: 'Widget Settings', icon: 'widgets', color: '#6366F1', enabled: false, order: 16, route: '/widget-settings' },
  { id: 'page_daily_dua', nameAr: 'دعاء اليوم', nameEn: 'Daily Dua', icon: 'hands-pray', color: '#c17f59', enabled: false, order: 17, route: '/daily-dua' },
  { id: 'page_ruqya', nameAr: 'الرقية الشرعية', nameEn: 'Ruqya', icon: 'shield-check', color: '#e91e63', enabled: false, order: 18, route: '/ruqya' },
  { id: 'page_companions', nameAr: 'قصص الصحابة', nameEn: 'Companions', icon: 'account-group', color: '#2f7659', enabled: false, order: 19, route: '/companions' },
  { id: 'page_quran_bookmarks', nameAr: 'إشارات المصحف', nameEn: 'Quran Bookmarks', icon: 'bookmark', color: '#4CAF50', enabled: false, order: 20, route: '/quran-bookmarks' },
  { id: 'page_worship_tracker', nameAr: 'تتبع العبادات', nameEn: 'Worship Tracker', icon: 'chart-line', color: '#2f7659', enabled: false, order: 21, route: '/worship-tracker' },
  { id: 'page_seerah', nameAr: 'السيرة النبوية', nameEn: 'Seerah', icon: 'book-account', color: '#2f7659', enabled: false, order: 22, route: '/seerah' },
  { id: 'page_names', nameAr: 'أسماء الله الحسنى', nameEn: 'Names of Allah', icon: 'star-crescent', color: '#DAA520', enabled: false, order: 23, route: '/names' },
];

const DEFAULT_DAILY_CONTENT: DailyContentConfig = {
  storyMode: 'auto',
  storyVerse: null,
  storyCustomText: '',
  verseMode: 'auto',
  verse: null,
  verseCustomText: '',
};

const DEFAULT_THEME: ThemeConfig = {
  primary: '#1B4332',
  accent: '#2f7659',
  background: '#f5f5f5',
  cardBackground: '#ffffff',
  textPrimary: '#333333',
  textSecondary: '#888888',
  headerGradientStart: '#1B4332',
  headerGradientEnd: '#2f7659',
  backgroundImageUrl: '',
  appIconUrl: '',
};

const DEFAULT_CONFIG: HomePageConfig = {
  highlights: { items: DEFAULT_HIGHLIGHTS },
  sections: { items: DEFAULT_SECTIONS },
  quickAccess: { items: DEFAULT_QUICK_ACCESS },
  dailyContent: DEFAULT_DAILY_CONTENT,
  theme: DEFAULT_THEME,
};

// ==================== Color Presets ====================

const COLOR_PRESETS = [
  { value: '#1B4332', label: 'أخضر داكن' },
  { value: '#2f7659', label: 'أخضر' },
  { value: '#0D9488', label: 'تركوازي' },
  { value: '#1e40af', label: 'أزرق' },
  { value: '#5b21b6', label: 'بنفسجي' },
  { value: '#be123c', label: 'أحمر' },
  { value: '#DAA520', label: 'ذهبي' },
  { value: '#7c2d12', label: 'بني' },
  { value: '#e91e63', label: 'وردي' },
  { value: '#333333', label: 'رمادي داكن' },
];

// ==================== Component ====================

type ActiveTab = 'sections' | 'highlights' | 'quick_access' | 'daily' | 'theme';

export default function HomePageManager() {
  const [config, setConfig] = useState<HomePageConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<ActiveTab>('sections');

  // Load config from Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const docRef = doc(db, FIRESTORE_DOC);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<HomePageConfig>;
          setConfig({
            highlights: {
              items: data.highlights?.items?.length
                ? data.highlights.items.map((h, i) => ({ ...DEFAULT_HIGHLIGHTS.find(d => d.id === h.id) || {}, ...h, order: h.order ?? i }))
                : DEFAULT_HIGHLIGHTS,
            },
            sections: {
              items: data.sections?.items?.length
                ? data.sections.items.map((s, i) => ({ ...DEFAULT_SECTIONS.find(d => d.id === s.id) || {}, ...s, order: s.order ?? i }))
                : DEFAULT_SECTIONS,
            },
            quickAccess: {
              items: data.quickAccess?.items?.length
                ? data.quickAccess.items.map((q, i) => ({ ...DEFAULT_QUICK_ACCESS.find(d => d.id === q.id) || {}, ...q, order: q.order ?? i }))
                : DEFAULT_QUICK_ACCESS,
            },
            dailyContent: { ...DEFAULT_DAILY_CONTENT, ...data.dailyContent },
            theme: { ...DEFAULT_THEME, ...data.theme },
          });
        }
      } catch (err) {
        console.error('Error loading home page config:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Save config to Firestore
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const docRef = doc(db, FIRESTORE_DOC);
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving home page config:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== Highlights Helpers ====================

  const moveItem = <T extends { order: number; id: string }>(
    items: T[],
    id: string,
    direction: 'up' | 'down'
  ): T[] => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(h => h.id === id);
    if (direction === 'up' && idx > 0) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx - 1].order;
      sorted[idx - 1].order = temp;
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx + 1].order;
      sorted[idx + 1].order = temp;
    }
    return sorted;
  };

  const updateHighlight = <K extends keyof HomeHighlightItem>(id: string, key: K, value: HomeHighlightItem[K]) => {
    setConfig(prev => ({
      ...prev,
      highlights: {
        items: prev.highlights.items.map(h => h.id === id ? { ...h, [key]: value } : h),
      },
    }));
  };

  const moveHighlight = (id: string, direction: 'up' | 'down') => {
    setConfig(prev => ({
      ...prev,
      highlights: { items: moveItem(prev.highlights.items, id, direction) },
    }));
  };

  const updateSection = <K extends keyof HomeSection>(id: string, key: K, value: HomeSection[K]) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        items: prev.sections.items.map(s => s.id === id ? { ...s, [key]: value } : s),
      },
    }));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setConfig(prev => ({
      ...prev,
      sections: { items: moveItem(prev.sections.items, id, direction) },
    }));
  };

  // ==================== Quick Access Helpers ====================

  const updateQuickAccess = <K extends keyof QuickAccessItem>(id: string, key: K, value: QuickAccessItem[K]) => {
    setConfig(prev => ({
      ...prev,
      quickAccess: {
        items: prev.quickAccess.items.map(q => q.id === id ? { ...q, [key]: value } : q),
      },
    }));
  };

  const moveQuickAccess = (id: string, direction: 'up' | 'down') => {
    setConfig(prev => ({
      ...prev,
      quickAccess: { items: moveItem(prev.quickAccess.items, id, direction) },
    }));
  };

  const updateDailyContent = <K extends keyof DailyContentConfig>(key: K, value: DailyContentConfig[K]) => {
    setConfig(prev => ({
      ...prev,
      dailyContent: { ...prev.dailyContent, [key]: value },
    }));
  };

  const updateTheme = (key: keyof ThemeConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      theme: { ...prev.theme, [key]: value },
    }));
  };

  // ==================== Render ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'sections', label: 'أقسام الصفحة', icon: <Layers className="w-4 h-4" /> },
    { key: 'highlights', label: 'الهايلايتس', icon: <Star className="w-4 h-4" /> },
    { key: 'quick_access', label: 'الوصول السريع', icon: <Zap className="w-4 h-4" /> },
    { key: 'daily', label: 'المحتوى اليومي', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'theme', label: 'المظهر والألوان', icon: <Palette className="w-4 h-4" /> },
  ];

  const sortedHighlights = [...config.highlights.items].sort((a, b) => a.order - b.order);
  const sortedSections = [...config.sections.items].sort((a, b) => a.order - b.order);
  const sortedQuickAccess = [...config.quickAccess.items].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Home className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة الصفحة الرئيسية</h1>
            <p className="text-slate-400 text-sm">تحكم في أقسام ومحتوى الصفحة الرئيسية</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
            saveStatus === 'success'
              ? 'bg-green-500 text-white'
              : saveStatus === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSaving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : saveStatus === 'error' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? 'جاري الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : saveStatus === 'error' ? 'خطأ!' : 'حفظ التغييرات'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== Sections Manager ==================== */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p className="text-sm text-slate-400">
              تحكم في ترتيب وظهور أقسام الصفحة الرئيسية. يمكنك تعديل عنوان كل قسم وإخفاءه أو إظهاره.
            </p>
          </div>

          <div className="space-y-3">
            {sortedSections.map((section, index) => (
              <div
                key={section.id}
                className={`bg-slate-800 rounded-2xl border transition-all ${
                  section.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveSection(section.id, 'up')}
                      disabled={index === 0}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="تحريك لأعلى"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSection(section.id, 'down')}
                      disabled={index === sortedSections.length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="تحريك لأسفل"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Order badge */}
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold">
                    {index + 1}
                  </div>

                  {/* Section info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{section.name}</p>
                    <p className="text-xs text-slate-500">{section.id}</p>
                  </div>

                  {/* Title edit */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={section.titleAr}
                      onChange={(e) => updateSection(section.id, 'titleAr', e.target.value)}
                      className="bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm w-36 focus:border-emerald-500 focus:outline-none"
                      placeholder="العنوان بالعربي"
                      aria-label="العنوان بالعربي"
                      dir="rtl"
                    />
                    <input
                      type="text"
                      value={section.titleEn}
                      onChange={(e) => updateSection(section.id, 'titleEn', e.target.value)}
                      className="bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm w-36 focus:border-emerald-500 focus:outline-none"
                      placeholder="English title"
                      aria-label="English title"
                      dir="ltr"
                    />
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => updateSection(section.id, 'enabled', !section.enabled)}
                    className="flex-shrink-0"
                    aria-label={section.enabled ? 'إخفاء القسم' : 'إظهار القسم'}
                    title={section.enabled ? 'إخفاء القسم' : 'إظهار القسم'}
                  >
                    {section.enabled ? (
                      <Eye className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== Highlights Manager ==================== */}
      {activeTab === 'highlights' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p className="text-sm text-slate-400">
              تحكم في عناصر الهايلايتس المدمجة على الصفحة الرئيسية — أيقونات الوصول السريع الدائرية أعلى الصفحة.
              للهايلايتس المخصصة (روابط خارجية، HTML) استخدم صفحة{' '}
              <a href="/highlights" className="text-emerald-400 underline">إدارة الهايلايتس</a>.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">معاينة الترتيب</h3>
            <div className="bg-slate-900 rounded-2xl p-6">
              <div className="flex gap-5 overflow-x-auto pb-2" dir="rtl">
                {sortedHighlights.filter(h => h.enabled).map(h => (
                  <Styled key={h.id} className="flex flex-col items-center gap-2 flex-shrink-0" css={{ width: 70 }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-[3px] border-emerald-600 bg-slate-800">
                      {h.icon}
                    </div>
                    <span className="text-slate-300 text-[11px] text-center leading-tight truncate w-full">
                      {h.name}
                    </span>
                  </Styled>
                ))}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {sortedHighlights.map((item, index) => (
              <div
                key={item.id}
                className={`bg-slate-800 rounded-2xl border transition-all ${
                  item.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Reorder */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveHighlight(item.id, 'up')}
                      disabled={index === 0}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="تحريك لأعلى"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveHighlight(item.id, 'down')}
                      disabled={index === sortedHighlights.length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="تحريك لأسفل"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                    {item.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.builtIn ? '🔒 مدمج' : '✨ مخصص'} · {item.id}
                    </p>
                  </div>

                  {/* Name edit */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateHighlight(item.id, 'name', e.target.value)}
                    className="bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm w-36 focus:border-emerald-500 focus:outline-none"
                    placeholder="اسم العنصر"
                    aria-label="اسم العنصر"
                    dir="rtl"
                  />

                  {/* Toggle */}
                  <button
                    onClick={() => updateHighlight(item.id, 'enabled', !item.enabled)}
                    className="flex-shrink-0"
                    aria-label={item.enabled ? 'إخفاء العنصر' : 'إظهار العنصر'}
                    title={item.enabled ? 'إخفاء العنصر' : 'إظهار العنصر'}
                  >
                    {item.enabled ? (
                      <Eye className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== Quick Access ==================== */}
      {activeTab === 'quick_access' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <p className="text-slate-400 text-sm">
              تحكم بترتيب وظهور عناصر الوصول السريع في الصفحة الرئيسية. يمكنك تفعيل أو تعطيل أي عنصر وتغيير ترتيبه.
            </p>
          </div>

          {/* List */}
          <div className="space-y-3">
            {sortedQuickAccess.map((item, index) => (
              <div
                key={item.id}
                className={`bg-slate-800 rounded-2xl border transition-all ${
                  item.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Reorder */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveQuickAccess(item.id, 'up')}
                      disabled={index === 0}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="تحريك لأعلى"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveQuickAccess(item.id, 'down')}
                      disabled={index === sortedQuickAccess.length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="تحريك لأسفل"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Color dot */}
                  <Styled
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    css={{ backgroundColor: item.color }}
                  >
                    {index + 1}
                  </Styled>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{item.nameAr}</p>
                    <p className="text-xs text-slate-500">{item.nameEn} · {item.icon}</p>
                  </div>

                  {/* Color picker */}
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) => updateQuickAccess(item.id, 'color', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer flex-shrink-0"
                    aria-label="لون العنصر"
                    title="لون العنصر"
                  />

                  {/* Toggle */}
                  <button
                    onClick={() => updateQuickAccess(item.id, 'enabled', !item.enabled)}
                    className="flex-shrink-0"
                    aria-label={item.enabled ? 'إخفاء العنصر' : 'إظهار العنصر'}
                    title={item.enabled ? 'إخفاء العنصر' : 'إظهار العنصر'}
                  >
                    {item.enabled ? (
                      <Eye className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== Daily Content ==================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Story of the Day */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <span className="text-xl">▶️</span>
                فيديو اليوم
              </h3>
              <p className="text-slate-400 text-sm mt-1">تحكم في محتوى فيديو اليوم اليومي</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-300">الوضع:</label>
                <div className="flex bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => updateDailyContent('storyMode', 'auto')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      config.dailyContent.storyMode === 'auto'
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تلقائي
                  </button>
                  <button
                    onClick={() => updateDailyContent('storyMode', 'manual')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      config.dailyContent.storyMode === 'manual'
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    يدوي
                  </button>
                </div>
              </div>

              {config.dailyContent.storyMode === 'auto' && (
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    ✅ الوضع التلقائي — يتم اختيار الآية تلقائياً بناءً على يوم السنة (deterministic).
                  </p>
                </div>
              )}

              {config.dailyContent.storyMode === 'manual' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">رقم السورة</label>
                      <input
                        type="number"
                        min={1}
                        max={114}
                        value={config.dailyContent.storyVerse?.surah || ''}
                        onChange={(e) => {
                          const surah = parseInt(e.target.value) || 1;
                          updateDailyContent('storyVerse', {
                            surah,
                            ayah: config.dailyContent.storyVerse?.ayah || 1,
                          });
                        }}
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none"
                        placeholder="1-114"
                        aria-label="رقم السورة"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">رقم الآية</label>
                      <input
                        type="number"
                        min={1}
                        value={config.dailyContent.storyVerse?.ayah || ''}
                        onChange={(e) => {
                          const ayah = parseInt(e.target.value) || 1;
                          updateDailyContent('storyVerse', {
                            surah: config.dailyContent.storyVerse?.surah || 1,
                            ayah,
                          });
                        }}
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none"
                        placeholder="رقم الآية"
                        aria-label="رقم الآية"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">نص مخصص (اختياري)</label>
                    <textarea
                      value={config.dailyContent.storyCustomText}
                      onChange={(e) => updateDailyContent('storyCustomText', e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none resize-y h-24"
                      placeholder="نص مخصص يظهر في الستوري..."
                      aria-label="نص مخصص للستوري"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verse of the Day */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <span className="text-xl">📖</span>
                آية اليوم
              </h3>
              <p className="text-slate-400 text-sm mt-1">تحكم في محتوى آية اليوم</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-300">الوضع:</label>
                <div className="flex bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => updateDailyContent('verseMode', 'auto')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      config.dailyContent.verseMode === 'auto'
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تلقائي
                  </button>
                  <button
                    onClick={() => updateDailyContent('verseMode', 'manual')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      config.dailyContent.verseMode === 'manual'
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    يدوي
                  </button>
                </div>
              </div>

              {config.dailyContent.verseMode === 'auto' && (
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    ✅ الوضع التلقائي — يتم اختيار آية يومية بناءً على يوم السنة من api.alquran.cloud.
                  </p>
                </div>
              )}

              {config.dailyContent.verseMode === 'manual' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">رقم السورة</label>
                      <input
                        type="number"
                        min={1}
                        max={114}
                        value={config.dailyContent.verse?.surah || ''}
                        onChange={(e) => {
                          const surah = parseInt(e.target.value) || 1;
                          updateDailyContent('verse', {
                            surah,
                            ayah: config.dailyContent.verse?.ayah || 1,
                          });
                        }}
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none"
                        placeholder="1-114"
                        aria-label="رقم السورة"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">رقم الآية</label>
                      <input
                        type="number"
                        min={1}
                        value={config.dailyContent.verse?.ayah || ''}
                        onChange={(e) => {
                          const ayah = parseInt(e.target.value) || 1;
                          updateDailyContent('verse', {
                            surah: config.dailyContent.verse?.surah || 1,
                            ayah,
                          });
                        }}
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none"
                        placeholder="رقم الآية"
                        aria-label="رقم الآية"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">نص مخصص (اختياري)</label>
                    <textarea
                      value={config.dailyContent.verseCustomText}
                      onChange={(e) => updateDailyContent('verseCustomText', e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none resize-y h-24"
                      placeholder="نص الآية المخصص..."
                      aria-label="نص الآية المخصص"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== Theme & Appearance ==================== */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          {/* Colors */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-400" />
                الألوان الرئيسية
              </h3>
            </div>
            <div className="p-5 space-y-5">
              {([
                { key: 'primary' as const, label: 'اللون الأساسي', desc: 'لون التطبيق الرئيسي (الهيدر، الأزرار)' },
                { key: 'accent' as const, label: 'لون التأكيد', desc: 'لون ثانوي للعناصر التفاعلية' },
                { key: 'background' as const, label: 'لون الخلفية', desc: 'خلفية الشاشات الرئيسية' },
                { key: 'cardBackground' as const, label: 'لون البطاقات', desc: 'خلفية البطاقات والأقسام' },
                { key: 'textPrimary' as const, label: 'لون النص الأساسي', desc: 'لون النصوص الرئيسية' },
                { key: 'textSecondary' as const, label: 'لون النص الثانوي', desc: 'لون النصوص الفرعية' },
                { key: 'headerGradientStart' as const, label: 'تدرج الهيدر (بداية)', desc: 'بداية تدرج لون الهيدر' },
                { key: 'headerGradientEnd' as const, label: 'تدرج الهيدر (نهاية)', desc: 'نهاية تدرج لون الهيدر' },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-slate-500 text-xs">{desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Color presets */}
                    <div className="flex gap-1">
                      {COLOR_PRESETS.slice(0, 6).map(c => (
                        <Styled
                          as="button"
                          key={c.value}
                          onClick={() => updateTheme(key, c.value)}
                          className={`w-6 h-6 rounded-full transition-all ${
                            config.theme[key] === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                          }`}
                          css={{ backgroundColor: c.value }}
                          aria-label={c.label}
                          title={c.label}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={config.theme[key]}
                      onChange={(e) => updateTheme(key, e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer"
                      aria-label={`${label} - اختيار لون`}
                    />
                    <input
                      type="text"
                      value={config.theme[key]}
                      onChange={(e) => updateTheme(key, e.target.value)}
                      className="bg-slate-700 text-white rounded-lg px-3 py-1.5 w-28 border border-slate-600 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                      aria-label={`${label} - كود اللون`}
                      placeholder="#000000"
                      dir="ltr"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Images & Icons */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                الصور والأيقونات
              </h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">رابط صورة الخلفية</label>
                <input
                  type="text"
                  value={config.theme.backgroundImageUrl}
                  onChange={(e) => updateTheme('backgroundImageUrl', e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="https://example.com/background.jpg"
                  aria-label="رابط صورة الخلفية"
                  dir="ltr"
                />
                {config.theme.backgroundImageUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={config.theme.backgroundImageUrl}
                      alt="Background preview"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-600"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      onClick={() => updateTheme('backgroundImageUrl', '')}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      إزالة
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">رابط أيقونة التطبيق</label>
                <input
                  type="text"
                  value={config.theme.appIconUrl}
                  onChange={(e) => updateTheme('appIconUrl', e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="https://example.com/icon.png"
                  aria-label="رابط أيقونة التطبيق"
                  dir="ltr"
                />
                {config.theme.appIconUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={config.theme.appIconUrl}
                      alt="App icon preview"
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-600"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      onClick={() => updateTheme('appIconUrl', '')}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      إزالة
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Theme Preview */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg">معاينة الألوان</h3>
            </div>
            <div className="p-5">
              <Styled
                className="rounded-2xl p-6 space-y-4"
                css={{ backgroundColor: config.theme.background }}
              >
                {/* Header preview */}
                <Styled
                  className="rounded-xl p-4 flex items-center justify-between"
                  css={{
                    background: `linear-gradient(135deg, ${config.theme.headerGradientStart}, ${config.theme.headerGradientEnd})`,
                  }}
                >
                  <span className="text-white font-bold text-lg">روح المسلم</span>
                  <span className="text-white/80 text-sm">٣ رمضان ١٤٤٧</span>
                </Styled>

                {/* Card preview */}
                <Styled
                  className="rounded-xl p-4"
                  css={{ backgroundColor: config.theme.cardBackground }}
                >
                  <Styled as="p" css={{ color: config.theme.textPrimary }} className="font-bold">عنوان البطاقة</Styled>
                  <Styled as="p" css={{ color: config.theme.textSecondary }} className="text-sm mt-1">نص ثانوي توضيحي</Styled>
                  <Styled
                    as="button"
                    className="mt-3 px-4 py-2 rounded-lg text-white text-sm"
                    css={{ backgroundColor: config.theme.accent }}
                  >
                    زر التفاعل
                  </Styled>
                </Styled>

                {/* Accent elements */}
                <div className="flex gap-3">
                  <Styled
                    className="flex-1 rounded-xl p-3 text-center text-white text-sm font-medium"
                    css={{ backgroundColor: config.theme.primary }}
                  >
                    اللون الأساسي
                  </Styled>
                  <Styled
                    className="flex-1 rounded-xl p-3 text-center text-white text-sm font-medium"
                    css={{ backgroundColor: config.theme.accent }}
                  >
                    لون التأكيد
                  </Styled>
                </div>
              </Styled>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
