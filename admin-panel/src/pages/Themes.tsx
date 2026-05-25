// admin-panel/src/pages/Themes.tsx
// إدارة الثيمات والمظهر - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Save,
  RefreshCw,
  Eye,
  Check,
  X,
  Plus,
  Trash2,
  Copy,
  Upload,
  Image,
  Type,
  Sparkles,
  Calendar,
  ImagePlus,
} from 'lucide-react';
import { db, storage } from '../firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { convertToPng } from '../utils/imageUpload';
import { Styled } from '../components/Styled';

// ========================================
// الأنواع
// ========================================

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

interface AppTheme {
  id: string;
  name: string;
  nameAr: string;
  type: 'light' | 'dark' | 'custom';
  colors: ThemeColors;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface SeasonalTheme {
  id: string;
  name: string;
  nameAr: string;
  season: 'ramadan' | 'eid' | 'hajj' | 'mawlid' | 'none';
  startDate: string;
  endDate: string;
  colors: Partial<ThemeColors>;
  backgroundImage?: string;
  isActive: boolean;
}

interface FontSettings {
  arabicFont: string;
  latinFont: string;
  quranFont: string;
  baseFontSize: number;
  headingScale: number;
}

interface DynamicBackground {
  id: string;
  name: string;
  thumbnailUrl: string;
  fullUrl: string;
  enabled: boolean;
  order: number;
  textColor: 'white' | 'black';
  createdAt?: string;
}

// ========================================
// البيانات الافتراضية
// ========================================

const DEFAULT_LIGHT_COLORS: ThemeColors = {
  primary: '#FFFFFF',
  secondary: '#2f7659',
  accent: '#f5a623',
  background: '#f5f5f5',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
  success: '#2f7659',
  warning: '#f5a623',
  error: '#e53935',
};

const DEFAULT_DARK_COLORS: ThemeColors = {
  primary: '#11151c',
  secondary: '#2f7659',
  accent: '#f5a623',
  background: '#0a0d12',
  surface: '#1a1a2e',
  text: '#FFFFFF',
  textSecondary: '#999999',
  border: '#2a2a3e',
  success: '#2f7659',
  warning: '#f5a623',
  error: '#ef5350',
};

const PRESET_COLORS = [
  '#2f7659', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#6366f1', '#f43f5e', '#84cc16',
  '#14b8a6', '#a855f7', '#f97316', '#ef4444', '#22c55e',
];

const SEASON_OPTIONS = [
  { value: 'none', label: 'بدون' },
  { value: 'ramadan', label: 'رمضان' },
  { value: 'eid', label: 'العيد' },
  { value: 'hajj', label: 'الحج' },
  { value: 'mawlid', label: 'المولد النبوي' },
];

const FONT_OPTIONS = {
  arabic: [
    { value: 'Rubik', label: 'Rubik' },
    { value: 'Amiri', label: 'Amiri' },
    { value: 'Tajawal', label: 'Tajawal' },
    { value: 'Almarai', label: 'Almarai' },
    { value: 'Harmattan', label: 'Harmattan' },
    { value: 'Cairo', label: 'Cairo (قديم)' },
  ],
  latin: [
    { value: 'Rubik', label: 'Rubik' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Cairo', label: 'Cairo (قديم)' },
  ],
  quran: [
    { value: 'UthmanicHafs', label: 'الخط العثماني' },
    { value: 'Amiri', label: 'Amiri Quran' },
    { value: 'KFGQPC', label: 'مصحف المدينة' },
    { value: 'Scheherazade', label: 'Scheherazade' },
  ],
};

const DEFAULT_FONT_SETTINGS: FontSettings = {
  arabicFont: 'Rubik',
  latinFont: 'Rubik',
  quranFont: 'UthmanicHafs',
  baseFontSize: 16,
  headingScale: 1.25,
};

const normalizeFontName = (font?: string) => {
  if (!font || font === 'Cairo') return 'Rubik';
  return font;
};

// ========================================
// المكون الرئيسي
// ========================================

const ThemesPage: React.FC = () => {
  const [themes, setThemes] = useState<AppTheme[]>([]);
  const [seasonalThemes, setSeasonalThemes] = useState<SeasonalTheme[]>([]);
  const [backgrounds, setBackgrounds] = useState<DynamicBackground[]>([]);
  const [fontSettings, setFontSettings] = useState<FontSettings>(DEFAULT_FONT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'themes' | 'seasonal' | 'backgrounds' | 'fonts'>('themes');
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [loadingBGs, setLoadingBGs] = useState(false);
  const [bgSaveStatus, setBgSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // تحميل البيانات
  useEffect(() => {
    loadThemes();
    loadBackgrounds();
  }, []);

  const loadThemes = async () => {
    const themeSnap = await getDoc(doc(db, 'appConfig', 'themeConfig')).catch(() => null);
    const themeConfig = themeSnap?.exists() ? themeSnap.data() as Record<string, any> : {};
    const fontSnap = await getDoc(doc(db, 'appConfig', 'fontSettings')).catch(() => null);
    const savedFontSettings = fontSnap?.exists() ? fontSnap.data() as Record<string, any> : {};

    setThemes([
      {
        id: 'light',
        name: 'Light',
        nameAr: 'فاتح',
        type: 'light',
        colors: { ...DEFAULT_LIGHT_COLORS, ...(themeConfig.light || {}) },
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'dark',
        name: 'Dark',
        nameAr: 'داكن',
        type: 'dark',
        colors: { ...DEFAULT_DARK_COLORS, ...(themeConfig.dark || {}) },
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    setSeasonalThemes(Array.isArray(themeConfig.seasonalThemes) ? themeConfig.seasonalThemes : []);
    setFontSettings({
      arabicFont: normalizeFontName(savedFontSettings.arabicFont),
      latinFont: normalizeFontName(savedFontSettings.latinFont),
      quranFont: typeof savedFontSettings.quranFont === 'string' ? savedFontSettings.quranFont : DEFAULT_FONT_SETTINGS.quranFont,
      baseFontSize: typeof savedFontSettings.baseFontSize === 'number' ? savedFontSettings.baseFontSize : DEFAULT_FONT_SETTINGS.baseFontSize,
      headingScale: typeof savedFontSettings.headingScale === 'number' ? savedFontSettings.headingScale : DEFAULT_FONT_SETTINGS.headingScale,
    });
  };

  // حفظ الإعدادات
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save theme colors to appConfig/themeConfig for the app to read
      const activeLight = themes.find(t => t.isActive && t.type === 'light');
      const activeDark = themes.find(t => t.isActive && t.type === 'dark');

      const themeConfig: Record<string, any> = {
        updatedAt: new Date().toISOString(),
        version: Date.now(),
        seasonalThemes,
      };

      if (activeLight) {
        themeConfig.light = activeLight.colors;
      }
      if (activeDark) {
        themeConfig.dark = activeDark.colors;
      }

      await setDoc(doc(db, 'appConfig', 'themeConfig'), themeConfig, { merge: true });

      // Also save font settings
      await setDoc(doc(db, 'appConfig', 'fontSettings'), {
        ...fontSettings,
        arabicFont: normalizeFontName(fontSettings.arabicFont),
        latinFont: normalizeFontName(fontSettings.latinFont),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving theme config:', error);
    }
    setIsSaving(false);
  };

  // ========================================
  // إدارة الخلفيات الديناميكية
  // ========================================

  const loadBackgrounds = async () => {
    setLoadingBGs(true);
    try {
      const q = query(collection(db, 'photoBackgrounds'), orderBy('order_index', 'asc'));
      const snapshot = await getDocs(q);
      setBackgrounds(
        snapshot.docs.map(d => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name || data.name_ar || data.photographer || 'خلفية',
            thumbnailUrl: data.thumbnail_url || data.thumbnailUrl || data.full_url || '',
            fullUrl: data.full_url || data.fullUrl || data.large2x_url || '',
            enabled: data.is_active !== false,
            order: data.order_index ?? data.order ?? 0,
            textColor: data.text_color || data.textColor || 'white',
            createdAt: data.createdAt,
          } as DynamicBackground;
        })
      );
    } catch (error) {
      console.error('Error loading backgrounds:', error);
    }
    setLoadingBGs(false);
  };

  const addBackground = () => {
    const newBg: DynamicBackground = {
      id: `bg_${Date.now()}`,
      name: 'خلفية جديدة',
      thumbnailUrl: '',
      fullUrl: '',
      enabled: true,
      order: backgrounds.length,
      textColor: 'white',
    };
    setBackgrounds(prev => [...prev, newBg]);
  };

  const updateBackground = (id: string, updates: Partial<DynamicBackground>) => {
    setBackgrounds(prev =>
      prev.map(bg => (bg.id === id ? { ...bg, ...updates } : bg))
    );
  };

  const deleteBackground = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخلفية؟')) return;
    try {
      await deleteDoc(doc(db, 'photoBackgrounds', id));
      setBackgrounds(prev => prev.filter(bg => bg.id !== id));
    } catch (error) {
      console.error('Error deleting background:', error);
    }
  };

  const saveBackground = async (bg: DynamicBackground) => {
    setBgSaveStatus('saving');
    try {
      await setDoc(doc(db, 'photoBackgrounds', bg.id), {
        name: bg.name,
        photographer: bg.name,
        thumbnail_url: bg.thumbnailUrl,
        full_url: bg.fullUrl,
        large2x_url: bg.fullUrl,
        is_active: bg.enabled,
        is_free: true,
        category: 'islamic',
        order_index: bg.order,
        text_color: bg.textColor,
        createdAt: bg.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setBgSaveStatus('saved');
      setTimeout(() => setBgSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving background:', error);
      setBgSaveStatus('error');
      setTimeout(() => setBgSaveStatus('idle'), 3000);
    }
  };

  const handleBgImageUpload = async (file: File, bgId: string, field: 'thumbnailUrl' | 'fullUrl') => {
    try {
      const pngBlob = await convertToPng(file);
      const isSvg = file.type === 'image/svg+xml';
      const ext = isSvg ? 'svg' : 'png';
      const storageRef = ref(storage, `backgrounds/${bgId}_${field}_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, pngBlob, { contentType: isSvg ? 'image/svg+xml' : 'image/png' });
      const url = await getDownloadURL(storageRef);
      updateBackground(bgId, { [field]: url });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  // تحديث لون في الثيم
  const updateThemeColor = (themeId: string, colorKey: keyof ThemeColors, value: string) => {
    setThemes(prev =>
      prev.map(theme =>
        theme.id === themeId
          ? { ...theme, colors: { ...theme.colors, [colorKey]: value } }
          : theme
      )
    );
  };

  // نسخ ألوان الثيم
  const copyThemeColors = (theme: AppTheme) => {
    const colors = JSON.stringify(theme.colors, null, 2);
    navigator.clipboard.writeText(colors);
  };

  // إضافة ثيم موسمي
  const addSeasonalTheme = () => {
    const newTheme: SeasonalTheme = {
      id: `seasonal_${Date.now()}`,
      name: 'New Seasonal Theme',
      nameAr: 'ثيم موسمي جديد',
      season: 'none',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      colors: {},
      isActive: false,
    };
    setSeasonalThemes(prev => [...prev, newTheme]);
  };

  // حذف ثيم موسمي
  const deleteSeasonalTheme = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الثيم؟')) {
      setSeasonalThemes(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">الثيمات والمظهر</h1>
          <p className="text-gray-400 mt-1">تخصيص ألوان ومظهر التطبيق</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition-colors"
          title="يحفظ جميع التغييرات في كل التبويبات (الثيمات + الخلفيات + الموسمية + الخطوط)"
        >
          {isSaving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>
                حفظ {activeTab === 'themes' ? 'الثيمات' : activeTab === 'backgrounds' ? 'الخلفيات' : activeTab === 'seasonal' ? 'الموسمية' : 'الخطوط'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
        {[
          { id: 'themes', label: 'الثيمات الأساسية', icon: Palette },
          { id: 'backgrounds', label: 'شرح الخلفيات', icon: ImagePlus },
          { id: 'seasonal', label: 'الثيمات الموسمية', icon: Calendar },
          { id: 'fonts', label: 'الخطوط', icon: Type },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'themes' | 'seasonal' | 'backgrounds' | 'fonts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          {/* معاينة الثيم */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Eye size={20} className="text-blue-500" />
                معاينة الثيم
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('light')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    previewMode === 'light' ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <Sun size={16} />
                  <span>فاتح</span>
                </button>
                <button
                  onClick={() => setPreviewMode('dark')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    previewMode === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-600 text-gray-400'
                  }`}
                >
                  <Moon size={16} />
                  <span>داكن</span>
                </button>
              </div>
            </div>

            {/* محاكاة الموبايل */}
            <div className="flex justify-center">
              <Styled
                className="w-[300px] h-[500px] rounded-[30px] border-4 border-gray-600 overflow-hidden"
                css={{
                  backgroundColor: themes.find(t => t.type === previewMode)?.colors.background || '#fff',
                }}
              >
                {/* Status Bar */}
                <Styled
                  className="h-6 flex items-center justify-between px-4 text-xs"
                  css={{
                    backgroundColor: themes.find(t => t.type === previewMode)?.colors.surface,
                    color: themes.find(t => t.type === previewMode)?.colors.text,
                  }}
                >
                  <span>9:41</span>
                  <span>100%</span>
                </Styled>

                {/* Header */}
                <Styled
                  className="p-4"
                  css={{
                    backgroundColor: themes.find(t => t.type === previewMode)?.colors.surface,
                  }}
                >
                  <Styled
                    as="h1"
                    className="text-lg font-bold"
                    css={{ color: themes.find(t => t.type === previewMode)?.colors.text }}
                  >
                    روح المسلم
                  </Styled>
                  <Styled
                    as="p"
                    className="text-sm"
                    css={{ color: themes.find(t => t.type === previewMode)?.colors.textSecondary }}
                  >
                    ١٥ رمضان ١٤٤٧
                  </Styled>
                </Styled>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Card */}
                  <Styled
                    className="p-4 rounded-xl"
                    css={{
                      backgroundColor: themes.find(t => t.type === previewMode)?.colors.secondary,
                    }}
                  >
                    <p className="text-white text-sm">أذكار الصباح</p>
                    <p className="text-white/80 text-xs mt-1">33 ذكر</p>
                  </Styled>

                  {/* Items */}
                  {[1, 2, 3].map(i => (
                    <Styled
                      key={i}
                      className="p-3 rounded-lg"
                      css={{
                        backgroundColor: themes.find(t => t.type === previewMode)?.colors.surface,
                        borderColor: themes.find(t => t.type === previewMode)?.colors.border,
                        borderWidth: 1,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Styled
                          className="w-10 h-10 rounded-lg"
                          css={{
                            backgroundColor: `${themes.find(t => t.type === previewMode)?.colors.secondary}20`,
                          }}
                        />
                        <div>
                          <Styled
                            as="p"
                            className="text-sm font-medium"
                            css={{ color: themes.find(t => t.type === previewMode)?.colors.text }}
                          >
                            عنوان القسم {i}
                          </Styled>
                          <Styled
                            as="p"
                            className="text-xs"
                            css={{ color: themes.find(t => t.type === previewMode)?.colors.textSecondary }}
                          >
                            وصف مختصر
                          </Styled>
                        </div>
                      </div>
                    </Styled>
                  ))}
                </div>
              </Styled>
            </div>
          </div>

          {/* تعديل الألوان */}
          {themes.map(theme => (
            <div key={theme.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {theme.type === 'light' ? (
                    <Sun size={20} className="text-yellow-500" />
                  ) : (
                    <Moon size={20} className="text-blue-500" />
                  )}
                  ثيم {theme.nameAr}
                </h2>
                <button
                  onClick={() => copyThemeColors(theme)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Copy size={16} />
                  <span>نسخ الألوان</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(theme.colors).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-400 mb-2 capitalize">
                      {key === 'primary' ? 'أساسي' :
                       key === 'secondary' ? 'ثانوي' :
                       key === 'accent' ? 'مميز' :
                       key === 'background' ? 'خلفية' :
                       key === 'surface' ? 'سطح' :
                       key === 'text' ? 'نص' :
                       key === 'textSecondary' ? 'نص ثانوي' :
                       key === 'border' ? 'حدود' :
                       key === 'success' ? 'نجاح' :
                       key === 'warning' ? 'تحذير' :
                       key === 'error' ? 'خطأ' : key}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={value}
                        onChange={e => updateThemeColor(theme.id, key as keyof ThemeColors, e.target.value)}
                        aria-label={`اختيار لون ${key}`}
                        className="w-12 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={e => updateThemeColor(theme.id, key as keyof ThemeColors, e.target.value)}
                        aria-label={`كود لون ${key}`}
                        placeholder="#000000"
                        className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* الألوان المقترحة */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">ألوان مقترحة للون الثانوي:</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <Styled
                      as="button"
                      key={color}
                      onClick={() => updateThemeColor(theme.id, 'secondary', color)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                        theme.colors.secondary === color ? 'border-white' : 'border-transparent'
                      }`}
                      css={{ backgroundColor: color }}
                      aria-label={`اختيار اللون الثانوي ${color}`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* الخلفيات الديناميكية */}
      {activeTab === 'backgrounds' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
            <h2 className="text-lg font-bold text-blue-100 mb-2">الخلفيات ليست ثيمات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm leading-7">
              <div className="rounded-lg bg-gray-900/60 border border-gray-700 p-4">
                <div className="font-semibold text-white mb-1">الثيمات هنا</div>
                <p className="text-gray-300">
                  تغيّر ألوان التطبيق العامة: الخلفية، الكروت، النصوص، الأزرار، واللون الأساسي. تؤثر مباشرة على كل الشاشات التي تستخدم نظام الألوان.
                </p>
              </div>
              <div className="rounded-lg bg-gray-900/60 border border-gray-700 p-4">
                <div className="font-semibold text-white mb-1">خلفيات الصور</div>
                <p className="text-gray-300">
                  تظهر داخل التطبيق في: الإعدادات ← العرض ← خلفيات الصور. المستخدم يختار صورة بنفسه، وبعدها تظهر كخلفية فعلية للشاشات الداعمة.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-gray-900/70 border border-gray-700 px-3 py-1 text-gray-300">
                الموجود حالياً: {backgrounds.length} خلفية
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-emerald-300">
                المفعّل: {backgrounds.filter(bg => bg.enabled).length}
              </span>
              <a
                href="/photo-backgrounds"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-white transition-colors"
              >
                <ImagePlus size={16} />
                فتح إدارة خلفيات الصور
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 text-sm text-gray-300">
            تم نقل تحرير الصور إلى صفحة واحدة فقط حتى لا يحصل تضارب أو تكرار. أي تعديل هناك يظهر في اختيار خلفيات الصور داخل إعدادات العرض في التطبيق، والشاشة نفسها تستمع للتحديثات مباشرة أثناء فتحها.
          </div>
        </div>
      )}

      {/* الثيمات الموسمية */}
      {activeTab === 'seasonal' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              الثيم الموسمي يغيّر ألوان التطبيق خلال الفترة المحددة، وأولويته أعلى من الثيم الأساسي.
            </p>
            <button
              onClick={addSeasonalTheme}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>إضافة ثيم موسمي</span>
            </button>
          </div>

          {seasonalThemes.map(theme => (
            <div key={theme.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles size={24} className="text-yellow-500" />
                  <div>
                    <input
                      type="text"
                      value={theme.nameAr}
                      onChange={e => {
                        setSeasonalThemes(prev =>
                          prev.map(t => t.id === theme.id ? { ...t, nameAr: e.target.value } : t)
                        );
                      }}
                      aria-label="اسم الثيم الموسمي"
                      placeholder="ثيم موسمي جديد"
                      className="bg-transparent text-lg font-bold focus:outline-none focus:border-b focus:border-green-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSeasonalThemes(prev =>
                        prev.map(t => t.id === theme.id ? { ...t, isActive: !t.isActive } : t)
                      );
                    }}
                    aria-label={theme.isActive ? 'تعطيل الثيم' : 'تفعيل الثيم'}
                    title={theme.isActive ? 'تعطيل الثيم' : 'تفعيل الثيم'}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      theme.isActive ? 'bg-green-500' : 'bg-gray-600'
                    }`}>
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        theme.isActive ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteSeasonalTheme(theme.id)}
                    aria-label="حذف الثيم الموسمي"
                    title="حذف الثيم الموسمي"
                    className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">الموسم</label>
                  <select
                    value={theme.season}
                    onChange={e => {
                      setSeasonalThemes(prev =>
                        prev.map(t => t.id === theme.id ? { ...t, season: e.target.value as SeasonalTheme['season'] } : t)
                      );
                    }}
                    aria-label="الموسم"
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    {SEASON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">تاريخ البداية</label>
                  <input
                    type="date"
                    value={theme.startDate}
                    onChange={e => {
                      setSeasonalThemes(prev =>
                        prev.map(t => t.id === theme.id ? { ...t, startDate: e.target.value } : t)
                      );
                    }}
                    aria-label="تاريخ بداية الموسم"
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={theme.endDate}
                    onChange={e => {
                      setSeasonalThemes(prev =>
                        prev.map(t => t.id === theme.id ? { ...t, endDate: e.target.value } : t)
                      );
                    }}
                    aria-label="تاريخ نهاية الموسم"
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">اللون الثانوي</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={theme.colors.secondary || '#2f7659'}
                      onChange={e => {
                        setSeasonalThemes(prev =>
                          prev.map(t => t.id === theme.id ? { ...t, colors: { ...t.colors, secondary: e.target.value } } : t)
                        );
                      }}
                      aria-label="اختيار اللون الثانوي للموسم"
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.colors.secondary || '#2f7659'}
                      onChange={e => {
                        setSeasonalThemes(prev =>
                          prev.map(t => t.id === theme.id ? { ...t, colors: { ...t.colors, secondary: e.target.value } } : t)
                        );
                      }}
                      aria-label="كود اللون الثانوي للموسم"
                      placeholder="#2f7659"
                      className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {seasonalThemes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>لا توجد ثيمات موسمية</p>
            </div>
          )}
        </div>
      )}

      {/* إعدادات الخطوط */}
      {activeTab === 'fonts' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Type size={20} className="text-blue-500" />
              إعدادات الخطوط
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">الخط العربي</label>
                <select
                  value={fontSettings.arabicFont}
                  onChange={e => setFontSettings({ ...fontSettings, arabicFont: e.target.value })}
                  aria-label="الخط العربي"
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {FONT_OPTIONS.arabic.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">الخط اللاتيني</label>
                <select
                  value={fontSettings.latinFont}
                  onChange={e => setFontSettings({ ...fontSettings, latinFont: e.target.value })}
                  aria-label="الخط اللاتيني"
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {FONT_OPTIONS.latin.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">خط القرآن</label>
                <select
                  value={fontSettings.quranFont}
                  onChange={e => setFontSettings({ ...fontSettings, quranFont: e.target.value })}
                  aria-label="خط القرآن"
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {FONT_OPTIONS.quran.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  حجم الخط الأساسي: {fontSettings.baseFontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={fontSettings.baseFontSize}
                  onChange={e => setFontSettings({ ...fontSettings, baseFontSize: parseInt(e.target.value) })}
                  aria-label="حجم الخط الأساسي"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  مقياس العناوين: {fontSettings.headingScale}
                </label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.05"
                  value={fontSettings.headingScale}
                  onChange={e => setFontSettings({ ...fontSettings, headingScale: parseFloat(e.target.value) })}
                  aria-label="مقياس العناوين"
                  className="w-full"
                />
              </div>
            </div>

            {/* معاينة الخطوط */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-sm text-gray-400 mb-4">معاينة:</h3>
              <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
                <Styled as="p" css={{ fontFamily: fontSettings.arabicFont, fontSize: fontSettings.baseFontSize }}>
                  بسم الله الرحمن الرحيم
                </Styled>
                <Styled
                  as="p"
                  css={{
                    fontFamily: fontSettings.quranFont,
                    fontSize: fontSettings.baseFontSize * fontSettings.headingScale,
                  }}
                >
                  ﴿ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴾
                </Styled>
                <Styled as="p" css={{ fontFamily: fontSettings.latinFont, fontSize: fontSettings.baseFontSize }} dir="ltr">
                  In the name of Allah, the Most Gracious, the Most Merciful
                </Styled>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemesPage;
