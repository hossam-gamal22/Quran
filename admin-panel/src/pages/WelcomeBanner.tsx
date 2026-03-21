// admin-panel/src/pages/WelcomeBanner.tsx
// إدارة الرسالة الترحيبية - روح المسلم

import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Megaphone,
  Palette,
  Link,
  Type,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Image,
  Layout,
  Upload,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadImage } from '../utils/imageUpload';
import { Styled } from '../components/Styled';
import TranslateButton from '../components/TranslateButton';

// ========================================
// الأنواع
// ========================================

interface MultiLangText {
  ar: string;
  en: string;
  fr?: string;
  de?: string;
  es?: string;
  tr?: string;
  ur?: string;
  id?: string;
  ms?: string;
  hi?: string;
  bn?: string;
  ru?: string;
}

interface WelcomeBannerData {
  enabled: boolean;
  title: string;
  subtitle: string;
  titles?: MultiLangText;
  subtitles?: MultiLangText;
  icon: string;
  customIconUrl?: string;
  color: string;
  route: string;
  displayMode: 'text' | 'text_image' | 'image_only';
  backgroundImage: string;
  backgroundImageNonAr?: string;
  actionType?: 'navigate' | 'toast';
  toastMessage?: string;
  toastTranslations?: Record<string, string>;
  scheduledFrom?: string;   // ISO date — banner visible from this date
  scheduledUntil?: string;  // ISO date — banner hidden after this date
}

const DEFAULT_BANNER: WelcomeBannerData = {
  enabled: true,
  title: 'رمضان مبارك',
  subtitle: 'كل عام وأنتم بخير',
  icon: 'moon-waning-crescent',
  customIconUrl: '',
  color: '#2f7659',
  route: '/seasonal/ramadan',
  displayMode: 'text',
  backgroundImage: '',
  backgroundImageNonAr: '',
  actionType: 'navigate',
  toastMessage: '',
  toastTranslations: {},
};

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾', rtl: false },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
];

const PRIMARY_LANGS = LANGUAGES.filter(l => l.code === 'ar' || l.code === 'en');
const OTHER_LANGS = LANGUAGES.filter(l => l.code !== 'ar' && l.code !== 'en');

const DISPLAY_MODE_OPTIONS = [
  { value: 'text' as const, label: 'نص فقط', description: 'عرض النص والأيقونة فقط', icon: Type },
  { value: 'text_image' as const, label: 'نص + صورة خلفية', description: 'نص مع صورة خلفية', icon: Layout },
  { value: 'image_only' as const, label: 'صورة فقط', description: 'صورة كاملة بدون نص', icon: Image },
];

const ICON_OPTIONS = [
  { value: 'moon-waning-crescent', label: '🌙 هلال' },
  { value: 'star-crescent', label: '☪️ نجمة وهلال' },
  { value: 'mosque', label: '🕌 مسجد' },
  { value: 'book-open-variant', label: '📖 قرآن' },
  { value: 'hands-pray', label: '🤲 دعاء' },
  { value: 'star-four-points', label: '✨ نجمة' },
  { value: 'heart', label: '❤️ قلب' },
  { value: 'party-popper', label: '🎉 احتفال' },
  { value: 'calendar-month', label: '📅 تقويم' },
  { value: 'bell', label: '🔔 جرس' },
  { value: 'gift', label: '🎁 هدية' },
  { value: 'shield-check', label: '🛡️ حماية' },
];

const ROUTE_OPTIONS = [
  { value: '/(tabs)', label: 'الرئيسية' },
  { value: '/(tabs)/quran', label: 'القرآن' },
  { value: '/(tabs)/prayer', label: 'الصلاة' },
  { value: '/(tabs)/tasbih', label: 'التسبيح' },
  { value: '/seasonal/ramadan', label: 'صفحة رمضان' },
  { value: '/azkar/morning', label: 'أذكار الصباح' },
  { value: '/azkar/evening', label: 'أذكار المساء' },
  { value: '/azkar/sleep', label: 'أذكار النوم' },
  { value: '/azkar/wakeup', label: 'أذكار الاستيقاظ' },
  { value: '/names', label: 'أسماء الله الحسنى' },
  { value: '/hajj-umrah', label: 'الحج والعمرة' },
  { value: '/hajj', label: 'مناسك الحج' },
  { value: '/umrah', label: 'مناسك العمرة' },
  { value: '/daily-ayah', label: 'آية اليوم' },
  { value: '/daily-dua', label: 'دعاء اليوم' },
  { value: '/daily-dhikr', label: 'ذكر اليوم' },
  { value: '/hadith-of-day', label: 'حديث اليوم' },
  { value: '/story-of-day', label: 'قصة اليوم' },
  { value: '/hijri', label: 'التقويم الهجري' },
  { value: '/khatma', label: 'ختمة القرآن' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/ruqya', label: 'الرقية الشرعية' },
  { value: '/seerah', label: 'السيرة النبوية' },
  { value: '/companions', label: 'قصص الصحابة' },
  { value: '/radio', label: 'إذاعة القرآن' },
  { value: '/all-favorites', label: 'المحفوظات' },
  { value: '/subscription', label: 'الاشتراك' },
];

const COLOR_PRESETS = [
  { value: '#2f7659', label: 'أخضر' },
  { value: '#1e40af', label: 'أزرق' },
  { value: '#7c2d12', label: 'بني' },
  { value: '#5b21b6', label: 'بنفسجي' },
  { value: '#be123c', label: 'أحمر' },
  { value: '#0D9488', label: 'تركواز' },
  { value: '#d97706', label: 'برتقالي' },
  { value: '#8B4513', label: 'بني داكن' },
  { value: '#6d28d9', label: 'موف' },
  { value: '#059669', label: 'أخضر فاتح' },
];

const FIRESTORE_DOC = 'config/app-settings';

// ========================================
// ضغط الصور قبل الرفع
// ========================================

// ========================================
// المكون الرئيسي
// ========================================

export default function WelcomeBanner() {
  const [banner, setBanner] = useState<WelcomeBannerData>(DEFAULT_BANNER);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [customRoute, setCustomRoute] = useState('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingBgAr, setIsUploadingBgAr] = useState(false);
  const [isUploadingBgNonAr, setIsUploadingBgNonAr] = useState(false);
  const [showOtherLangs, setShowOtherLangs] = useState(false);
  const [showOtherTitleLangs, setShowOtherTitleLangs] = useState(false);
  const [showOtherSubtitleLangs, setShowOtherSubtitleLangs] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bgArInputRef = useRef<HTMLInputElement>(null);
  const bgNonArInputRef = useRef<HTMLInputElement>(null);

  // تحويل رابط Google Drive إلى رابط مباشر
  const convertDriveLink = (url: string): string => {
    // Format: https://drive.google.com/file/d/FILE_ID/view...
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
    // Format: https://drive.google.com/open?id=FILE_ID
    const openIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openIdMatch) {
      return `https://drive.google.com/uc?export=view&id=${openIdMatch[1]}`;
    }
    return url;
  };

  // Handle URL input with auto Drive link conversion
  const handleImageUrlChange = (field: 'backgroundImage' | 'backgroundImageNonAr', value: string) => {
    const converted = value.includes('drive.google.com') ? convertDriveLink(value) : value;
    updateBanner(field, converted);
  };

  // رفع صورة خلفية (مع ضغط تلقائي)
  const handleBgImageUpload = async (file: File, field: 'backgroundImage' | 'backgroundImageNonAr') => {
    if (!file) return;
    const setUploading = field === 'backgroundImage' ? setIsUploadingBgAr : setIsUploadingBgNonAr;
    setUploading(true);
    try {
      const folder = field === 'backgroundImage' ? 'ar' : 'non-ar';
      const result = await uploadImage(file, {
        storagePath: `welcome-banner/backgrounds/${folder}`,
        maxWidth: 1200,
      });
      updateBanner(field, result.url);
    } catch (err) {
      console.error('Error uploading background:', err);
      alert('فشل رفع الصورة. تأكد من أن الملف صورة صالحة.');
    } finally {
      setUploading(false);
    }
  };

  // رفع أيقونة مخصصة (مع ضغط تلقائي)
  const handleIconUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingIcon(true);
    try {
      const result = await uploadImage(file, {
        storagePath: 'welcome-banner/icons',
        maxWidth: 512,
      });
      setBanner(prev => ({ ...prev, customIconUrl: result.url, icon: '__custom__' }));
    } catch (err) {
      console.error('Error uploading icon:', err);
      alert('فشل رفع الأيقونة. تأكد من أن الملف صورة صالحة.');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  // تحديث عنوان بلغة معينة
  const updateTitle = (lang: string, value: string) => {
    const updated = { ...banner.titles, [lang]: value } as MultiLangText;
    if (lang === 'ar') {
      setBanner(prev => ({ ...prev, title: value, titles: updated }));
    } else {
      setBanner(prev => ({ ...prev, titles: updated }));
    }
  };

  // تحديث العنوان الفرعي بلغة معينة
  const updateSubtitle = (lang: string, value: string) => {
    const updated = { ...banner.subtitles, [lang]: value } as MultiLangText;
    if (lang === 'ar') {
      setBanner(prev => ({ ...prev, subtitle: value, subtitles: updated }));
    } else {
      setBanner(prev => ({ ...prev, subtitles: updated }));
    }
  };

  // نسخ العربي لكل لغات التوست
  const copyToastToAllLangs = () => {
    const arText = banner.toastTranslations?.ar || banner.toastMessage || '';
    const updated: Record<string, string> = { ...banner.toastTranslations };
    LANGUAGES.forEach(l => { updated[l.code] = arText; });
    setBanner(prev => ({ ...prev, toastTranslations: updated }));
  };

  // عرض الأيقونة في المعاينة
  const renderPreviewIcon = () => {
    if (banner.customIconUrl) {
      return <img src={banner.customIconUrl} alt="icon" className="w-8 h-8 object-contain" />;
    }
    return <span>{ICON_OPTIONS.find(i => i.value === banner.icon)?.label.split(' ')[0] || '🌙'}</span>;
  };

  // تحميل البيانات من Firestore
  useEffect(() => {
    const loadBanner = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, FIRESTORE_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.welcomeBanner) {
            setBanner({ ...DEFAULT_BANNER, ...data.welcomeBanner });
            // Check if route is custom
            const isPreset = ROUTE_OPTIONS.some(r => r.value === data.welcomeBanner.route);
            if (!isPreset) {
              setCustomRoute(data.welcomeBanner.route);
            }
          }
        }
      } catch (error) {
        console.error('Error loading banner:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBanner();
  }, []);

  // حفظ في Firestore
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const docRef = doc(db, FIRESTORE_DOC);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      // Ensure titles/subtitles ar field is synced with title/subtitle
      const bannerToSave = {
        ...banner,
        titles: {
          ...banner.titles,
          ar: banner.titles?.ar || banner.title,
        },
        subtitles: {
          ...banner.subtitles,
          ar: banner.subtitles?.ar || banner.subtitle,
        },
      };

      await setDoc(docRef, {
        ...existingData,
        welcomeBanner: bannerToSave,
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving banner:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateBanner = <K extends keyof WelcomeBannerData>(key: K, value: WelcomeBannerData[K]) => {
    setBanner(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">الرسالة الترحيبية</h1>
            <p className="text-slate-400 text-sm">تحكم في البانر الترحيبي على الصفحة الرئيسية</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الإعدادات */}
        <div className="lg:col-span-2 space-y-6">
          {/* تفعيل/إخفاء */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {banner.enabled ? (
                  <Eye className="w-5 h-5 text-emerald-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <h3 className="text-white font-semibold">إظهار الرسالة الترحيبية</h3>
                  <p className="text-slate-400 text-sm">عند التعطيل، لن تظهر الرسالة على الصفحة الرئيسية</p>
                </div>
              </div>
              <button
                onClick={() => updateBanner('enabled', !banner.enabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  banner.enabled ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
                aria-label={banner.enabled ? 'تعطيل الرسالة الترحيبية' : 'تفعيل الرسالة الترحيبية'}
                title={banner.enabled ? 'تعطيل الرسالة الترحيبية' : 'تفعيل الرسالة الترحيبية'}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                    banner.enabled ? 'right-0.5' : 'right-7'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* جدولة العرض — Scheduling */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">جدولة العرض</h3>
              <span className="text-xs text-slate-400">(اختياري — اتركه فارغاً للعرض دائماً)</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              حدد متى يبدأ ومتى ينتهي عرض الرسالة الترحيبية تلقائياً. مفيد للمناسبات الإسلامية والأحداث المؤقتة.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 block mb-2">
                  <Clock className="w-4 h-4 inline ml-1" />
                  يبدأ العرض من
                </label>
                <input
                  type="datetime-local"
                  title="تاريخ بداية العرض"
                  value={banner.scheduledFrom || ''}
                  onChange={(e) => updateBanner('scheduledFrom', e.target.value || undefined)}
                  className="w-full p-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
                {banner.scheduledFrom && (
                  <button
                    onClick={() => updateBanner('scheduledFrom', undefined)}
                    className="text-xs text-red-400 mt-1 hover:underline"
                  >
                    مسح التاريخ
                  </button>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-2">
                  <Clock className="w-4 h-4 inline ml-1" />
                  ينتهي العرض في
                </label>
                <input
                  type="datetime-local"
                  title="تاريخ نهاية العرض"
                  value={banner.scheduledUntil || ''}
                  onChange={(e) => updateBanner('scheduledUntil', e.target.value || undefined)}
                  className="w-full p-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
                {banner.scheduledUntil && (
                  <button
                    onClick={() => updateBanner('scheduledUntil', undefined)}
                    className="text-xs text-red-400 mt-1 hover:underline"
                  >
                    مسح التاريخ
                  </button>
                )}
              </div>
            </div>
            {banner.scheduledFrom && banner.scheduledUntil && new Date(banner.scheduledUntil) < new Date() && (
              <div className="mt-3 p-3 bg-red-500/10 rounded-xl border border-red-500/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">تاريخ الانتهاء في الماضي — الرسالة مخفية حالياً</span>
              </div>
            )}
            {banner.scheduledFrom && !banner.scheduledUntil && new Date(banner.scheduledFrom) > new Date() && (
              <div className="mt-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm">الرسالة مجدولة — ستظهر بعد: {new Date(banner.scheduledFrom).toLocaleDateString('ar-EG')}</span>
              </div>
            )}
          </div>

          {/* نوع العرض */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Layout className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">نوع العرض</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DISPLAY_MODE_OPTIONS.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    onClick={() => updateBanner('displayMode', mode.value)}
                    className={`p-4 rounded-xl border text-right transition-all ${
                      banner.displayMode === mode.value
                        ? 'border-emerald-500 bg-emerald-500/20 text-white'
                        : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <p className="font-medium text-sm">{mode.label}</p>
                    <p className="text-xs opacity-60 mt-1">{mode.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* صور الخلفية */}
          {(banner.displayMode === 'text_image' || banner.displayMode === 'image_only') && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-semibold">صور الخلفية</h3>
              </div>

              {/* صورة عربية */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🇸🇦</span>
                  <label className="text-sm text-slate-300 font-medium">صورة للعربية (RTL)</label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={banner.backgroundImage}
                    onChange={(e) => handleImageUrlChange('backgroundImage', e.target.value)}
                    className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-sm"
                    placeholder="رابط مباشر أو رابط Google Drive"
                    aria-label="رابط صورة الخلفية للعربية"
                    dir="ltr"
                  />
                  <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all whitespace-nowrap ${
                    isUploadingBgAr ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{isUploadingBgAr ? 'جاري الرفع...' : 'رفع'}</span>
                    <input
                      ref={bgArInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleBgImageUpload(file, 'backgroundImage');
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {banner.backgroundImage && (
                    <button onClick={() => updateBanner('backgroundImage', '')} className="p-3 rounded-xl border border-slate-600 bg-slate-700 text-red-400 hover:bg-red-500/10" title="إزالة">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {banner.backgroundImage && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-600">
                    <img
                      src={banner.backgroundImage}
                      alt="معاينة الخلفية العربية"
                      className="w-full h-28 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              {/* صورة غير عربية */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🌐</span>
                  <label className="text-sm text-slate-300 font-medium">صورة لغير العربية (LTR)</label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={banner.backgroundImageNonAr || ''}
                    onChange={(e) => handleImageUrlChange('backgroundImageNonAr', e.target.value)}
                    className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-sm"
                    placeholder="رابط مباشر أو رابط Google Drive"
                    aria-label="رابط صورة الخلفية لغير العربية"
                    dir="ltr"
                  />
                  <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all whitespace-nowrap ${
                    isUploadingBgNonAr ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{isUploadingBgNonAr ? 'جاري الرفع...' : 'رفع'}</span>
                    <input
                      ref={bgNonArInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleBgImageUpload(file, 'backgroundImageNonAr');
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {banner.backgroundImageNonAr && (
                    <button onClick={() => updateBanner('backgroundImageNonAr', '')} className="p-3 rounded-xl border border-slate-600 bg-slate-700 text-red-400 hover:bg-red-500/10" title="إزالة">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {banner.backgroundImageNonAr && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-600">
                    <img
                      src={banner.backgroundImageNonAr}
                      alt="معاينة الخلفية الإنجليزية"
                      className="w-full h-28 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-3">يفضل بأبعاد 800×200 أو نسبة 4:1 — يدعم رفع مباشر أو لصق رابط Google Drive (يتم تحويله تلقائياً)</p>
            </div>
          )}

          {/* النصوص */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">النصوص</h3>
            </div>

            {/* العنوان الرئيسي — متعدد اللغات */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm text-slate-400 font-medium">العنوان الرئيسي</label>
                <TranslateButton
                  sourceText={banner.titles?.ar || banner.title || ''}
                  sourceLang="ar"
                  contentType="ui"
                  compact
                  label="🌍 ترجمة العنوان"
                  onTranslated={(translations) => {
                    setBanner(prev => ({
                      ...prev,
                      titles: { ...prev.titles, ...translations } as MultiLangText,
                    }));
                  }}
                />
              </div>
              {/* اللغات الأساسية */}
              {PRIMARY_LANGS.map(lang => (
                <div key={`title-${lang.code}`}>
                  <label className="block text-xs text-slate-500 mb-1">
                    {lang.flag} {lang.name}
                  </label>
                  <input
                    type="text"
                    value={(lang.code === 'ar' ? (banner.titles?.ar || banner.title) : banner.titles?.[lang.code as keyof MultiLangText]) || ''}
                    onChange={(e) => updateTitle(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    placeholder={lang.code === 'ar' ? 'مثال: رمضان مبارك' : 'Title...'}
                    aria-label={`العنوان بـ${lang.name}`}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                  />
                </div>
              ))}
              {/* باقي اللغات */}
              <button
                onClick={() => setShowOtherTitleLangs(!showOtherTitleLangs)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showOtherTitleLangs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showOtherTitleLangs ? 'إخفاء' : 'إظهار'} باقي اللغات ({OTHER_LANGS.length})
              </button>
              {showOtherTitleLangs && OTHER_LANGS.map(lang => (
                <div key={`title-${lang.code}`}>
                  <label className="block text-xs text-slate-500 mb-1">
                    {lang.flag} {lang.name}
                  </label>
                  <input
                    type="text"
                    value={banner.titles?.[lang.code as keyof MultiLangText] || ''}
                    onChange={(e) => updateTitle(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    placeholder={`ترجمة ${lang.name}...`}
                    aria-label={`العنوان بـ${lang.name}`}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700" />

            {/* العنوان الفرعي — متعدد اللغات */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm text-slate-400 font-medium">العنوان الفرعي</label>
                <TranslateButton
                  sourceText={banner.subtitles?.ar || banner.subtitle || ''}
                  sourceLang="ar"
                  contentType="ui"
                  compact
                  label="🌍 ترجمة العنوان الفرعي"
                  onTranslated={(translations) => {
                    setBanner(prev => ({
                      ...prev,
                      subtitles: { ...prev.subtitles, ...translations } as MultiLangText,
                    }));
                  }}
                />
              </div>
              {/* اللغات الأساسية */}
              {PRIMARY_LANGS.map(lang => (
                <div key={`subtitle-${lang.code}`}>
                  <label className="block text-xs text-slate-500 mb-1">
                    {lang.flag} {lang.name}
                  </label>
                  <input
                    type="text"
                    value={(lang.code === 'ar' ? (banner.subtitles?.ar || banner.subtitle) : banner.subtitles?.[lang.code as keyof MultiLangText]) || ''}
                    onChange={(e) => updateSubtitle(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    placeholder={lang.code === 'ar' ? 'مثال: كل عام وأنتم بخير' : 'Subtitle...'}
                    aria-label={`العنوان الفرعي بـ${lang.name}`}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                  />
                </div>
              ))}
              {/* باقي اللغات */}
              <button
                onClick={() => setShowOtherSubtitleLangs(!showOtherSubtitleLangs)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showOtherSubtitleLangs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showOtherSubtitleLangs ? 'إخفاء' : 'إظهار'} باقي اللغات ({OTHER_LANGS.length})
              </button>
              {showOtherSubtitleLangs && OTHER_LANGS.map(lang => (
                <div key={`subtitle-${lang.code}`}>
                  <label className="block text-xs text-slate-500 mb-1">
                    {lang.flag} {lang.name}
                  </label>
                  <input
                    type="text"
                    value={banner.subtitles?.[lang.code as keyof MultiLangText] || ''}
                    onChange={(e) => updateSubtitle(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    placeholder={`ترجمة ${lang.name}...`}
                    aria-label={`العنوان الفرعي بـ${lang.name}`}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                  />
                </div>
              ))}
            </div>
          </div>
          )}

          {/* الأيقونة */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">الأيقونة</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBanner(prev => ({ ...prev, icon: opt.value, customIconUrl: '' }))}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    banner.icon === opt.value && !banner.customIconUrl
                      ? 'border-emerald-500 bg-emerald-500/20 text-white'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{opt.label.split(' ')[0]}</span>
                  <p className="text-xs mt-1">{opt.label.split(' ').slice(1).join(' ')}</p>
                </button>
              ))}
            </div>

            {/* رفع أيقونة مخصصة */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400">أو رفع أيقونة مخصصة (PNG / SVG)</label>
                {banner.customIconUrl && (
                  <button
                    onClick={() => setBanner(prev => ({ ...prev, customIconUrl: '', icon: 'moon-waning-crescent' }))}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> إزالة
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                  banner.customIconUrl
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                }`}>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{isUploadingIcon ? 'جاري الرفع...' : 'رفع أيقونة'}</span>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleIconUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {banner.customIconUrl && (
                  <img src={banner.customIconUrl} alt="icon" className="w-10 h-10 rounded-lg object-contain border border-slate-600 bg-slate-700 p-1" />
                )}
              </div>
            </div>
          </div>
          )}

          {/* اللون */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">لون البانر</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateBanner('color', c.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    banner.color === c.value
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <Styled
                    className="w-5 h-5 rounded-full"
                    css={{ backgroundColor: c.value }}
                  />
                  <span className="text-sm text-slate-300">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-slate-400">لون مخصص:</label>
              <input
                type="color"
                value={banner.color}
                onChange={(e) => updateBanner('color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer"
                aria-label="اختيار لون مخصص"
              />
              <input
                type="text"
                value={banner.color}
                onChange={(e) => updateBanner('color', e.target.value)}
                className="bg-slate-700 text-white rounded-lg px-3 py-2 w-32 border border-slate-600 text-sm font-mono"
                aria-label="كود اللون"
                placeholder="#000000"
                dir="ltr"
              />
            </div>
          </div>
          )}

          {/* الوجهة / الإجراء */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Link className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">عند الضغط على البانر</h3>
            </div>

            {/* اختيار نوع الإجراء */}
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => updateBanner('actionType', 'navigate')}
                className={`flex-1 p-3 rounded-xl border text-sm text-center transition-all ${
                  (banner.actionType || 'navigate') === 'navigate'
                    ? 'border-emerald-500 bg-emerald-500/20 text-white'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Link className="w-4 h-4 mx-auto mb-1" />
                الانتقال لصفحة
              </button>
              <button
                onClick={() => updateBanner('actionType', 'toast')}
                className={`flex-1 p-3 rounded-xl border text-sm text-center transition-all ${
                  banner.actionType === 'toast'
                    ? 'border-emerald-500 bg-emerald-500/20 text-white'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <MessageSquare className="w-4 h-4 mx-auto mb-1" />
                إظهار إشعار (Toast)
              </button>
            </div>

            {/* عند اختيار الانتقال لصفحة */}
            {(banner.actionType || 'navigate') === 'navigate' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ROUTE_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        updateBanner('route', r.value);
                        setCustomRoute('');
                      }}
                      className={`p-3 rounded-xl border text-sm transition-all ${
                        banner.route === r.value && !customRoute
                          ? 'border-emerald-500 bg-emerald-500/20 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-slate-400 mb-2">أو أدخل رابط مخصص</label>
                  <input
                    type="text"
                    value={customRoute}
                    onChange={(e) => {
                      setCustomRoute(e.target.value);
                      if (e.target.value) {
                        updateBanner('route', e.target.value);
                      }
                    }}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-sm"
                    placeholder="/custom/route"
                    aria-label="رابط مخصص"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            {/* عند اختيار إظهار Toast */}
            {banner.actionType === 'toast' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">رسالة الإشعار (Toast)</label>
                  <button
                    onClick={copyToastToAllLangs}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> نسخ العربي لكل اللغات
                  </button>
                </div>

                <TranslateButton
                  sourceText={banner.toastTranslations?.ar || banner.toastMessage || ''}
                  sourceLang="ar"
                  contentType="notification"
                  compact
                  label="🌍 ترجمة تلقائية"
                  onTranslated={(translations) => {
                    setBanner(prev => ({ ...prev, toastTranslations: { ...prev.toastTranslations, ...translations } }));
                  }}
                />

                {/* اللغات الأساسية */}
                {PRIMARY_LANGS.map(lang => (
                  <div key={lang.code}>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang.flag} {lang.name}
                    </label>
                    <textarea
                      value={banner.toastTranslations?.[lang.code] || ''}
                      onChange={(e) => {
                        const updated = { ...banner.toastTranslations, [lang.code]: e.target.value };
                        setBanner(prev => ({ ...prev, toastTranslations: updated }));
                        if (lang.code === 'ar') {
                          setBanner(prev => ({ ...prev, toastMessage: e.target.value, toastTranslations: updated }));
                        }
                      }}
                      className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                      placeholder={lang.code === 'ar' ? 'رسالة التوست بالعربية...' : 'Toast message in English...'}
                      dir={lang.rtl ? 'rtl' : 'ltr'}
                      rows={2}
                    />
                  </div>
                ))}

                {/* باقي اللغات */}
                <button
                  onClick={() => setShowOtherLangs(!showOtherLangs)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showOtherLangs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showOtherLangs ? 'إخفاء' : 'إظهار'} باقي اللغات ({OTHER_LANGS.length})
                </button>

                {showOtherLangs && OTHER_LANGS.map(lang => (
                  <div key={lang.code}>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang.flag} {lang.name}
                    </label>
                    <textarea
                      value={banner.toastTranslations?.[lang.code] || ''}
                      onChange={(e) => {
                        const updated = { ...banner.toastTranslations, [lang.code]: e.target.value };
                        setBanner(prev => ({ ...prev, toastTranslations: updated }));
                      }}
                      className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                      placeholder={`ترجمة ${lang.name}...`}
                      dir={lang.rtl ? 'rtl' : 'ltr'}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* المعاينة */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <h3 className="text-white font-semibold">معاينة البانر</h3>

            {/* Preview — Arabic */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-500 mb-2 text-center">🇸🇦 عربي (RTL)</p>
              {banner.enabled ? (
                banner.displayMode === 'image_only' && banner.backgroundImage ? (
                  <div className="rounded-2xl overflow-hidden">
                    <img src={banner.backgroundImage} alt="banner" className="w-full h-24 object-cover" />
                  </div>
                ) : banner.displayMode === 'text_image' && banner.backgroundImage ? (
                  <Styled
                    className="rounded-2xl p-5 text-white relative overflow-hidden"
                    css={{ backgroundImage: `url(${banner.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    <div className="absolute inset-0 bg-black/40 rounded-2xl" />
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-lg font-bold">{banner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{banner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {renderPreviewIcon()}
                      </div>
                    </div>
                  </Styled>
                ) : (
                  <Styled
                    className="rounded-2xl p-5 text-white"
                    css={{ backgroundColor: `${banner.color}CC` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">{banner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{banner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {renderPreviewIcon()}
                      </div>
                    </div>
                  </Styled>
                )
              ) : (
                <div className="rounded-2xl p-5 bg-gray-300 text-gray-500 text-center">
                  <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">البانر مخفي</p>
                </div>
              )}
            </div>

            {/* Preview — Non-Arabic */}
            <div className="bg-slate-950 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-2 text-center">🌐 English / LTR</p>
              {(() => {
                const nonArImage = banner.backgroundImageNonAr || banner.backgroundImage;
                return banner.enabled ? (
                  banner.displayMode === 'image_only' && nonArImage ? (
                    <div className="rounded-2xl overflow-hidden">
                      <img src={nonArImage} alt="banner" className="w-full h-24 object-cover" />
                    </div>
                  ) : banner.displayMode === 'text_image' && nonArImage ? (
                    <Styled
                      className="rounded-2xl p-5 text-white relative overflow-hidden"
                      css={{ backgroundImage: `url(${nonArImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    >
                      <div className="absolute inset-0 bg-black/40 rounded-2xl" />
                      <div className="flex items-center justify-between relative z-10" dir="ltr">
                        <div>
                          <p className="text-lg font-bold">{banner.title || 'Title'}</p>
                          <p className="text-sm opacity-80">{banner.subtitle || 'Subtitle'}</p>
                        </div>
                        <div className="text-3xl opacity-80">
                          {renderPreviewIcon()}
                        </div>
                      </div>
                    </Styled>
                  ) : (
                    <Styled
                      className="rounded-2xl p-5 text-white"
                      css={{ backgroundColor: `${banner.color}CC` }}
                    >
                      <div className="flex items-center justify-between" dir="ltr">
                        <div>
                          <p className="text-lg font-bold">{banner.title || 'Title'}</p>
                          <p className="text-sm opacity-80">{banner.subtitle || 'Subtitle'}</p>
                        </div>
                        <div className="text-3xl opacity-80">
                          {renderPreviewIcon()}
                        </div>
                      </div>
                    </Styled>
                  )
                ) : (
                  <div className="rounded-2xl p-5 bg-slate-800 text-slate-500 text-center">
                    <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">البانر مخفي</p>
                  </div>
                );
              })()}
            </div>

            {/* Info */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">ملاحظات</h4>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>التغييرات تظهر فوراً بعد الحفظ</li>
                <li>يتم تحميل الإعدادات عند فتح التطبيق</li>
                <li>الصفحة المحددة تفتح عند الضغط على البانر</li>
                <li>البانر يظهر فقط عند تفعيل الخيار</li>
                <li>إذا لم تُحدد صورة لغير العربية، ستُستخدم الصورة العربية</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
