// admin-panel/src/pages/HomePageManager.tsx
// إدارة الصفحة الرئيسية - تحكم كامل

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  ToggleLeft,
  ToggleRight,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  X,
  Link as LinkIcon,
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
  { id: 'names', nameAr: 'أسماء الله الحسنى', nameEn: 'Names of Allah', icon: 'star-crescent', color: '#c17f59', enabled: true, order: 6, route: '/names' },
  { id: 'tasbih', nameAr: 'التسبيح', nameEn: 'Tasbih', icon: 'counter', color: '#2f7659', enabled: true, order: 7, route: '' },
  { id: 'salawat', nameAr: 'الصلاة على النبي', nameEn: 'Salawat', icon: 'star-crescent', color: '#e91e63', enabled: true, order: 8, route: '' },
  { id: 'istighfar', nameAr: 'الاستغفار', nameEn: 'Istighfar', icon: 'heart', color: '#8B5CF6', enabled: true, order: 9, route: '' },
  { id: 'hajj', nameAr: 'الحج والعمرة', nameEn: 'Hajj & Umrah', icon: 'star-crescent', color: '#0D9488', enabled: true, order: 10, route: '' },
  { id: 'seerah', nameAr: 'السيرة النبوية', nameEn: 'Seerah', icon: 'book-account', color: '#6366F1', enabled: true, order: 11, route: '/seerah' },
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
  { id: 'page_temp', nameAr: 'الصفحة المؤقتة', nameEn: 'Temp Page', icon: 'file-document-outline', color: '#FF9800', enabled: false, order: 22, route: '/temp-page' },
  { id: 'page_daily_ayah', nameAr: 'آية اليوم', nameEn: 'Daily Ayah', icon: 'book-open-variant', color: '#3a7ca5', enabled: false, order: 23, route: '/daily-ayah' },
  { id: 'page_hadith', nameAr: 'حديث اليوم', nameEn: 'Hadith of Day', icon: 'message-text', color: '#6366F1', enabled: false, order: 24, route: '/hadith-of-day' },
];

const DEFAULT_DAILY_CONTENT: DailyContentConfig = {
  storyMode: 'auto',
  storyVerse: null,
  storyCustomText: '',
  verseMode: 'auto',
  verse: null,
  verseCustomText: '',
};

const DEFAULT_CONFIG: HomePageConfig = {
  highlights: { items: DEFAULT_HIGHLIGHTS },
  sections: { items: DEFAULT_SECTIONS },
  quickAccess: { items: DEFAULT_QUICK_ACCESS },
  dailyContent: DEFAULT_DAILY_CONTENT,
};

// ==================== Component ====================

interface CustomItemForm {
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  route: string;
}

const EMPTY_CUSTOM_FORM: CustomItemForm = {
  nameAr: '',
  nameEn: '',
  icon: 'link',
  color: '#0f987f',
  route: '',
};

type SectionKey = 'highlights' | 'sections' | 'quick_access' | 'daily';

export default function HomePageManager() {
  const [config, setConfig] = useState<HomePageConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['highlights', 'quick_access'])
  );
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState<CustomItemForm>(EMPTY_CUSTOM_FORM);

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  // ==================== Custom Item Helpers ====================

  const addCustomItem = () => {
    if (!customForm.nameAr.trim() || !customForm.route.trim()) return;
    const newItem: QuickAccessItem = {
      id: `custom_${Date.now()}`,
      nameAr: customForm.nameAr.trim(),
      nameEn: customForm.nameEn.trim() || customForm.nameAr.trim(),
      icon: customForm.icon.trim() || 'link',
      color: customForm.color,
      enabled: true,
      order: config.quickAccess.items.length,
      route: customForm.route.trim(),
    };
    setConfig(prev => ({
      ...prev,
      quickAccess: { items: [...prev.quickAccess.items, newItem] },
    }));
    setCustomForm(EMPTY_CUSTOM_FORM);
    setShowCustomModal(false);
  };

  const deleteCustomItem = (id: string) => {
    if (!id.startsWith('custom_')) return;
    setConfig(prev => ({
      ...prev,
      quickAccess: {
        items: prev.quickAccess.items
          .filter(q => q.id !== id)
          .map((q, i) => ({ ...q, order: i })),
      },
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

  const tabs: { key: SectionKey; label: string; icon: React.ReactNode; count: string }[] = [
    { key: 'highlights', label: 'المميزات (Highlights)', icon: <Star className="w-5 h-5" />, count: `${config.highlights.items.filter(h => h.enabled).length} مفعّل` },
    { key: 'quick_access', label: 'الوصول السريع (Quick Access)', icon: <Zap className="w-5 h-5" />, count: `${config.quickAccess.items.filter(q => q.enabled).length} مفعّل` },
    { key: 'sections', label: 'أقسام الصفحة (Sections)', icon: <Layers className="w-5 h-5" />, count: `${config.sections.items.filter(s => s.enabled).length} قسم` },
    { key: 'daily', label: 'المحتوى اليومي (Daily Content)', icon: <BookOpen className="w-5 h-5" />, count: '' },
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

      {/* Theme Settings Banner */}
      <Link
        to="/quran-themes"
        className="flex items-center justify-between p-4 bg-gradient-to-l from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl hover:border-emerald-500/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Palette className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-medium">المظهر والألوان</p>
            <p className="text-slate-400 text-sm">لتعديل ثيمات القرآن والألوان، اذهب إلى صفحة ثيمات القرآن</p>
          </div>
        </div>
        <ExternalLink className="w-5 h-5 text-emerald-400 group-hover:translate-x-[-4px] transition-transform" />
      </Link>

      {/* ==================== Collapsible Sections ==================== */}
      <div className="space-y-3">
        {tabs.map(tab => {
          const isExpanded = expandedSections.has(tab.key);
          return (
            <div key={tab.key} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(tab.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                    {tab.icon}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{tab.label}</p>
                    {tab.count && <p className="text-slate-400 text-xs">{tab.count}</p>}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4">
                  {/* ===== Highlights ===== */}
                  {tab.key === 'highlights' && (
                    <div className="space-y-4">
                      {/* Preview */}
                      <div className="bg-slate-900 rounded-2xl p-6">
                        <h4 className="text-slate-400 text-sm mb-3">معاينة الترتيب</h4>
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

                      {/* List */}
                      <div className="space-y-2">
                        {sortedHighlights.map((item, index) => (
                          <div
                            key={item.id}
                            className={`bg-slate-900 rounded-xl border transition-all ${
                              item.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3 p-3">
                              <div className="flex flex-col gap-0.5">
                                <button onClick={() => moveHighlight(item.id, 'up')} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-20" title="تحريك لأعلى"><ArrowUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => moveHighlight(item.id, 'down')} disabled={index === sortedHighlights.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20" title="تحريك لأسفل"><ArrowDown className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">{item.icon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm">{item.name}</p>
                                <p className="text-[10px] text-slate-500">{item.builtIn ? '🔒 مدمج' : '✨ مخصص'}</p>
                              </div>
                              <input type="text" value={item.name} onChange={(e) => updateHighlight(item.id, 'name', e.target.value)} className="bg-slate-700 text-white rounded-lg px-2 py-1 border border-slate-600 text-xs w-28 focus:border-emerald-500 focus:outline-none" placeholder="اسم العنصر" dir="rtl" />
                              <button onClick={() => updateHighlight(item.id, 'enabled', !item.enabled)} title={item.enabled ? 'إخفاء' : 'إظهار'}>
                                {item.enabled ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ===== Quick Access ===== */}
                  {tab.key === 'quick_access' && (
                    <div className="space-y-4">
                      <p className="text-slate-400 text-sm">اضغط على العنصر لتفعيله/تعطيله · مرر على العنصر لإعادة الترتيب أو تغيير اللون</p>

                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {sortedQuickAccess.map((item, index) => (
                          <div key={item.id} className={`relative group cursor-pointer transition-all ${item.enabled ? '' : 'opacity-40'}`}>
                            <div
                              onClick={() => updateQuickAccess(item.id, 'enabled', !item.enabled)}
                              className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all hover:scale-105 ${
                                item.enabled ? 'bg-slate-800 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-slate-900 border-slate-700'
                              }`}
                            >
                              <div className="absolute -top-2 -right-2 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold">{index + 1}</div>
                              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: item.color + '30' }}>
                                <span className="text-2xl" style={{ color: item.color }}>
                                  {item.icon === 'compass' && '🧭'}
                                  {item.icon === 'heart' && '❤️'}
                                  {item.icon === 'shield-star' && '⭐'}
                                  {item.icon === 'book-open-page-variant' && '📖'}
                                  {item.icon === 'star-crescent' && '☪️'}
                                  {item.icon === 'counter' && '📿'}
                                  {item.icon === 'information' && 'ℹ️'}
                                  {item.icon === 'radio' && '📻'}
                                  {item.icon === 'book-account' && '📚'}
                                  {item.icon === 'link' && '🔗'}
                                  {!['compass', 'heart', 'shield-star', 'book-open-page-variant', 'star-crescent', 'counter', 'information', 'radio', 'book-account', 'link'].includes(item.icon) && '●'}
                                </span>
                              </div>
                              <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2">{item.nameAr}</p>
                              <div className={`absolute top-1 left-1 w-2 h-2 rounded-full ${item.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            </div>

                            {/* Reorder on hover */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); moveQuickAccess(item.id, 'up'); }} disabled={index === 0} className="p-1 bg-slate-700 rounded-md text-white hover:bg-slate-600 disabled:opacity-30" title="تحريك لليمين"><ArrowUp className="w-3 h-3 rotate-90" /></button>
                              <button onClick={(e) => { e.stopPropagation(); moveQuickAccess(item.id, 'down'); }} disabled={index === sortedQuickAccess.length - 1} className="p-1 bg-slate-700 rounded-md text-white hover:bg-slate-600 disabled:opacity-30" title="تحريك لليسار"><ArrowDown className="w-3 h-3 -rotate-90" /></button>
                            </div>

                            {/* Color picker */}
                            <input type="color" value={item.color} onChange={(e) => updateQuickAccess(item.id, 'color', e.target.value)} className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" title="تغيير اللون" onClick={(e) => e.stopPropagation()} />

                            {/* Delete button for custom items */}
                            {item.id.startsWith('custom_') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteCustomItem(item.id); }}
                                className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400"
                                title="حذف العنصر المخصص"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Custom Item Button */}
                      <button
                        onClick={() => setShowCustomModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 border-2 border-dashed border-slate-600 rounded-2xl text-slate-400 hover:border-emerald-500 hover:text-emerald-400 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-sm font-medium">إضافة عنصر مخصص (Custom URL)</span>
                      </button>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>مفعّل</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-600" />
                          <span>معطّل</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== Sections ===== */}
                  {tab.key === 'sections' && (
                    <div className="space-y-2">
                      {sortedSections.map((section, index) => (
                        <div key={section.id} className={`bg-slate-900 rounded-xl border transition-all ${section.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}>
                          <div className="flex items-center gap-3 p-3">
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveSection(section.id, 'up')} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-20" title="تحريك لأعلى"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => moveSection(section.id, 'down')} disabled={index === sortedSections.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20" title="تحريك لأسفل"><ArrowDown className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold">{index + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm">{section.name}</p>
                              <p className="text-[10px] text-slate-500">{section.id}</p>
                            </div>
                            <div className="flex gap-2">
                              <input type="text" value={section.titleAr} onChange={(e) => updateSection(section.id, 'titleAr', e.target.value)} className="bg-slate-700 text-white rounded-lg px-2 py-1 border border-slate-600 text-xs w-28 focus:border-emerald-500 focus:outline-none" placeholder="العنوان بالعربي" dir="rtl" />
                              <input type="text" value={section.titleEn} onChange={(e) => updateSection(section.id, 'titleEn', e.target.value)} className="bg-slate-700 text-white rounded-lg px-2 py-1 border border-slate-600 text-xs w-28 focus:border-emerald-500 focus:outline-none" placeholder="English title" dir="ltr" />
                            </div>
                            <button onClick={() => updateSection(section.id, 'enabled', !section.enabled)} title={section.enabled ? 'إخفاء القسم' : 'إظهار القسم'}>
                              {section.enabled ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== Daily Content ===== */}
                  {tab.key === 'daily' && (
                    <div className="space-y-5">
                      {/* Story of the Day */}
                      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span>▶️</span> فيديو اليوم
                          </h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-4">
                            <label className="text-sm text-slate-300">الوضع:</label>
                            <div className="flex bg-slate-700 rounded-lg p-1">
                              <button onClick={() => updateDailyContent('storyMode', 'auto')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${config.dailyContent.storyMode === 'auto' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>تلقائي</button>
                              <button onClick={() => updateDailyContent('storyMode', 'manual')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${config.dailyContent.storyMode === 'manual' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>يدوي</button>
                            </div>
                          </div>
                          {config.dailyContent.storyMode === 'auto' && (
                            <p className="text-slate-400 text-sm bg-slate-700/50 rounded-lg p-3">✅ الوضع التلقائي — يتم اختيار الآية تلقائياً بناءً على يوم السنة.</p>
                          )}
                          {config.dailyContent.storyMode === 'manual' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm text-slate-400 mb-1">رقم السورة</label>
                                  <input type="number" min={1} max={114} value={config.dailyContent.storyVerse?.surah || ''} onChange={(e) => updateDailyContent('storyVerse', { surah: parseInt(e.target.value) || 1, ayah: config.dailyContent.storyVerse?.ayah || 1 })} className="w-full bg-slate-700 text-white rounded-xl px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none" placeholder="1-114" />
                                </div>
                                <div>
                                  <label className="block text-sm text-slate-400 mb-1">رقم الآية</label>
                                  <input type="number" min={1} value={config.dailyContent.storyVerse?.ayah || ''} onChange={(e) => updateDailyContent('storyVerse', { surah: config.dailyContent.storyVerse?.surah || 1, ayah: parseInt(e.target.value) || 1 })} className="w-full bg-slate-700 text-white rounded-xl px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none" placeholder="رقم الآية" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-slate-400 mb-1">نص مخصص (اختياري)</label>
                                <textarea value={config.dailyContent.storyCustomText} onChange={(e) => updateDailyContent('storyCustomText', e.target.value)} className="w-full bg-slate-700 text-white rounded-xl px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none resize-y h-20" placeholder="نص مخصص يظهر في الستوري..." dir="rtl" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verse of the Day */}
                      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span>📖</span> آية اليوم
                          </h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-4">
                            <label className="text-sm text-slate-300">الوضع:</label>
                            <div className="flex bg-slate-700 rounded-lg p-1">
                              <button onClick={() => updateDailyContent('verseMode', 'auto')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${config.dailyContent.verseMode === 'auto' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>تلقائي</button>
                              <button onClick={() => updateDailyContent('verseMode', 'manual')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${config.dailyContent.verseMode === 'manual' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>يدوي</button>
                            </div>
                          </div>
                          {config.dailyContent.verseMode === 'auto' && (
                            <p className="text-slate-400 text-sm bg-slate-700/50 rounded-lg p-3">✅ الوضع التلقائي — يتم اختيار آية يومية من api.alquran.cloud.</p>
                          )}
                          {config.dailyContent.verseMode === 'manual' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm text-slate-400 mb-1">رقم السورة</label>
                                  <input type="number" min={1} max={114} value={config.dailyContent.verse?.surah || ''} onChange={(e) => updateDailyContent('verse', { surah: parseInt(e.target.value) || 1, ayah: config.dailyContent.verse?.ayah || 1 })} className="w-full bg-slate-700 text-white rounded-xl px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none" placeholder="1-114" />
                                </div>
                                <div>
                                  <label className="block text-sm text-slate-400 mb-1">رقم الآية</label>
                                  <input type="number" min={1} value={config.dailyContent.verse?.ayah || ''} onChange={(e) => updateDailyContent('verse', { surah: config.dailyContent.verse?.surah || 1, ayah: parseInt(e.target.value) || 1 })} className="w-full bg-slate-700 text-white rounded-xl px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none" placeholder="رقم الآية" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-slate-400 mb-1">نص مخصص (اختياري)</label>
                                <textarea value={config.dailyContent.verseCustomText} onChange={(e) => updateDailyContent('verseCustomText', e.target.value)} className="w-full bg-slate-700 text-white rounded-xl px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none resize-y h-20" placeholder="نص الآية المخصص..." dir="rtl" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ==================== Custom Item Modal ==================== */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCustomModal(false)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md mx-4 overflow-hidden" dir="rtl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-lg">إضافة عنصر مخصص</h3>
              </div>
              <button onClick={() => setShowCustomModal(false)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="إغلاق">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">الاسم بالعربي *</label>
                <input type="text" value={customForm.nameAr} onChange={(e) => setCustomForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none" placeholder="مثال: موقع المسجد" dir="rtl" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">الاسم بالإنجليزي</label>
                <input type="text" value={customForm.nameEn} onChange={(e) => setCustomForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none" placeholder="e.g. Mosque website" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">الرابط / المسار *</label>
                <input type="text" value={customForm.route} onChange={(e) => setCustomForm(f => ({ ...f, route: e.target.value }))} className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm" placeholder="/webview?url=https://example.com" dir="ltr" />
                <p className="text-[11px] text-slate-500 mt-1">للروابط الخارجية: <span className="text-emerald-400 font-mono">/webview?url=https://...</span>  ·  للصفحات الداخلية: <span className="text-emerald-400 font-mono">/page-name</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">الأيقونة</label>
                  <input type="text" value={customForm.icon} onChange={(e) => setCustomForm(f => ({ ...f, icon: e.target.value }))} className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none" placeholder="link" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">اللون</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={customForm.color} onChange={(e) => setCustomForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer" title="اختر لون" />
                    <input type="text" value={customForm.color} onChange={(e) => setCustomForm(f => ({ ...f, color: e.target.value }))} className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm" dir="ltr" placeholder="#0f987f" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-5 border-t border-slate-700">
              <button
                onClick={addCustomItem}
                disabled={!customForm.nameAr.trim() || !customForm.route.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
                إضافة
              </button>
              <button onClick={() => setShowCustomModal(false)} className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
