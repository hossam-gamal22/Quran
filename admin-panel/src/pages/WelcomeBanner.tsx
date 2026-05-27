// admin-panel/src/pages/WelcomeBanner.tsx
// إدارة الرسالة الترحيبية - روح المسلم

import React, { useState, useEffect, useMemo } from 'react';
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
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
  Calendar,
  Clock,
  Upload,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getAllArabicSeasonalBannerCopies,
  getArabicSeasonalBannerCopy,
  setArabicSeasonalBannerCopyOverrides,
  type SeasonalBannerCopy,
} from '@app-lib/seasonal-banner-copy';

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
  seasonKey?: string;
}

interface AdminSeasonMeta {
  type?: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  startDate?: { month: number; day: number };
  endDate?: { month: number; day: number };
  color?: string;
  icon?: string;
  greetings?: string[];
}

interface SeasonsMetadata {
  seasons?: Record<string, AdminSeasonMeta>;
}

interface HijriParts {
  day: number;
  month: number;
  year: number;
}

type SeasonalBannerCopyDrafts = Record<string, SeasonalBannerCopy>;

const RAMADAN_COPY = getArabicSeasonalBannerCopy('ramadan');

const DEFAULT_BANNER: WelcomeBannerData = {
  enabled: true,
  title: RAMADAN_COPY?.title || 'رمضان المبارك',
  subtitle: RAMADAN_COPY?.subtitle || 'شهر الصيام والقيام وتلاوة القرآن',
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
  { value: '/seasonal/hajj', label: 'صفحة الحج الموسمية' },
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
  { value: '/religious-stories', label: 'قصص دينية' },
  { value: '/radio', label: 'إذاعة القرآن' },
  { value: '/all-favorites', label: 'المحفوظات' },
  { value: '/subscription', label: 'الاشتراك' },
];

const SEASON_PRESET_OPTIONS = [
  { key: 'ramadan', icon: 'moon-waning-crescent', color: '#2f7659', route: '/seasonal/ramadan' },
  { key: 'hajj', icon: 'mosque', color: '#8B5E34', route: '/seasonal/hajj' },
  { key: 'dhul_hijjah', icon: 'star-crescent', color: '#5D4037', route: '/seasonal/hajj' },
  { key: 'eid_fitr', icon: 'party-popper', color: '#0D9488', route: '/seasonal/ramadan' },
  { key: 'eid_adha', icon: 'mosque', color: '#8B5E34', route: '/seasonal/hajj' },
  { key: 'mawlid', icon: 'star-four-points', color: '#2E8B57', route: '/seasonal/mawlid' },
  { key: 'ashura', icon: 'calendar-month', color: '#4A4A4A', route: '/seasonal/ashura' },
  { key: 'muharram', icon: 'calendar-month', color: '#696969', route: '/seasonal/ashura' },
  { key: 'rajab', icon: 'star-crescent', color: '#696969', route: '/seasonal' },
  { key: 'shaban', icon: 'moon-waning-crescent', color: '#2f7659', route: '/seasonal' },
].map((preset) => ({
  ...preset,
  copy: getArabicSeasonalBannerCopy(preset.key),
})).filter((preset) => preset.copy);

const UNIFIED_SEASON_TEXTS = SEASON_PRESET_OPTIONS.map((preset) => ({
  key: preset.key,
  icon: preset.icon,
  color: preset.color,
  route: preset.route,
  title: preset.copy!.title || '',
  subtitle: preset.copy!.subtitle,
}));

const DEFAULT_SEASON_COPY_DRAFTS = getAllArabicSeasonalBannerCopies();

const SEASON_PRIORITY = [
  'eid_fitr',
  'eid_adha',
  'mawlid',
  'ashura',
  'ramadan',
  'dhul_hijjah',
  'hajj',
  'muharram',
  'rajab',
  'shaban',
];

const DEFAULT_SEASON_RANGES: Record<string, { startDate: { month: number; day: number }; endDate: { month: number; day: number } }> = {
  ramadan: { startDate: { month: 9, day: 1 }, endDate: { month: 9, day: 30 } },
  hajj: { startDate: { month: 12, day: 8 }, endDate: { month: 12, day: 13 } },
  dhul_hijjah: { startDate: { month: 12, day: 1 }, endDate: { month: 12, day: 9 } },
  mawlid: { startDate: { month: 3, day: 12 }, endDate: { month: 3, day: 12 } },
  ashura: { startDate: { month: 1, day: 9 }, endDate: { month: 1, day: 10 } },
  eid_fitr: { startDate: { month: 10, day: 1 }, endDate: { month: 10, day: 3 } },
  eid_adha: { startDate: { month: 12, day: 10 }, endDate: { month: 12, day: 13 } },
  muharram: { startDate: { month: 1, day: 1 }, endDate: { month: 1, day: 30 } },
  rajab: { startDate: { month: 7, day: 1 }, endDate: { month: 7, day: 30 } },
  shaban: { startDate: { month: 8, day: 1 }, endDate: { month: 8, day: 30 } },
};

const getSeasonPreset = (seasonKey?: string | null) => (
  SEASON_PRESET_OPTIONS.find((preset) => preset.key === seasonKey)
);

const detectSeasonKey = (banner: WelcomeBannerData): string | null => {
  if (banner.seasonKey && getArabicSeasonalBannerCopy(banner.seasonKey)) return banner.seasonKey;

  const text = `${banner.title || ''} ${banner.subtitle || ''} ${banner.titles?.ar || ''} ${banner.subtitles?.ar || ''}`;
  if (text.includes('عيد الأضحى') || text.includes('أضحى')) return 'eid_adha';
  if (text.includes('عيد الفطر')) return 'eid_fitr';
  if (text.includes('العشر') || text.includes('ذي الحجة') || text.includes('ذو الحجة')) return 'dhul_hijjah';
  if (text.includes('رمضان')) return 'ramadan';
  if (text.includes('موسم الحج')) return 'hajj';
  if (text.includes('المولد')) return 'mawlid';
  if (text.includes('عاشوراء')) return 'ashura';
  if (text.includes('محرم')) return 'muharram';
  if (text.includes('رجب')) return 'rajab';
  if (text.includes('شعبان')) return 'shaban';
  return null;
};

const getHijriParts = (now = new Date()): HijriParts | null => {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const day = Number(parts.find(part => part.type === 'day')?.value);
    const month = Number(parts.find(part => part.type === 'month')?.value);
    const year = Number(parts.find(part => part.type === 'year')?.value);

    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      return { day, month, year };
    }
  } catch {
    return null;
  }

  return null;
};

const isHijriDateInRange = (
  hijri: HijriParts,
  start?: { month: number; day: number },
  end?: { month: number; day: number },
): boolean => {
  if (!start || !end) return false;
  const currentDays = (hijri.month - 1) * 30 + hijri.day;
  const startDays = (start.month - 1) * 30 + start.day;
  const endDays = (end.month - 1) * 30 + end.day;

  if (startDays > endDays) {
    return currentDays >= startDays || currentDays <= endDays;
  }

  return currentDays >= startDays && currentDays <= endDays;
};

const getCurrentSeasonKey = (metadata: SeasonsMetadata | null, now = new Date()): string | null => {
  const hijri = getHijriParts(now);
  if (!hijri) return null;

  const activeKeys = SEASON_PRIORITY.filter((seasonKey) => {
    const cmsRange = metadata?.seasons?.[seasonKey];
    const fallbackRange = DEFAULT_SEASON_RANGES[seasonKey];
    const startDate = cmsRange?.startDate || fallbackRange?.startDate;
    const endDate = cmsRange?.endDate || fallbackRange?.endDate;
    return isHijriDateInRange(hijri, startDate, endDate);
  });

  return activeKeys[0] || null;
};

const buildSeasonBanner = (seasonKey: string): WelcomeBannerData | null => {
  const copy = getArabicSeasonalBannerCopy(seasonKey);
  const preset = getSeasonPreset(seasonKey);
  if (!copy) return null;

  return {
    ...DEFAULT_BANNER,
    enabled: true,
    seasonKey,
    title: copy.title || '',
    subtitle: copy.subtitle,
    titles: { ar: copy.title || '' } as MultiLangText,
    subtitles: { ar: copy.subtitle } as MultiLangText,
    icon: preset?.icon || 'moon-waning-crescent',
    color: preset?.color || '#2f7659',
    route: preset?.route || '/(tabs)',
    displayMode: 'text',
    backgroundImage: '',
    backgroundImageNonAr: '',
  };
};

const looksLikeSeasonThatEndedBeforeEid = (
  banner: WelcomeBannerData,
  currentSeasonKey?: string | null,
): boolean => {
  const text = [
    banner.title,
    banner.subtitle,
    banner.titles?.ar,
    banner.subtitles?.ar,
    ...Object.values(banner.titles || {}),
    ...Object.values(banner.subtitles || {}),
  ].filter(Boolean).join(' ').toLowerCase();

  if (currentSeasonKey === 'eid_adha') {
    return text.includes('ذي الحجة')
      || text.includes('ذو الحجة')
      || text.includes('العشر')
      || text.includes('dhul hijjah')
      || text.includes('dhu al hijjah')
      || text.includes('dhu al-hijjah')
      || text.includes('first ten');
  }

  if (currentSeasonKey === 'eid_fitr') {
    return text.includes('رمضان') || text.includes('ramadan');
  }

  return false;
};

const getEffectiveBanner = (
  manualBanner: WelcomeBannerData,
  adminSeasonalBanner: WelcomeBannerData | null,
  currentSeasonKey: string | null,
  now = new Date(),
): WelcomeBannerData | null => {
  const seasonalBanner = adminSeasonalBanner || (currentSeasonKey ? buildSeasonBanner(currentSeasonKey) : null);
  const manualVisible = isBannerVisibleNow(manualBanner, now);
  const isCurrentEid = currentSeasonKey === 'eid_fitr' || currentSeasonKey === 'eid_adha';

  if (manualVisible) {
    if (seasonalBanner && isCurrentEid && looksLikeSeasonThatEndedBeforeEid(manualBanner, currentSeasonKey)) {
      return seasonalBanner;
    }

    return withUnifiedSeasonCopy(manualBanner);
  }

  return seasonalBanner;
};

const isBannerVisibleNow = (banner: WelcomeBannerData, now = new Date()): boolean => {
  if (!banner.enabled) return false;
  if (banner.scheduledFrom && new Date(banner.scheduledFrom) > now) return false;
  if (banner.scheduledUntil && new Date(banner.scheduledUntil) < now) return false;
  return true;
};

const withUnifiedSeasonCopy = (banner: WelcomeBannerData): WelcomeBannerData => {
  const seasonKey = detectSeasonKey(banner);
  const copy = getArabicSeasonalBannerCopy(seasonKey);
  if (!seasonKey || !copy) return banner;

  return {
    ...banner,
    seasonKey,
    title: copy.title || banner.title,
    subtitle: copy.subtitle,
    titles: {
      ...banner.titles,
      ar: copy.title || banner.titles?.ar || banner.title,
    } as MultiLangText,
    subtitles: {
      ...banner.subtitles,
      ar: copy.subtitle,
    } as MultiLangText,
  };
};

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
// المكون الرئيسي
// ========================================

export default function WelcomeBanner() {
  const [banner, setBanner] = useState<WelcomeBannerData>(DEFAULT_BANNER);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [customRoute, setCustomRoute] = useState('');
  const [seasonsMetadata, setSeasonsMetadata] = useState<SeasonsMetadata | null>(null);
  const [adminSeasonalBanner, setAdminSeasonalBanner] = useState<WelcomeBannerData | null>(null);
  const [seasonCopyDrafts, setSeasonCopyDrafts] = useState<SeasonalBannerCopyDrafts>(DEFAULT_SEASON_COPY_DRAFTS);

  const [showOtherLangs, setShowOtherLangs] = useState(false);
  const [showOtherTitleLangs, setShowOtherTitleLangs] = useState(false);
  const [showOtherSubtitleLangs, setShowOtherSubtitleLangs] = useState(false);
  const bannerVisibleNow = isBannerVisibleNow(banner);
  const detectedSeasonKey = detectSeasonKey(banner);
  const actualSeasonCopy = detectedSeasonKey ? getArabicSeasonalBannerCopy(detectedSeasonKey) : null;
  const currentSeasonKey = useMemo(() => getCurrentSeasonKey(seasonsMetadata), [seasonsMetadata]);
  const effectiveBanner = useMemo(
    () => getEffectiveBanner(banner, adminSeasonalBanner, currentSeasonKey),
    [adminSeasonalBanner, banner, currentSeasonKey],
  );
  const effectiveSeasonKey = effectiveBanner ? detectSeasonKey(effectiveBanner) : currentSeasonKey;
  const effectiveCopy = effectiveSeasonKey ? getArabicSeasonalBannerCopy(effectiveSeasonKey) : null;


  // Handle URL input - warn about Google Drive links
  const handleImageUrlChange = (field: 'backgroundImage' | 'backgroundImageNonAr', value: string) => {
    if (value.includes('drive.google.com')) {
      alert('⚠️ روابط Google Drive لا تعمل!\n\nاستخدم رابط صورة مباشر من:\n• Imgur (imgur.com)\n• imgbb (imgbb.com)\n• أي CDN للصور');
      return;
    }
    updateBanner(field, value);
  };

  // Upload image directly from device → Firebase Storage → save URL
  const [uploadingField, setUploadingField] = useState<'backgroundImage' | 'backgroundImageNonAr' | null>(null);
  const handleImageUpload = async (
    field: 'backgroundImage' | 'backgroundImageNonAr',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('⚠️ يجب اختيار ملف صورة (JPG / PNG / WebP)');
      if (e.target) e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ حجم الصورة أكبر من 5 MB. اختر صورة أصغر.');
      if (e.target) e.target.value = '';
      return;
    }
    setUploadingField(field);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `uploads/welcome-banner/${field}_${Date.now()}_${safeName}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      updateBanner(field, url);
    } catch (err) {
      alert(`❌ فشل الرفع: ${(err as Error).message}`);
    } finally {
      setUploadingField(null);
      if (e.target) e.target.value = '';
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
  const renderPreviewIcon = (previewBanner: WelcomeBannerData = banner) => {
    if (previewBanner.customIconUrl) {
      return <img src={previewBanner.customIconUrl} alt="icon" className="w-8 h-8 object-contain" />;
    }
    return <span>{ICON_OPTIONS.find(i => i.value === previewBanner.icon)?.label.split(' ')[0] || '🌙'}</span>;
  };

  const updateSeasonCopyDraft = (
    seasonKey: string,
    field: keyof SeasonalBannerCopy,
    value: string,
  ) => {
    setSeasonCopyDrafts(prev => ({
      ...prev,
      [seasonKey]: {
        ...prev[seasonKey],
        [field]: value,
      },
    }));
  };

  const buildLegacySeasonsMetadataPatch = (
    copies: Record<string, SeasonalBannerCopy>,
    existing: SeasonsMetadata | null,
  ): SeasonsMetadata => {
    const seasons = { ...(existing?.seasons || {}) };

    for (const item of UNIFIED_SEASON_TEXTS) {
      const copy = copies[item.key];
      if (!copy) continue;
      const fallbackRange = DEFAULT_SEASON_RANGES[item.key];
      const preset = getSeasonPreset(item.key);
      seasons[item.key] = {
        ...(seasons[item.key] || {}),
        startDate: seasons[item.key]?.startDate || fallbackRange?.startDate,
        endDate: seasons[item.key]?.endDate || fallbackRange?.endDate,
        color: seasons[item.key]?.color || preset?.color,
        icon: seasons[item.key]?.icon || preset?.icon,
        nameAr: copy.title || seasons[item.key]?.nameAr || item.title,
        description: copy.subtitle,
        greetings: [copy.subtitle],
      };
    }

    return { seasons };
  };

  // تحميل البيانات من Firestore
  useEffect(() => {
    const loadBanner = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, FIRESTORE_DOC);
        const [docSnap, seasonsSnap, seasonalCopySnap, seasonalContentSnap] = await Promise.all([
          getDoc(docRef),
          getDoc(doc(db, 'appContent', 'seasonsMetadata')),
          getDoc(doc(db, 'appContent', 'seasonalBannerCopy')),
          getDocs(query(
            collection(db, 'seasonalContent'),
            where('isActive', '==', true),
            orderBy('priority', 'asc'),
          )).catch((error) => {
            console.warn('Seasonal content preview unavailable:', error);
            return null;
          }),
        ]);

        const seasonalCopyData = seasonalCopySnap.exists() ? seasonalCopySnap.data() : null;
        const loadedCopies = getAllArabicSeasonalBannerCopies(
          (seasonalCopyData?.copies || seasonalCopyData || null) as Record<string, Partial<SeasonalBannerCopy>> | null,
        );
        setSeasonCopyDrafts(loadedCopies);
        setArabicSeasonalBannerCopyOverrides(loadedCopies);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.welcomeBanner) {
            setBanner(withUnifiedSeasonCopy({ ...DEFAULT_BANNER, ...data.welcomeBanner }));
            // Check if route is custom
            const isPreset = ROUTE_OPTIONS.some(r => r.value === data.welcomeBanner.route);
            if (!isPreset) {
              setCustomRoute(data.welcomeBanner.route);
            }
          }
        }

        const metadata = seasonsSnap.exists() ? (seasonsSnap.data() as SeasonsMetadata) : null;
        setSeasonsMetadata(metadata);

        const now = new Date();
        const hijri = getHijriParts(now);
        let bestSeasonal: WelcomeBannerData | null = null;
        let bestSortKey = '';
        seasonalContentSnap?.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          const seasonKey = String(data.seasonType || '');
          const range = DEFAULT_SEASON_RANGES[seasonKey];
          const activeByHijri = hijri && range
            ? isHijriDateInRange(hijri, range.startDate, range.endDate)
            : false;
          const activeCustom = seasonKey === 'custom'
            && data.startDate
            && data.endDate
            && now >= new Date(data.startDate)
            && now <= new Date(data.endDate);

          if (!activeByHijri && !activeCustom) return;

          const priority = Number.isFinite(Number(data.priority)) ? Number(data.priority) : 999;
          const sortKey = `${String(priority).padStart(6, '0')}|${seasonKey}|${snapshotDoc.id}`;
          if (bestSeasonal && sortKey >= bestSortKey) return;

          const copy = getArabicSeasonalBannerCopy(seasonKey);
          const preset = getSeasonPreset(seasonKey);
          bestSortKey = sortKey;
          bestSeasonal = withUnifiedSeasonCopy({
            ...DEFAULT_BANNER,
            enabled: true,
            seasonKey,
            title: copy?.title || data.titleAr || data.titleEn || '',
            subtitle: copy?.subtitle || data.contentAr || data.contentEn || '',
            titles: { ar: copy?.title || data.titleAr || data.titleEn || '' } as MultiLangText,
            subtitles: { ar: copy?.subtitle || data.contentAr || data.contentEn || '' } as MultiLangText,
            icon: data.icon || preset?.icon || 'moon-waning-crescent',
            color: data.backgroundColor || preset?.color || '#2f7659',
            route: data.targetScreen ? `/${data.targetScreen}` : preset?.route || '/(tabs)',
            displayMode: data.backgroundImage ? 'text_image' : 'text',
            backgroundImage: data.backgroundImage || '',
            backgroundImageNonAr: data.backgroundImageNonAr || '',
          });
        });
        setAdminSeasonalBanner(bestSeasonal);
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
      const savedCopies = getAllArabicSeasonalBannerCopies(seasonCopyDrafts);
      setArabicSeasonalBannerCopyOverrides(savedCopies);

      // Ensure titles/subtitles ar field is synced with title/subtitle
      const unifiedBanner = withUnifiedSeasonCopy(banner);
      const bannerToSave = {
        ...unifiedBanner,
        titles: {
          ...unifiedBanner.titles,
          ar: unifiedBanner.titles?.ar || unifiedBanner.title,
        },
        subtitles: {
          ...unifiedBanner.subtitles,
          ar: unifiedBanner.subtitles?.ar || unifiedBanner.subtitle,
        },
      };

      // Phase B7: use merge:true to avoid race conditions with NavigationUI
      // (both pages write to the same doc but to different top-level fields).
      // Previously we did read-then-spread which could clobber concurrent writes.
      const updatedAt = new Date().toISOString();
      const legacyMetadata = buildLegacySeasonsMetadataPatch(savedCopies, seasonsMetadata);
      await Promise.all([
        setDoc(docRef, { welcomeBanner: bannerToSave }, { merge: true }),
        setDoc(doc(db, 'appContent', 'seasonalBannerCopy'), {
          copies: savedCopies,
          updatedAt,
        }, { merge: true }),
        setDoc(doc(db, 'appContent', 'seasonsMetadata'), {
          ...legacyMetadata,
          updatedAt,
        }, { merge: true }),
      ]);
      setBanner(bannerToSave);
      setSeasonCopyDrafts(savedCopies);
      setSeasonsMetadata(legacyMetadata);

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

  const applySeasonPreset = (preset: typeof SEASON_PRESET_OPTIONS[number]) => {
    const copy = preset.copy!;
    setBanner(prev => withUnifiedSeasonCopy({
      ...prev,
      seasonKey: preset.key,
      title: copy.title || prev.title,
      subtitle: copy.subtitle,
      titles: {
        ...prev.titles,
        ar: copy.title || prev.titles?.ar || prev.title,
      } as MultiLangText,
      subtitles: {
        ...prev.subtitles,
        ar: copy.subtitle,
      } as MultiLangText,
      icon: preset.icon,
      customIconUrl: '',
      color: preset.color,
      route: preset.route,
      displayMode: prev.displayMode || 'text',
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-accent-light animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-accent-light" />
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
              : 'bg-accent hover:bg-accent-dark text-white'
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
          <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {banner.enabled ? (
                  <Eye className="w-5 h-5 text-accent-light" />
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
                  banner.enabled ? 'bg-accent' : 'bg-admin-surface-light'
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
          <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-accent-light" />
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
                  className="w-full p-3 rounded-xl bg-admin-surface-light border border-admin-border text-white text-sm focus:outline-none focus:border-accent"
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
                  className="w-full p-3 rounded-xl bg-admin-surface-light border border-admin-border text-white text-sm focus:outline-none focus:border-accent"
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
          <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
            <div className="flex items-center gap-2 mb-4">
              <Layout className="w-5 h-5 text-accent-light" />
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
                        ? 'border-accent bg-accent/20 text-white'
                        : 'border-admin-border bg-admin-surface-light text-slate-300 hover:border-slate-500'
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
            <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-5 h-5 text-accent-light" />
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
                    className="flex-1 bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors font-mono text-sm"
                    placeholder="رابط صورة مباشر أو ارفع من جهازك ←"
                    aria-label="رابط صورة الخلفية للعربية"
                    dir="ltr"
                  />
                  <label className={`p-3 rounded-xl border border-admin-border bg-accent/20 text-accent-light hover:bg-accent/30 cursor-pointer transition-colors flex items-center gap-2 ${uploadingField === 'backgroundImage' ? 'opacity-60 pointer-events-none' : ''}`} title="رفع صورة من الجهاز">
                    {uploadingField === 'backgroundImage' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-xs whitespace-nowrap">رفع</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('backgroundImage', e)} />
                  </label>

                  {banner.backgroundImage && (
                    <button onClick={() => updateBanner('backgroundImage', '')} className="p-3 rounded-xl border border-admin-border bg-admin-surface-light text-red-400 hover:bg-red-500/10" title="إزالة">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {banner.backgroundImage && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-admin-border">
                    <img
                      src={banner.backgroundImage}
                      alt="معاينة الخلفية العربية"
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.error-msg')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'error-msg p-4 text-center text-red-400 text-sm bg-red-500/10';
                          errorDiv.textContent = 'فشل تحميل الصورة - تأكد من صحة الرابط';
                          parent.appendChild(errorDiv);
                        }
                      }}
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
                    className="flex-1 bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors font-mono text-sm"
                    placeholder="رابط صورة مباشر أو ارفع من جهازك ←"
                    aria-label="رابط صورة الخلفية لغير العربية"
                    dir="ltr"
                  />
                  <label className={`p-3 rounded-xl border border-admin-border bg-accent/20 text-accent-light hover:bg-accent/30 cursor-pointer transition-colors flex items-center gap-2 ${uploadingField === 'backgroundImageNonAr' ? 'opacity-60 pointer-events-none' : ''}`} title="رفع صورة من الجهاز">
                    {uploadingField === 'backgroundImageNonAr' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-xs whitespace-nowrap">رفع</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('backgroundImageNonAr', e)} />
                  </label>

                  {banner.backgroundImageNonAr && (
                    <button onClick={() => updateBanner('backgroundImageNonAr', '')} className="p-3 rounded-xl border border-admin-border bg-admin-surface-light text-red-400 hover:bg-red-500/10" title="إزالة">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {banner.backgroundImageNonAr && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-admin-border">
                    <img
                      src={banner.backgroundImageNonAr}
                      alt="معاينة الخلفية الإنجليزية"
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.error-msg')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'error-msg p-4 text-center text-red-400 text-sm bg-red-500/10';
                          errorDiv.textContent = 'فشل تحميل الصورة - تأكد من صحة الرابط';
                          parent.appendChild(errorDiv);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-3">يفضل بأبعاد 1200×343 أو نسبة 3.5:1 — اضغط زرّ <strong className="text-accent-light">رفع</strong> لرفع صورة مباشرة من جهازك (حتى 5MB)، أو الصق رابط مباشر من Imgur / imgbb. ⚠️ روابط Google Drive لا تعمل.</p>
            </div>
          )}

          {/* النصوص */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-5 h-5 text-accent-light" />
              <h3 className="text-white font-semibold">النصوص</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-400 font-medium">نصوص المواسم الموحدة</label>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {SEASON_PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => applySeasonPreset(preset)}
                    className={`rounded-xl border px-3 py-2 text-right transition-colors ${
                      banner.seasonKey === preset.key
                        ? 'border-accent bg-accent/20 text-white'
                        : 'border-admin-border bg-admin-surface-light text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{preset.copy?.title}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{preset.copy?.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-admin-border" />

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
                    className="w-full bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors text-sm"
                    placeholder={lang.code === 'ar' ? 'مثال: عيد الأضحى المبارك' : 'Title...'}
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
                    className="w-full bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors text-sm"
                    placeholder={`ترجمة ${lang.name}...`}
                    aria-label={`العنوان بـ${lang.name}`}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-admin-border" />

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
                    className="w-full bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors text-sm"
                    placeholder={lang.code === 'ar' ? 'مثال: تقبل الله منا ومنكم صالح الأعمال' : 'Subtitle...'}
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
                    className="w-full bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors text-sm"
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
          <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent-light" />
              <h3 className="text-white font-semibold">الأيقونة</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBanner(prev => ({ ...prev, icon: opt.value, customIconUrl: '' }))}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    banner.icon === opt.value && !banner.customIconUrl
                      ? 'border-accent bg-accent/20 text-white'
                      : 'border-admin-border bg-admin-surface-light text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{opt.label.split(' ')[0]}</span>
                  <p className="text-xs mt-1">{opt.label.split(' ').slice(1).join(' ')}</p>
                </button>
              ))}
            </div>

            {/* رفع أيقونة مخصصة */}
            <div className="mt-4 pt-4 border-t border-admin-border">
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
                <input
                  type="text"
                  value={banner.customIconUrl || ''}
                  onChange={(e) => setBanner(prev => ({ ...prev, customIconUrl: e.target.value, icon: e.target.value ? '__custom__' : 'moon-waning-crescent' }))}
                  className="flex-1 bg-admin-surface-light text-white rounded-xl px-4 py-2.5 border border-admin-border focus:border-accent focus:outline-none transition-colors font-mono text-sm"
                  placeholder="رابط صورة الأيقونة (Imgur, imgbb, etc.)"
                  dir="ltr"
                />
                {banner.customIconUrl && (
                  <img src={banner.customIconUrl} alt="icon" className="w-10 h-10 rounded-lg object-contain border border-admin-border bg-admin-surface-light p-1" />
                )}
              </div>
            </div>
          </div>
          )}

          {/* اللون */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-accent-light" />
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
                      : 'border-admin-border hover:border-slate-500'
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
                className="w-10 h-10 rounded-lg border border-admin-border cursor-pointer"
                aria-label="اختيار لون مخصص"
              />
              <input
                type="text"
                value={banner.color}
                onChange={(e) => updateBanner('color', e.target.value)}
                className="bg-admin-surface-light text-white rounded-lg px-3 py-2 w-32 border border-admin-border text-sm font-mono"
                aria-label="كود اللون"
                placeholder="#000000"
                dir="ltr"
              />
            </div>
          </div>
          )}

          {/* الوجهة / الإجراء */}
          <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
            <div className="flex items-center gap-2 mb-4">
              <Link className="w-5 h-5 text-accent-light" />
              <h3 className="text-white font-semibold">عند الضغط على البانر</h3>
            </div>

            {/* اختيار نوع الإجراء */}
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => updateBanner('actionType', 'navigate')}
                className={`flex-1 p-3 rounded-xl border text-sm text-center transition-all ${
                  (banner.actionType || 'navigate') === 'navigate'
                    ? 'border-accent bg-accent/20 text-white'
                    : 'border-admin-border bg-admin-surface-light text-slate-300 hover:border-slate-500'
                }`}
              >
                <Link className="w-4 h-4 mx-auto mb-1" />
                الانتقال لصفحة
              </button>
              <button
                onClick={() => updateBanner('actionType', 'toast')}
                className={`flex-1 p-3 rounded-xl border text-sm text-center transition-all ${
                  banner.actionType === 'toast'
                    ? 'border-accent bg-accent/20 text-white'
                    : 'border-admin-border bg-admin-surface-light text-slate-300 hover:border-slate-500'
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
                          ? 'border-accent bg-accent/20 text-white'
                          : 'border-admin-border bg-admin-surface-light text-slate-300 hover:border-slate-500'
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
                    className="w-full bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors font-mono text-sm"
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
                    className="text-xs text-accent-light hover:text-emerald-300 flex items-center gap-1"
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
                      className="w-full bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors text-sm"
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
                      className="w-full bg-admin-surface-light text-white rounded-xl px-4 py-3 border border-admin-border focus:border-accent focus:outline-none transition-colors text-sm"
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
            <div>
              <h3 className="text-white font-semibold">البانر الفعلي للمستخدمين الآن</h3>
              <p className="text-xs text-slate-500 mt-1">
                نفس اختيار التطبيق بعد تطبيق الجدولة وأولوية المواسم.
              </p>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4 border-2 border-accent/40">
              <p className="text-xs text-gray-500 mb-2 text-center">
                {effectiveSeasonKey && effectiveCopy
                  ? `${effectiveCopy.title || effectiveSeasonKey} · فعّال الآن`
                  : 'لا يوجد بانر فعّال الآن'}
              </p>
              {effectiveBanner ? (
                effectiveBanner.displayMode === 'image_only' && effectiveBanner.backgroundImage ? (
                  <div className="rounded-2xl overflow-hidden">
                    <img src={effectiveBanner.backgroundImage} alt="actual banner" className="w-full h-24 object-cover" />
                  </div>
                ) : effectiveBanner.displayMode === 'text_image' && effectiveBanner.backgroundImage ? (
                  <Styled
                    className="rounded-2xl p-5 text-white relative overflow-hidden"
                    css={{ backgroundImage: `url(${effectiveBanner.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    <div className="absolute inset-0 bg-black/40 rounded-2xl" />
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-lg font-bold">{effectiveBanner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{effectiveBanner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {renderPreviewIcon(effectiveBanner)}
                      </div>
                    </div>
                  </Styled>
                ) : (
                  <Styled
                    className="rounded-2xl p-5 text-white"
                    css={{ backgroundColor: `${effectiveBanner.color || '#2f7659'}CC` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">{effectiveBanner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{effectiveBanner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {renderPreviewIcon(effectiveBanner)}
                      </div>
                    </div>
                  </Styled>
                )
              ) : (
                <div className="rounded-2xl p-5 bg-gray-300 text-gray-500 text-center">
                  <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا يوجد بانر ظاهر</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-white font-semibold">معاينة التحرير</h3>
              <p className="text-xs text-slate-500 mt-1">
                هذه تعرض البانر المحفوظ في صفحة الرسالة الترحيبية فقط، وليست دائماً ما يراه المستخدم إذا كانت الجدولة منتهية أو يوجد بانر موسمي أعلى أولوية.
              </p>
            </div>

            {!bannerVisibleNow && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-right">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200">هذا البانر لا يظهر للمستخدمين الآن</p>
                    <p className="text-xs text-amber-100/80 mt-1">
                      التطبيق سيعرض بانر الموسم/العيد الفعلي بدل هذا البانر حسب الأولوية والجدولة.
                    </p>
                    {actualSeasonCopy && (
                      <div className="mt-3 rounded-xl bg-black/20 p-3">
                        <p className="text-xs text-amber-100/70">النص الموحد لهذا الموسم:</p>
                        <p className="text-sm text-white font-semibold mt-1">{actualSeasonCopy.title}</p>
                        <p className="text-xs text-white/80 mt-1">{actualSeasonCopy.subtitle}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                  <div className="rounded-2xl p-5 bg-admin-surface text-slate-500 text-center">
                    <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">البانر مخفي</p>
                  </div>
                );
              })()}
            </div>

            {/* Info */}
            <div className="bg-admin-surface rounded-2xl p-4 border border-admin-border">
              <h4 className="text-sm font-semibold text-accent-light mb-2">ملاحظات</h4>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>التغييرات تظهر فوراً بعد الحفظ</li>
                <li>يتم تحميل الإعدادات عند فتح التطبيق</li>
                <li>الصفحة المحددة تفتح عند الضغط على البانر</li>
                <li>البانر يظهر فقط عند تفعيل الخيار</li>
                <li>إذا لم تُحدد صورة لغير العربية، ستُستخدم الصورة العربية</li>
              </ul>
            </div>

            <div className="bg-admin-surface rounded-2xl p-4 border border-admin-border">
              <h4 className="text-sm font-semibold text-accent-light mb-3">النصوص الموحدة من Firebase</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {UNIFIED_SEASON_TEXTS.map((item) => (
                  <div key={item.key} className="rounded-xl bg-admin-surface-light/60 border border-admin-border/60 p-3">
                    <label className="block text-xs text-slate-500 mb-1">العنوان</label>
                    <input
                      value={seasonCopyDrafts[item.key]?.title || ''}
                      onChange={(event) => updateSeasonCopyDraft(item.key, 'title', event.target.value)}
                      className="w-full bg-admin-surface text-white rounded-lg px-3 py-2 border border-admin-border focus:border-accent focus:outline-none text-sm font-semibold"
                      dir="rtl"
                    />
                    <label className="block text-xs text-slate-500 mt-2 mb-1">النص</label>
                    <textarea
                      value={seasonCopyDrafts[item.key]?.subtitle || ''}
                      onChange={(event) => updateSeasonCopyDraft(item.key, 'subtitle', event.target.value)}
                      className="w-full bg-admin-surface text-slate-100 rounded-lg px-3 py-2 border border-admin-border focus:border-accent focus:outline-none text-xs"
                      dir="rtl"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                عند الحفظ تُرسل هذه النصوص للتطبيقات الجديدة وتُزامن مع حقول المواسم القديمة في Firebase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
