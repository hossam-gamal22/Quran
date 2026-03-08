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
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  dailyContent: DailyContentConfig;
  theme: ThemeConfig;
  updatedAt?: string;
}

// ==================== Defaults ====================

const FIRESTORE_DOC = 'appConfig/homePageConfig';

const DEFAULT_HIGHLIGHTS: HomeHighlightItem[] = [
  { id: 'hijri', name: 'التاريخ الهجري', icon: '📅', enabled: true, order: 0, builtIn: true },
  { id: 'morning_azkar', name: 'أذكار الصباح', icon: '🌅', enabled: true, order: 1, builtIn: true },
  { id: 'evening_azkar', name: 'أذكار المساء', icon: '🌆', enabled: true, order: 2, builtIn: true },
  { id: 'daily_ayah', name: 'آية اليوم', icon: '📖', enabled: true, order: 3, builtIn: true },
  { id: 'story_of_day', name: 'ستوري اليوم', icon: '▶️', enabled: true, order: 4, builtIn: true },
  { id: 'prayer_times', name: 'مواقيت الصلاة', icon: '🕌', enabled: true, order: 5, builtIn: true },
  { id: 'tasbih', name: 'التسبيح', icon: '📿', enabled: true, order: 6, builtIn: true },
  { id: 'qibla', name: 'القبلة', icon: '🧭', enabled: true, order: 7, builtIn: true },
];

const DEFAULT_SECTIONS: HomeSection[] = [
  { id: 'welcome_banner', name: 'الرسالة الترحيبية', titleAr: 'رمضان مبارك', titleEn: 'Ramadan Mubarak', enabled: true, order: 0 },
  { id: 'highlights', name: 'الهايلايتس', titleAr: '', titleEn: '', enabled: true, order: 1 },
  { id: 'quick_access', name: 'الوصول السريع', titleAr: 'الوصول السريع', titleEn: 'Quick Access', enabled: true, order: 2 },
  { id: 'azkar', name: 'الأذكار', titleAr: 'الأذكار', titleEn: 'Azkar', enabled: true, order: 3 },
  { id: 'duas', name: 'الأدعية والرقية', titleAr: 'الأدعية والرقية', titleEn: 'Duas & Ruqyah', enabled: true, order: 4 },
  { id: 'worship', name: 'العبادات', titleAr: 'العبادات', titleEn: 'Worship', enabled: true, order: 5 },
  { id: 'ads', name: 'الإعلانات', titleAr: '', titleEn: '', enabled: true, order: 6 },
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

type ActiveTab = 'sections' | 'highlights' | 'daily' | 'theme';

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

  const updateHighlight = (id: string, key: keyof HomeHighlightItem, value: any) => {
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

  const updateSection = (id: string, key: keyof HomeSection, value: any) => {
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

  const updateDailyContent = (key: keyof DailyContentConfig, value: any) => {
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
    { key: 'daily', label: 'المحتوى اليومي', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'theme', label: 'المظهر والألوان', icon: <Palette className="w-4 h-4" /> },
  ];

  const sortedHighlights = [...config.highlights.items].sort((a, b) => a.order - b.order);
  const sortedSections = [...config.sections.items].sort((a, b) => a.order - b.order);

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
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSection(section.id, 'down')}
                      disabled={index === sortedSections.length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
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
                      dir="rtl"
                    />
                    <input
                      type="text"
                      value={section.titleEn}
                      onChange={(e) => updateSection(section.id, 'titleEn', e.target.value)}
                      className="bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm w-36 focus:border-emerald-500 focus:outline-none"
                      placeholder="English title"
                      dir="ltr"
                    />
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => updateSection(section.id, 'enabled', !section.enabled)}
                    className="flex-shrink-0"
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
                  <div key={h.id} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 70 }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-[3px] border-emerald-600 bg-slate-800">
                      {h.icon}
                    </div>
                    <span className="text-slate-300 text-[11px] text-center leading-tight truncate w-full">
                      {h.name}
                    </span>
                  </div>
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
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveHighlight(item.id, 'down')}
                      disabled={index === sortedHighlights.length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
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
                    dir="rtl"
                  />

                  {/* Toggle */}
                  <button
                    onClick={() => updateHighlight(item.id, 'enabled', !item.enabled)}
                    className="flex-shrink-0"
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
                ستوري اليوم
              </h3>
              <p className="text-slate-400 text-sm mt-1">تحكم في محتوى ستوري اليوم اليومي</p>
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
                        <button
                          key={c.value}
                          onClick={() => updateTheme(key, c.value)}
                          className={`w-6 h-6 rounded-full transition-all ${
                            config.theme[key] === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={config.theme[key]}
                      onChange={(e) => updateTheme(key, e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.theme[key]}
                      onChange={(e) => updateTheme(key, e.target.value)}
                      className="bg-slate-700 text-white rounded-lg px-3 py-1.5 w-28 border border-slate-600 text-sm font-mono focus:border-emerald-500 focus:outline-none"
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
              <div
                className="rounded-2xl p-6 space-y-4"
                style={{ backgroundColor: config.theme.background }}
              >
                {/* Header preview */}
                <div
                  className="rounded-xl p-4 flex items-center justify-between"
                  style={{
                    background: `linear-gradient(135deg, ${config.theme.headerGradientStart}, ${config.theme.headerGradientEnd})`,
                  }}
                >
                  <span className="text-white font-bold text-lg">روح المسلم</span>
                  <span className="text-white/80 text-sm">٣ رمضان ١٤٤٧</span>
                </div>

                {/* Card preview */}
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: config.theme.cardBackground }}
                >
                  <p style={{ color: config.theme.textPrimary }} className="font-bold">عنوان البطاقة</p>
                  <p style={{ color: config.theme.textSecondary }} className="text-sm mt-1">نص ثانوي توضيحي</p>
                  <button
                    className="mt-3 px-4 py-2 rounded-lg text-white text-sm"
                    style={{ backgroundColor: config.theme.accent }}
                  >
                    زر التفاعل
                  </button>
                </div>

                {/* Accent elements */}
                <div className="flex gap-3">
                  <div
                    className="flex-1 rounded-xl p-3 text-center text-white text-sm font-medium"
                    style={{ backgroundColor: config.theme.primary }}
                  >
                    اللون الأساسي
                  </div>
                  <div
                    className="flex-1 rounded-xl p-3 text-center text-white text-sm font-medium"
                    style={{ backgroundColor: config.theme.accent }}
                  >
                    لون التأكيد
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
