// admin-panel/src/pages/Themes.tsx
// إدارة الثيمات والمظهر - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Smartphone,
  Save,
  RefreshCw,
  Eye,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Upload,
  Image,
  Type,
  Layout,
  Sparkles,
  Star,
  Calendar,
  ImagePlus,
} from 'lucide-react';
import { db, storage } from '../firebase';
import {
  collection,
  getDocs,
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
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Amiri', label: 'Amiri' },
    { value: 'Tajawal', label: 'Tajawal' },
    { value: 'Almarai', label: 'Almarai' },
    { value: 'Harmattan', label: 'Harmattan' },
  ],
  latin: [
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
  ],
  quran: [
    { value: 'UthmanicHafs', label: 'الخط العثماني' },
    { value: 'Amiri', label: 'Amiri Quran' },
    { value: 'KFGQPC', label: 'مصحف المدينة' },
    { value: 'Scheherazade', label: 'Scheherazade' },
  ],
};

// ========================================
// المكون الرئيسي
// ========================================

const ThemesPage: React.FC = () => {
  const [themes, setThemes] = useState<AppTheme[]>([]);
  const [seasonalThemes, setSeasonalThemes] = useState<SeasonalTheme[]>([]);
  const [backgrounds, setBackgrounds] = useState<DynamicBackground[]>([]);
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    arabicFont: 'Cairo',
    latinFont: 'Cairo',
    quranFont: 'UthmanicHafs',
    baseFontSize: 16,
    headingScale: 1.25,
  });
  const [activeTab, setActiveTab] = useState<'themes' | 'seasonal' | 'backgrounds' | 'fonts'>('themes');
  const [editingTheme, setEditingTheme] = useState<AppTheme | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    await new Promise(resolve => setTimeout(resolve, 500));

    setThemes([
      {
        id: 'light',
        name: 'Light',
        nameAr: 'فاتح',
        type: 'light',
        colors: DEFAULT_LIGHT_COLORS,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'dark',
        name: 'Dark',
        nameAr: 'داكن',
        type: 'dark',
        colors: DEFAULT_DARK_COLORS,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    setSeasonalThemes([
      {
        id: 'ramadan_2026',
        name: 'Ramadan 2026',
        nameAr: 'رمضان 2026',
        season: 'ramadan',
        startDate: '2026-02-28',
        endDate: '2026-03-29',
        colors: {
          secondary: '#1d5a3a',
          accent: '#c9a227',
        },
        isActive: true,
      },
    ]);
  };

  // حفظ الإعدادات
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    // TODO: API call
  };

  // ========================================
  // إدارة الخلفيات الديناميكية
  // ========================================

  const loadBackgrounds = async () => {
    setLoadingBGs(true);
    try {
      const q = query(collection(db, 'backgrounds'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      setBackgrounds(
        snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DynamicBackground))
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
      await deleteDoc(doc(db, 'backgrounds', id));
      setBackgrounds(prev => prev.filter(bg => bg.id !== id));
    } catch (error) {
      console.error('Error deleting background:', error);
    }
  };

  const saveBackground = async (bg: DynamicBackground) => {
    setBgSaveStatus('saving');
    try {
      const { id, ...data } = bg;
      await setDoc(doc(db, 'backgrounds', id), { ...data, createdAt: bg.createdAt || new Date().toISOString() });
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
      const storageRef = ref(storage, `backgrounds/${bgId}_${field}_${Date.now()}`);
      await uploadBytes(storageRef, file);
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
        >
          {isSaving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>حفظ التغييرات</span>
            </>
          )}
        </button>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
        {[
          { id: 'themes', label: 'الثيمات الأساسية', icon: Palette },
          { id: 'backgrounds', label: 'الخلفيات', icon: ImagePlus },
          { id: 'seasonal', label: 'الثيمات الموسمية', icon: Calendar },
          { id: 'fonts', label: 'الخطوط', icon: Type },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
              <div
                className="w-[300px] h-[500px] rounded-[30px] border-4 border-gray-600 overflow-hidden"
                style={{
                  backgroundColor: themes.find(t => t.type === previewMode)?.colors.background || '#fff',
                }}
              >
                {/* Status Bar */}
                <div
                  className="h-6 flex items-center justify-between px-4 text-xs"
                  style={{
                    backgroundColor: themes.find(t => t.type === previewMode)?.colors.surface,
                    color: themes.find(t => t.type === previewMode)?.colors.text,
                  }}
                >
                  <span>9:41</span>
                  <span>100%</span>
                </div>

                {/* Header */}
                <div
                  className="p-4"
                  style={{
                    backgroundColor: themes.find(t => t.type === previewMode)?.colors.surface,
                  }}
                >
                  <h1
                    className="text-lg font-bold"
                    style={{ color: themes.find(t => t.type === previewMode)?.colors.text }}
                  >
                    روح المسلم
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: themes.find(t => t.type === previewMode)?.colors.textSecondary }}
                  >
                    ١٥ رمضان ١٤٤٧
                  </p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Card */}
                  <div
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: themes.find(t => t.type === previewMode)?.colors.secondary,
                    }}
                  >
                    <p className="text-white text-sm">أذكار الصباح</p>
                    <p className="text-white/80 text-xs mt-1">33 ذكر</p>
                  </div>

                  {/* Items */}
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: themes.find(t => t.type === previewMode)?.colors.surface,
                        borderColor: themes.find(t => t.type === previewMode)?.colors.border,
                        borderWidth: 1,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg"
                          style={{
                            backgroundColor: `${themes.find(t => t.type === previewMode)?.colors.secondary}20`,
                          }}
                        />
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: themes.find(t => t.type === previewMode)?.colors.text }}
                          >
                            عنوان القسم {i}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: themes.find(t => t.type === previewMode)?.colors.textSecondary }}
                          >
                            وصف مختصر
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                        className="w-12 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={e => updateThemeColor(theme.id, key as keyof ThemeColors, e.target.value)}
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
                    <button
                      key={color}
                      onClick={() => updateThemeColor(theme.id, 'secondary', color)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                        theme.colors.secondary === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
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
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              إدارة صور الخلفيات التي تظهر في إعدادات التطبيق — يمكن للمستخدمين اختيارها كخلفية.
            </p>
            <div className="flex gap-2">
              <button
                onClick={loadBackgrounds}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors text-sm"
              >
                <RefreshCw size={16} />
                <span>تحديث</span>
              </button>
              <button
                onClick={addBackground}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <Plus size={18} />
                <span>إضافة خلفية</span>
              </button>
            </div>
          </div>

          {bgSaveStatus === 'saved' && (
            <div className="bg-green-600/20 border border-green-600/40 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
              <Check size={16} /> تم الحفظ بنجاح
            </div>
          )}
          {bgSaveStatus === 'error' && (
            <div className="bg-red-600/20 border border-red-600/40 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
              <X size={16} /> حدث خطأ أثناء الحفظ
            </div>
          )}

          {loadingBGs ? (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw size={32} className="mx-auto mb-3 animate-spin" />
              <p>جاري تحميل الخلفيات...</p>
            </div>
          ) : backgrounds.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Image size={48} className="mx-auto mb-4 opacity-50" />
              <p>لا توجد خلفيات ديناميكية</p>
              <p className="text-sm mt-1">اضغط "إضافة خلفية" لإنشاء واحدة جديدة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {backgrounds.map(bg => (
                <div key={bg.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  {/* معاينة الصورة */}
                  <div
                    className="h-40 relative flex items-center justify-center"
                    style={{
                      backgroundColor: '#1a1a2e',
                      backgroundImage: bg.fullUrl ? `url(${bg.fullUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!bg.fullUrl && (
                      <span className="text-gray-500 text-sm">لا توجد صورة</span>
                    )}
                    {bg.fullUrl && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span
                          className="text-lg font-bold px-3 py-1 rounded"
                          style={{ color: bg.textColor === 'white' ? '#fff' : '#000' }}
                        >
                          نص تجريبي — Sample Text
                        </span>
                      </div>
                    )}
                    {/* شارة التفعيل */}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      bg.enabled ? 'bg-green-500/80 text-white' : 'bg-gray-600/80 text-gray-300'
                    }`}>
                      {bg.enabled ? 'مفعّل' : 'معطّل'}
                    </div>
                  </div>

                  {/* بيانات الخلفية */}
                  <div className="p-4 space-y-4">
                    {/* الاسم */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">الاسم</label>
                      <input
                        type="text"
                        value={bg.name}
                        onChange={e => updateBackground(bg.id, { name: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>

                    {/* رفع الصور */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">الصورة الكاملة</label>
                        <label className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-sm cursor-pointer transition">
                          <Upload size={14} />
                          <span>{bg.fullUrl ? 'تغيير' : 'رفع'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleBgImageUpload(file, bg.id, 'fullUrl');
                            }}
                          />
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">الصورة المصغرة</label>
                        <label className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-sm cursor-pointer transition">
                          <Upload size={14} />
                          <span>{bg.thumbnailUrl ? 'تغيير' : 'رفع'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleBgImageUpload(file, bg.id, 'thumbnailUrl');
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* OR: روابط يدوية */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">أو رابط الصورة الكاملة</label>
                        <input
                          type="text"
                          value={bg.fullUrl}
                          onChange={e => updateBackground(bg.id, { fullUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-green-500 outline-none"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">أو رابط المصغرة</label>
                        <input
                          type="text"
                          value={bg.thumbnailUrl}
                          onChange={e => updateBackground(bg.id, { thumbnailUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-green-500 outline-none"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* لون النص + الترتيب + التفعيل */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* لون النص */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">لون النص</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateBackground(bg.id, { textColor: 'white' })}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              bg.textColor === 'white'
                                ? 'bg-gray-600 text-white ring-2 ring-green-500'
                                : 'bg-gray-700 text-gray-400 hover:text-white'
                            }`}
                          >
                            <Sun size={14} />
                            أبيض
                          </button>
                          <button
                            onClick={() => updateBackground(bg.id, { textColor: 'black' })}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              bg.textColor === 'black'
                                ? 'bg-white text-gray-900 ring-2 ring-green-500'
                                : 'bg-gray-700 text-gray-400 hover:text-white'
                            }`}
                          >
                            <Moon size={14} />
                            أسود
                          </button>
                        </div>
                      </div>

                      {/* الترتيب */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">الترتيب</label>
                        <input
                          type="number"
                          value={bg.order}
                          onChange={e => updateBackground(bg.id, { order: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                          min={0}
                        />
                      </div>

                      {/* التفعيل */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">التفعيل</label>
                        <button
                          onClick={() => updateBackground(bg.id, { enabled: !bg.enabled })}
                          className={`relative w-full h-10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                            bg.enabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {bg.enabled ? <><Check size={16} /> مفعّل</> : <><X size={16} /> معطّل</>}
                        </button>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex gap-2 pt-2 border-t border-gray-700">
                      <button
                        onClick={() => saveBackground(bg)}
                        disabled={bgSaveStatus === 'saving'}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                      >
                        {bgSaveStatus === 'saving' ? (
                          <><RefreshCw size={14} className="animate-spin" /> جاري الحفظ...</>
                        ) : (
                          <><Save size={14} /> حفظ</>
                        )}
                      </button>
                      <button
                        onClick={() => deleteBackground(bg.id)}
                        className="flex items-center gap-1 bg-gray-700 hover:bg-red-600 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* الثيمات الموسمية */}
      {activeTab === 'seasonal' && (
        <div className="space-y-6">
          <div className="flex justify-end">
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
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      theme.isActive ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        theme.isActive ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteSeasonalTheme(theme.id)}
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
                        prev.map(t => t.id === theme.id ? { ...t, season: e.target.value as any } : t)
                      );
                    }}
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
                  className="w-full"
                />
              </div>
            </div>

            {/* معاينة الخطوط */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-sm text-gray-400 mb-4">معاينة:</h3>
              <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
                <p style={{ fontFamily: fontSettings.arabicFont, fontSize: fontSettings.baseFontSize }}>
                  بسم الله الرحمن الرحيم
                </p>
                <p
                  style={{
                    fontFamily: fontSettings.quranFont,
                    fontSize: fontSettings.baseFontSize * fontSettings.headingScale,
                  }}
                >
                  ﴿ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴾
                </p>
                <p style={{ fontFamily: fontSettings.latinFont, fontSize: fontSettings.baseFontSize }} dir="ltr">
                  In the name of Allah, the Most Gracious, the Most Merciful
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemesPage;
