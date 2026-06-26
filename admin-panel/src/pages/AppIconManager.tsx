// admin-panel/src/pages/AppIconManager.tsx
// مركز التحكم الكامل في أيقونة التطبيق:
//  • الأيقونة الحالية الفعلية + سبب التفعيل + المدة المتبقية + الأيقونة التالية
//  • Timeline للأولويات والمواسم القادمة
//  • تحكم يدوي كامل (فوري / مجدول / استهداف منصة وإصدار)
//  • مكتبة الأيقونات (تفعيل/تعطيل/منصات/صور معاينة)
//  • قواعد المواسم (ربط الأيقونة + التفعيل) — نوافذ التواريخ مصدرها صفحة المواسم
//  • حالة النشر + سجل التعديلات + رسائل التنبيه متعددة اللغات
//
// كل منطق "أي أيقونة فعّالة الآن ولماذا" يأتي من المُحلّل المشترك
// `@app-lib/app-icon-resolver` — نفس الكود الذي يشغّله التطبيق — حتى لا تنحرف
// المعاينة هنا عمّا يراه المستخدم فعليًا.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  Save,
  Bell,
  BellOff,
  Loader2,
  Info,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Languages,
  Sparkles,
  Clock,
  Zap,
  RotateCcw,
  XCircle,
  Trash2,
  History,
  Radio,
  Layers,
  Smartphone,
  Upload,
  ExternalLink,
  ListOrdered,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { bumpContentVersion } from '../utils/content-version';
import { logIconAudit, subscribeIconAudit, type IconAuditRecord } from '../utils/app-icon-audit';
import { getArabicSeasonalBannerCopy } from '@app-lib/seasonal-banner-copy';
import {
  computeIconState,
  getActiveSeason,
  getUpcomingSeason,
  normalizeIconKey,
  DEFAULT_SEASONAL_MAP,
  SEASON_PRIORITY,
  SEASON_NAMES_AR,
  ICON_KIND,
  hijriFromGregorian,
  type AppIconsConfig,
  type SeasonalIconKey,
  type SeasonName,
  type IconMode,
  type IconSchedule,
  type IconMeta,
  type IconPlatform,
  type SeasonalLocalizedText,
  type MonthDay,
} from '@app-lib/app-icon-resolver';

import defaultArIcon from '../../../assets/images/icons/icon.png';
import defaultEnIcon from '../../../assets/images/icons/icon_en.png';
import ramadanIcon from '../../../assets/images/icons/seasonal/ramadan.png';
import hajjIcon from '../../../assets/images/icons/seasonal/hajj.png';
import mawlidIcon from '../../../assets/images/icons/seasonal/mawlid.png';
import eidFitrIcon from '../../../assets/images/icons/seasonal/eid_fitr.png';
import eidAdhaIcon from '../../../assets/images/icons/seasonal/eid_adha.png';
import hijriNewYearIcon from '../../../assets/images/icons/seasonal/hijri_new_year.png';

// ─── Constants ───────────────────────────────────────────

type LangCode = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

const LANGUAGES: { code: LangCode; nameAr: string; nameEn: string; rtl: boolean }[] = [
  { code: 'ar', nameAr: 'العربية', nameEn: 'Arabic', rtl: true },
  { code: 'en', nameAr: 'الإنجليزية', nameEn: 'English', rtl: false },
  { code: 'fr', nameAr: 'الفرنسية', nameEn: 'French', rtl: false },
  { code: 'de', nameAr: 'الألمانية', nameEn: 'German', rtl: false },
  { code: 'es', nameAr: 'الإسبانية', nameEn: 'Spanish', rtl: false },
  { code: 'tr', nameAr: 'التركية', nameEn: 'Turkish', rtl: false },
  { code: 'ur', nameAr: 'الأردية', nameEn: 'Urdu', rtl: true },
  { code: 'id', nameAr: 'الإندونيسية', nameEn: 'Indonesian', rtl: false },
  { code: 'ms', nameAr: 'الماليزية', nameEn: 'Malay', rtl: false },
  { code: 'hi', nameAr: 'الهندية', nameEn: 'Hindi', rtl: false },
  { code: 'bn', nameAr: 'البنغالية', nameEn: 'Bengali', rtl: false },
  { code: 'ru', nameAr: 'الروسية', nameEn: 'Russian', rtl: false },
];

const ICON_IMAGES: Record<SeasonalIconKey, string> = {
  default_ar: defaultArIcon,
  default_en: defaultEnIcon,
  ramadan: ramadanIcon,
  hajj: hajjIcon,
  mawlid: mawlidIcon,
  eid_fitr: eidFitrIcon,
  eid_adha: eidAdhaIcon,
  hijri_new_year: hijriNewYearIcon,
};

const ICON_NAMES_AR: Record<SeasonalIconKey, string> = {
  default_ar: 'الافتراضية (عربي)',
  default_en: 'الافتراضية (إنجليزي)',
  ramadan: 'رمضان',
  hajj: 'الحج',
  mawlid: 'المولد النبوي',
  eid_fitr: 'عيد الفطر',
  eid_adha: 'عيد الأضحى',
  hijri_new_year: 'رأس السنة الهجرية',
};

const ALL_ICON_KEYS: SeasonalIconKey[] = [
  'default_ar',
  'default_en',
  'ramadan',
  'hajj',
  'mawlid',
  'eid_fitr',
  'eid_adha',
  'hijri_new_year',
];

const SEASON_LIST: SeasonName[] = [
  'ramadan',
  'hajj',
  'mawlid',
  'eid_fitr',
  'eid_adha',
  'dhul_hijjah',
  'hijri_new_year',
  'ashura',
  'muharram',
  'rajab',
  'shaban',
];

const KIND_LABEL: Record<'default' | 'seasonal' | 'event', string> = {
  default: 'افتراضية',
  seasonal: 'موسمية',
  event: 'مناسبة',
};

const SOURCE_LABEL: Record<string, string> = {
  schedule: 'تبديل يدوي مجدول',
  manual: 'تبديل يدوي دائم',
  seasonal: 'موسمية تلقائية',
  default: 'افتراضية',
};

const SOURCE_BADGE: Record<string, string> = {
  schedule: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  manual: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  seasonal: 'bg-accent/20 text-accent-light border-accent/30',
  default: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const seasonTitleAr = (season: SeasonName, fallback: string) =>
  getArabicSeasonalBannerCopy(season as any)?.title || fallback;
const seasonSubtitleAr = (season: SeasonName, fallback: string) =>
  getArabicSeasonalBannerCopy(season as any)?.subtitle || fallback;

const DEFAULT_SEASONAL_ALERT_TITLES: SeasonalLocalizedText = {
  ramadan: { ar: seasonTitleAr('ramadan', 'رمضان المبارك'), en: 'Ramadan Mubarak' },
  hajj: { ar: seasonTitleAr('hajj', 'موسم الحج'), en: 'Blessed Hajj Season' },
  dhul_hijjah: { ar: seasonTitleAr('dhul_hijjah', 'العشر الأوائل من ذي الحجة'), en: 'Blessed Days' },
  eid_fitr: { ar: seasonTitleAr('eid_fitr', 'عيد الفطر المبارك'), en: 'Eid al-Fitr Mubarak' },
  eid_adha: { ar: seasonTitleAr('eid_adha', 'عيد الأضحى المبارك'), en: 'Eid al-Adha Mubarak' },
  mawlid: { ar: seasonTitleAr('mawlid', 'ذكرى المولد النبوي'), en: 'Mawlid Reminder' },
  hijri_new_year: { ar: seasonTitleAr('hijri_new_year', 'رأس السنة الهجرية'), en: 'Hijri New Year' },
  ashura: { ar: seasonTitleAr('ashura', 'عاشوراء'), en: 'Day of Ashura' },
  muharram: { ar: seasonTitleAr('muharram', 'شهر محرم'), en: 'Blessed Hijri Year' },
  rajab: { ar: seasonTitleAr('rajab', 'شهر رجب'), en: 'Rajab' },
  shaban: { ar: seasonTitleAr('shaban', 'شهر شعبان'), en: 'Blessed Shaban' },
};

const DEFAULT_SEASONAL_ALERT_MESSAGES: SeasonalLocalizedText = {
  ramadan: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('ramadan', 'رمضان المبارك')}. ${seasonSubtitleAr('ramadan', 'شهر الصيام والقيام وتلاوة القرآن')}.`,
    en: 'The app icon has been updated for Ramadan. Ramadan Mubarak, and may Allah accept your fasting and prayers.',
  },
  hajj: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('hajj', 'موسم الحج')}. ${seasonSubtitleAr('hajj', 'الركن الخامس من أركان الإسلام')}.`,
    en: 'The app icon has been updated for Hajj season. May Allah accept the pilgrims Hajj and your good deeds.',
  },
  dhul_hijjah: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('dhul_hijjah', 'العشر الأوائل من ذي الحجة')}. ${seasonSubtitleAr('dhul_hijjah', 'أفضل أيام الدنيا — فأكثروا من العمل الصالح')}.`,
    en: 'The app icon has been updated for the first ten days of Dhul Hijjah. May these blessed days be filled with remembrance and good deeds.',
  },
  eid_fitr: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('eid_fitr', 'عيد الفطر المبارك')}. ${seasonSubtitleAr('eid_fitr', 'كل عام وأنتم بخير — تقبل الله طاعتكم')}.`,
    en: 'The app icon has been updated for Eid al-Fitr. Eid Mubarak, and may Allah accept from us and from you.',
  },
  eid_adha: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('eid_adha', 'عيد الأضحى المبارك')}. ${seasonSubtitleAr('eid_adha', 'تقبل الله منا ومنكم صالح الأعمال')}.`,
    en: 'The app icon has been updated for Eid al-Adha. Eid Mubarak, and may Allah accept your worship.',
  },
  mawlid: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('mawlid', 'ذكرى المولد النبوي')}. ${seasonSubtitleAr('mawlid', 'صلوا على النبي ﷺ')}.`,
    en: 'The app icon has been updated for the Mawlid reminder. Peace and blessings be upon Prophet Muhammad.',
  },
  hijri_new_year: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('hijri_new_year', 'رأس السنة الهجرية')}. ${seasonSubtitleAr('hijri_new_year', 'كل عام وأنتم بخير — عام هجري مبارك')}.`,
    en: 'The app icon has been updated for the new Hijri year. May Allah make it a year of goodness and blessings.',
  },
  ashura: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('ashura', 'عاشوراء')}. ${seasonSubtitleAr('ashura', 'صيامه يكفر سنة ماضية')}.`,
    en: 'The app icon has been updated for Ashura. May Allah accept your fasting and good deeds.',
  },
  muharram: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('muharram', 'شهر محرم')}. ${seasonSubtitleAr('muharram', 'أول شهور السنة الهجرية')}.`,
    en: 'The app icon has been updated for the Hijri new year. May Allah make it a year of goodness and blessings.',
  },
  rajab: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('rajab', 'شهر رجب')}. ${seasonSubtitleAr('rajab', 'من الأشهر الحرم — أعظِم فيه الطاعة')}.`,
    en: 'The app icon has been updated for Rajab, one of the sacred months. May Allah bless it for us.',
  },
  shaban: {
    ar: `تم تحديث أيقونة التطبيق بمناسبة ${seasonTitleAr('shaban', 'شهر شعبان')}. ${seasonSubtitleAr('shaban', 'اللهم بلِّغنا رمضان')}.`,
    en: 'The app icon has been updated for Shaban. May Allah bless it for us and let us reach Ramadan.',
  },
};

function buildDefaultLibrary(): Record<SeasonalIconKey, IconMeta> {
  const lib = {} as Record<SeasonalIconKey, IconMeta>;
  for (const key of ALL_ICON_KEYS) {
    lib[key] = {
      enabled: true,
      platforms: ['ios', 'android'],
      previewUrl: null,
      lastUsedAt: null,
      kind: ICON_KIND[key],
    };
  }
  return lib;
}

const DEFAULT_CONFIG: AppIconsConfig = {
  version: 0,
  alertEnabled: true,
  alertTitle: 'تم تحديث أيقونة التطبيق',
  alertMessage: 'تم تحديث أيقونة التطبيق بنجاح! استمتع بالتصميم الجديد',
  alertTitleEn: 'App Icon Updated',
  alertMessageEn: 'The app icon has been updated! Enjoy the new design',
  alertTitleI18n: { ar: 'تم تحديث أيقونة التطبيق', en: 'App Icon Updated' },
  alertMessageI18n: {
    ar: 'تم تحديث أيقونة التطبيق بنجاح! استمتع بالتصميم الجديد',
    en: 'The app icon has been updated! Enjoy the new design',
  },
  seasonalAlertTitleI18n: DEFAULT_SEASONAL_ALERT_TITLES,
  seasonalAlertMessageI18n: DEFAULT_SEASONAL_ALERT_MESSAGES,
  mode: 'auto',
  manualIcon: null,
  seasonalMap: { ...DEFAULT_SEASONAL_MAP },
  enabledSeasons: ['ramadan', 'hajj', 'mawlid', 'eid_fitr', 'eid_adha', 'dhul_hijjah', 'hijri_new_year'],
  schedules: [],
  iconLibrary: buildDefaultLibrary(),
  configRevision: 0,
  updatedAt: '',
};

const FIRESTORE_DOC = 'appConfig/appIcons';
const SEASONS_META_DOC = 'appContent/seasonsMetadata';

// ─── Small format helpers ────────────────────────────────

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'انتهى';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} يوم`);
  if (hours) parts.push(`${hours} ساعة`);
  if (!days) parts.push(`${mins} دقيقة`);
  return parts.join(' و ') || 'أقل من دقيقة';
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function scopeLabel(platforms: IconPlatform[], min?: string | null, max?: string | null): string {
  const parts: string[] = [];
  if (!platforms || platforms.length === 0 || platforms.length === 2) parts.push('كل المنصات');
  else parts.push(platforms[0] === 'ios' ? 'iOS فقط' : 'Android فقط');
  if (min) parts.push(`إصدار ≥ ${min}`);
  if (max) parts.push(`إصدار ≤ ${max}`);
  return parts.join(' • ');
}

// ─── Component ───────────────────────────────────────────

export default function AppIconManager() {
  const [config, setConfig] = useState<AppIconsConfig>(DEFAULT_CONFIG);
  const [seasonRanges, setSeasonRanges] = useState<Partial<Record<SeasonName, { start: MonthDay; end: MonthDay }>>>({});
  const [auditRecords, setAuditRecords] = useState<IconAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<null | 'save' | 'announce' | 'action'>(null);
  const saving = savingAction !== null;
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>('ar');
  const [activeSeasonAlert, setActiveSeasonAlert] = useState<SeasonName>('ramadan');
  const [now, setNow] = useState<Date>(new Date());

  // Preview context (whose icon are we previewing).
  const [previewPlatform, setPreviewPlatform] = useState<IconPlatform>('android');
  const [previewLang, setPreviewLang] = useState<'ar' | 'other'>('ar');
  const [previewVersion, setPreviewVersion] = useState('');

  // Manual control form.
  const [formIcon, setFormIcon] = useState<SeasonalIconKey>('ramadan');
  const [formType, setFormType] = useState<'now' | 'window'>('now');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formPlatforms, setFormPlatforms] = useState<IconPlatform[]>([]);
  const [formMinVer, setFormMinVer] = useState('');
  const [formMaxVer, setFormMaxVer] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formAnnounce, setFormAnnounce] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<SeasonalIconKey | null>(null);

  const manualRef = useRef<HTMLDivElement | null>(null);
  const schedulesRef = useRef<HTMLDivElement | null>(null);

  // ─── Live clock for countdowns ───────────────────────
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // ─── Load icon config ────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, FIRESTORE_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<AppIconsConfig>;
          const mergedMap = { ...DEFAULT_SEASONAL_MAP, ...(data.seasonalMap ?? {}) };
          const seasonalMap = Object.fromEntries(
            Object.entries(mergedMap).map(([s, ic]) => [s, normalizeIconKey(ic as SeasonalIconKey)])
          ) as Record<SeasonName, SeasonalIconKey>;
          const iconLibrary = { ...buildDefaultLibrary(), ...(data.iconLibrary ?? {}) };
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            manualIcon: data.manualIcon ? normalizeIconKey(data.manualIcon) : data.manualIcon ?? null,
            seasonalMap,
            iconLibrary,
            schedules: (data.schedules ?? []).map((s) => ({ ...s, iconKey: normalizeIconKey(s.iconKey) })),
            alertTitleI18n: { ...DEFAULT_CONFIG.alertTitleI18n, ...(data.alertTitleI18n ?? {}) },
            alertMessageI18n: { ...DEFAULT_CONFIG.alertMessageI18n, ...(data.alertMessageI18n ?? {}) },
            seasonalAlertTitleI18n: { ...DEFAULT_SEASONAL_ALERT_TITLES, ...(data.seasonalAlertTitleI18n ?? {}) },
            seasonalAlertMessageI18n: { ...DEFAULT_SEASONAL_ALERT_MESSAGES, ...(data.seasonalAlertMessageI18n ?? {}) },
          });
        } else {
          setConfig(DEFAULT_CONFIG);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error loading app icons config:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // ─── Load authoritative season windows (seasons_metadata) ──
  useEffect(() => {
    const unsub = onSnapshot(doc(db, SEASONS_META_DOC), (snap) => {
      if (!snap.exists()) {
        setSeasonRanges({});
        return;
      }
      const seasons = (snap.data()?.seasons ?? {}) as Record<string, { startDate?: MonthDay; endDate?: MonthDay }>;
      const ranges: Partial<Record<SeasonName, { start: MonthDay; end: MonthDay }>> = {};
      for (const key of SEASON_LIST) {
        const meta = seasons[key];
        if (meta?.startDate && meta?.endDate) {
          ranges[key] = { start: meta.startDate, end: meta.endDate };
        }
      }
      setSeasonRanges(ranges);
    });
    return unsub;
  }, []);

  // ─── Audit log ───────────────────────────────────────
  useEffect(() => subscribeIconAudit(setAuditRecords), []);

  // ─── Derived: the effective icon state for the preview context ──
  const previewLanguage = previewLang === 'ar' ? 'ar' : 'en';
  const enabledSeasons = config.enabledSeasons ?? [];

  const activeSeasonInfo = useMemo(
    () => getActiveSeason(now, { ranges: seasonRanges, enabledSeasons }),
    [now, seasonRanges, enabledSeasons]
  );
  const upcomingSeason = useMemo(
    () => getUpcomingSeason(now, { ranges: seasonRanges, enabledSeasons }),
    [now, seasonRanges, enabledSeasons]
  );

  const effective = useMemo(
    () =>
      computeIconState(config, {
        now,
        platform: previewPlatform,
        appVersion: previewVersion || undefined,
        language: previewLanguage,
        currentSeason: activeSeasonInfo?.season ?? null,
      }),
    [config, now, previewPlatform, previewVersion, previewLanguage, activeSeasonInfo]
  );

  const hijriLabel = useMemo(() => hijriFromGregorian(now).label, [now]);

  const iconImg = (key: SeasonalIconKey): string =>
    config.iconLibrary?.[key]?.previewUrl || ICON_IMAGES[key];
  const iconName = (key: SeasonalIconKey): string =>
    config.iconLibrary?.[key]?.displayNameAr || ICON_NAMES_AR[key];

  const usableIconKeys = ALL_ICON_KEYS.filter((k) => config.iconLibrary?.[k]?.enabled !== false);

  // ─── Persist ─────────────────────────────────────────

  const persistConfig = async (
    next: AppIconsConfig,
    opts: { announce?: boolean; audit?: Parameters<typeof logIconAudit>[0]; action?: boolean } = {}
  ) => {
    const { announce = false, audit, action = false } = opts;
    setSavingAction(action ? 'action' : announce ? 'announce' : 'save');
    setSaveMessage(null);
    try {
      const updated: AppIconsConfig = {
        ...next,
        alertTitle: next.alertTitleI18n?.ar || next.alertTitle,
        alertMessage: next.alertMessageI18n?.ar || next.alertMessage,
        alertTitleEn: next.alertTitleI18n?.en || next.alertTitleEn,
        alertMessageEn: next.alertMessageI18n?.en || next.alertMessageEn,
        version: announce ? (next.version || 0) + 1 : next.version || 0,
        configRevision: (next.configRevision || 0) + 1,
        lastPublishedAt: announce ? new Date().toISOString() : next.lastPublishedAt,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, FIRESTORE_DOC), updated);
      await bumpContentVersion('appIcons');
      setConfig(updated);
      if (audit) await logIconAudit(audit);
      else if (announce) await logIconAudit({ action: 'publish', announce: true });
      setSaveMessage({
        type: 'success',
        text: announce ? 'تم الحفظ وإرسال الإشعار للمستخدمين' : 'تم الحفظ',
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving app icons config:', err);
      setSaveMessage({ type: 'error', text: `حدث خطأ: ${(err as Error).message}` });
    } finally {
      setSavingAction(null);
    }
  };

  // ─── Manual control actions ──────────────────────────

  const addSchedule = async (kind: 'now' | 'window') => {
    if (kind === 'window' && (!formStart || !formEnd)) {
      setSaveMessage({ type: 'error', text: 'حدد تاريخ البداية والنهاية' });
      return;
    }
    const schedule: IconSchedule = {
      id: crypto.randomUUID(),
      iconKey: formIcon,
      startAt: kind === 'window' ? fromLocalInput(formStart) : null,
      endAt: kind === 'window' ? fromLocalInput(formEnd) : null,
      platforms: formPlatforms.length ? formPlatforms : undefined,
      minAppVersion: formMinVer || null,
      maxAppVersion: formMaxVer || null,
      enabled: true,
      note: formNote || undefined,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    };
    const next: AppIconsConfig = { ...config, schedules: [...(config.schedules ?? []), schedule] };
    await persistConfig(next, {
      action: true,
      announce: formAnnounce,
      audit: {
        action: kind === 'now' ? 'manual_switch' : 'schedule_add',
        to: formIcon,
        announce: formAnnounce,
        detail:
          kind === 'now'
            ? 'تفعيل فوري حتى إشعار آخر'
            : `مجدول ${fmtDateTime(schedule.startAt)} → ${fmtDateTime(schedule.endAt)}`,
      },
    });
    setFormNote('');
    setFormAnnounce(false);
  };

  const updateSchedule = async (id: string, patch: Partial<IconSchedule>, audit?: Parameters<typeof logIconAudit>[0]) => {
    const next: AppIconsConfig = {
      ...config,
      schedules: (config.schedules ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    };
    await persistConfig(next, { action: true, audit });
  };

  const removeSchedule = async (id: string) => {
    if (!window.confirm('حذف هذه الجدولة؟')) return;
    const removed = (config.schedules ?? []).find((s) => s.id === id);
    const next: AppIconsConfig = { ...config, schedules: (config.schedules ?? []).filter((s) => s.id !== id) };
    await persistConfig(next, {
      action: true,
      audit: { action: 'schedule_remove', to: removed?.iconKey ?? null, detail: 'حذف جدولة' },
    });
  };

  const deactivateCurrent = async () => {
    if (effective.source === 'schedule' && effective.activeScheduleId) {
      await updateSchedule(
        effective.activeScheduleId,
        { enabled: false },
        { action: 'schedule_toggle', from: effective.iconKey, detail: 'إلغاء تفعيل الجدولة النشطة' }
      );
    } else if (effective.source === 'manual') {
      await persistConfig(
        { ...config, manualIcon: null, mode: 'auto' },
        { action: true, audit: { action: 'clear_override', from: effective.iconKey, detail: 'إلغاء الوضع اليدوي' } }
      );
    }
  };

  const clearAllOverrides = async () => {
    if (!window.confirm('سيتم إلغاء كل التبديلات اليدوية والمجدولة والعودة للوضع التلقائي (الموسمي/الافتراضي). متابعة؟'))
      return;
    await persistConfig(
      { ...config, schedules: [], manualIcon: null, mode: 'auto' },
      { action: true, audit: { action: 'clear_override', detail: 'إلغاء كل الـ overrides' } }
    );
  };

  const revertToDefault = async () => {
    if (!window.confirm('العودة للأيقونة الافتراضية (إلغاء كل التبديلات + الوضع التلقائي)؟')) return;
    await persistConfig(
      { ...config, schedules: [], manualIcon: null, mode: 'auto' },
      { action: true, audit: { action: 'revert_default', from: effective.iconKey, to: 'default', detail: 'العودة للافتراضي' } }
    );
  };

  const handleUploadPreview = async (key: SeasonalIconKey, file: File) => {
    setUploadingKey(key);
    try {
      const safe = file.name.replace(/[^\w.\-]/g, '_');
      const path = `uploads/app-icon-previews/${key}_${Date.now()}_${safe}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      const meta = config.iconLibrary?.[key] ?? buildDefaultLibrary()[key];
      await persistConfig(
        { ...config, iconLibrary: { ...config.iconLibrary, [key]: { ...meta, previewUrl: url } } },
        { action: true, audit: { action: 'library_toggle', to: key, detail: 'رفع صورة معاينة' } }
      );
    } catch (err) {
      setSaveMessage({ type: 'error', text: `فشل الرفع: ${(err as Error).message}` });
    } finally {
      setUploadingKey(null);
    }
  };

  const toggleIconEnabled = async (key: SeasonalIconKey) => {
    const meta = config.iconLibrary?.[key] ?? buildDefaultLibrary()[key];
    const nextEnabled = !(meta.enabled !== false);
    await persistConfig(
      { ...config, iconLibrary: { ...config.iconLibrary, [key]: { ...meta, enabled: nextEnabled } } },
      {
        action: true,
        audit: { action: 'library_toggle', to: key, detail: nextEnabled ? 'تفعيل أيقونة' : 'تعطيل أيقونة' },
      }
    );
  };

  const toggleIconPlatform = async (key: SeasonalIconKey, platform: IconPlatform) => {
    const meta = config.iconLibrary?.[key] ?? buildDefaultLibrary()[key];
    const has = meta.platforms.includes(platform);
    const platforms = has ? meta.platforms.filter((p) => p !== platform) : [...meta.platforms, platform];
    await persistConfig(
      { ...config, iconLibrary: { ...config.iconLibrary, [key]: { ...meta, platforms } } },
      { action: true, audit: { action: 'library_toggle', to: key, detail: `منصات: ${platforms.join('/') || 'لا شيء'}` } }
    );
  };

  // ─── Save (settings: alert / mode / seasonal map) ────
  const handleSaveSettings = (announce: boolean) =>
    persistConfig(config, {
      announce,
      audit: { action: announce ? 'publish' : 'save', mode: config.mode, announce },
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Derived flags for warnings.
  const expiresMs = effective.expiresAt ? Date.parse(effective.expiresAt) - now.getTime() : null;
  const endingSoon = expiresMs !== null && expiresMs > 0 && expiresMs < 3 * 24 * 60 * 60 * 1000;
  const indefiniteOverride =
    (effective.source === 'schedule' && !effective.expiresAt) || effective.source === 'manual';
  const onlyDefault = effective.source === 'default';
  const activeSchedules = (config.schedules ?? []).filter((s) => s.enabled);

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent/20 rounded-xl">
            <ImageIcon className="w-6 h-6 text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">مركز التحكم في أيقونة التطبيق</h1>
            <p className="text-sm text-admin-muted mt-0.5">
              تحكم كامل: الأيقونة الحالية، الجدولة الزمنية، المواسم، المكتبة، والنشر — بدون تحديث المتجر
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-admin-bg text-admin-muted px-3 py-1 rounded-full text-xs border border-admin-border">
            التاريخ الهجري: {hijriLabel}
          </span>
          <span className="bg-accent/20 text-accent-light px-3 py-1 rounded-full text-sm">
            الإصدار: {config.version} • التعديل #{config.configRevision ?? 0}
          </span>
        </div>
      </div>

      {/* Constraint info */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300 leading-relaxed space-y-1">
          <p>
            الأيقونات الفعلية (الـ ٨) مُجمَّعة داخل نسخة التطبيق. التبديل بينها يحدث <b>عند فتح المستخدم
            للتطبيق</b> (أو خلال مهمة خلفية كل ٦ ساعات تقريبًا) — وليس فوريًا. إضافة/استبدال صورة أيقونة
            إطلاق <b>حقيقية</b> يتطلب نسخة جديدة على المتجر؛ هنا تتحكم في التبديل + الجدولة + المعاينات فقط.
          </p>
          <p className="text-xs opacity-80">
            ⚠️ الجدولة الزمنية واستهداف المنصة/الإصدار تعتمد على منطق داخل التطبيق — تسري فقط على النسخ التي
            تحتوي التحديث الجديد. النسخ الأقدم تتبع: يدوي/موسمي/افتراضي.
          </p>
        </div>
      </div>

      {/* ─── 1) Current Active Icon hero ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-light" />
            <h2 className="text-lg font-bold text-white">الأيقونة الحالية الفعلية</h2>
          </div>
          {/* Preview context selector */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex bg-admin-bg rounded-lg border border-admin-border overflow-hidden">
              {(['android', 'ios'] as IconPlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreviewPlatform(p)}
                  className={`px-3 py-1.5 ${previewPlatform === p ? 'bg-accent text-white' : 'text-admin-muted'}`}
                >
                  {p === 'android' ? 'Android' : 'iOS'}
                </button>
              ))}
            </div>
            <div className="flex bg-admin-bg rounded-lg border border-admin-border overflow-hidden">
              {(['ar', 'other'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setPreviewLang(l)}
                  className={`px-3 py-1.5 ${previewLang === l ? 'bg-accent text-white' : 'text-admin-muted'}`}
                >
                  {l === 'ar' ? 'مستخدم عربي' : 'لغة أخرى'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-5 items-start">
          {/* Big preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl border border-admin-border bg-admin-bg">
              <img src={iconImg(effective.iconKey)} alt={iconName(effective.iconKey)} className="w-full h-full object-cover" />
            </div>
            <span className={`px-3 py-1 rounded-full text-xs border ${SOURCE_BADGE[effective.source]}`}>
              {SOURCE_LABEL[effective.source]}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="text-xl font-bold text-white">{iconName(effective.iconKey)}</div>
            <div className="text-sm text-admin-muted">السبب: {effective.reason}</div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
                <div className="text-xs text-admin-muted mb-1">بدأ التفعيل</div>
                <div className="text-white">{effective.source === 'seasonal' ? 'مع بداية الموسم' : fmtDateTime(effective.startedAt)}</div>
              </div>
              <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
                <div className="text-xs text-admin-muted mb-1">ينتهي</div>
                <div className="text-white">
                  {effective.source === 'seasonal' && effective.seasonDaysRemaining != null
                    ? `بعد ~${effective.seasonDaysRemaining} يوم (نهاية الموسم)`
                    : effective.expiresAt
                    ? fmtDateTime(effective.expiresAt)
                    : indefiniteOverride
                    ? 'حتى إشعار آخر'
                    : '—'}
                </div>
              </div>
              <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
                <div className="text-xs text-admin-muted mb-1">المتبقي</div>
                <div className={endingSoon ? 'text-amber-300 font-semibold' : 'text-white'}>
                  {expiresMs != null ? fmtCountdown(expiresMs) : indefiniteOverride ? 'مفتوح' : '—'}
                </div>
              </div>
              <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
                <div className="text-xs text-admin-muted mb-1">النطاق</div>
                <div className="text-white">{scopeLabel(effective.scope.platforms, effective.scope.minAppVersion, effective.scope.maxAppVersion)}</div>
              </div>
            </div>

            {effective.nextSchedule && (
              <div className="text-xs text-purple-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                التالي المجدول: {iconName(effective.nextSchedule.iconKey)} — يبدأ {fmtDateTime(effective.nextSchedule.startAt)}
              </div>
            )}

            {/* Warnings */}
            {endingSoon && (
              <div className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4" /> ستنتهي الأيقونة الحالية قريبًا.
              </div>
            )}
            {indefiniteOverride && (
              <div className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4" /> تبديل يدوي مفتوح بلا نهاية — لن تعمل المواسم التلقائية حتى تُلغيه.
              </div>
            )}
            {onlyDefault && (
              <div className="flex items-center gap-2 text-xs bg-slate-500/10 border border-slate-500/30 text-slate-300 rounded-lg px-3 py-2">
                <Info className="w-4 h-4" /> لا يوجد تبديل نشط — المستخدمون يرون الأيقونة الافتراضية.
              </div>
            )}
          </div>
        </div>

        {/* Hero actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-admin-border">
          <button
            type="button"
            onClick={() => manualRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-lg text-sm"
          >
            <Zap className="w-4 h-4" /> تغيير الآن
          </button>
          <button
            type="button"
            onClick={deactivateCurrent}
            disabled={saving || (effective.source !== 'schedule' && effective.source !== 'manual')}
            className="flex items-center gap-2 bg-admin-bg hover:bg-admin-surface-light border border-admin-border text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40"
          >
            <XCircle className="w-4 h-4" /> إلغاء التفعيل
          </button>
          <button
            type="button"
            onClick={revertToDefault}
            disabled={saving}
            className="flex items-center gap-2 bg-admin-bg hover:bg-admin-surface-light border border-admin-border text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" /> العودة للافتراضي
          </button>
          <button
            type="button"
            onClick={() => schedulesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 bg-admin-bg hover:bg-admin-surface-light border border-admin-border text-white px-4 py-2 rounded-lg text-sm"
          >
            <Clock className="w-4 h-4" /> تعديل الجدولة
          </button>
        </div>
      </div>

      {/* ─── 2) Timeline ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">الجدول الزمني والأولويات</h2>
        </div>

        <div className="space-y-2">
          {/* current */}
          <TimelineRow
            badge="الآن"
            badgeClass="bg-accent text-white"
            img={iconImg(effective.iconKey)}
            title={iconName(effective.iconKey)}
            subtitle={`${SOURCE_LABEL[effective.source]} — ${effective.reason}`}
            range={
              effective.expiresAt
                ? `حتى ${fmtDateTime(effective.expiresAt)}`
                : effective.source === 'seasonal' && effective.seasonDaysRemaining != null
                ? `~${effective.seasonDaysRemaining} يوم متبقٍ`
                : indefiniteOverride
                ? 'حتى إشعار آخر'
                : 'مستمر'
            }
          />
          {/* next scheduled */}
          {effective.nextSchedule && (
            <TimelineRow
              badge="التالي"
              badgeClass="bg-purple-500/30 text-purple-200"
              img={iconImg(effective.nextSchedule.iconKey)}
              title={iconName(effective.nextSchedule.iconKey)}
              subtitle="تبديل يدوي مجدول"
              range={`يبدأ ${fmtDateTime(effective.nextSchedule.startAt)}`}
            />
          )}
          {/* upcoming season */}
          {upcomingSeason && (
            <TimelineRow
              badge="موسم قادم"
              badgeClass="bg-accent/20 text-accent-light"
              img={iconImg(normalizeIconKey((config.seasonalMap ?? {})[upcomingSeason.season] ?? DEFAULT_SEASONAL_MAP[upcomingSeason.season]))}
              title={SEASON_NAMES_AR[upcomingSeason.season]}
              subtitle="موسمية تلقائية"
              range={`بعد ~${upcomingSeason.daysUntil} يوم`}
            />
          )}
        </div>

        {/* Priority legend */}
        <div className="bg-admin-bg rounded-xl p-4 border border-admin-border text-xs text-admin-muted leading-relaxed">
          <div className="text-white font-semibold mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-light" /> ترتيب الأولوية عند التعارض (الأعلى يكسب):
          </div>
          <ol className="space-y-1 list-decimal pr-5">
            <li><b className="text-purple-300">تبديل يدوي مجدول نشط</b> (ضمن نطاقه الزمني + المنصة + الإصدار) — يكسب حتى على المواسم.</li>
            <li><b className="text-amber-300">وضع يدوي دائم</b> (manualIcon).</li>
            <li><b className="text-accent-light">موسمية تلقائية</b> (حسب أولوية المواسم: {SEASON_PRIORITY.slice(0, 4).map((s) => SEASON_NAMES_AR[s]).join(' ← ')} …).</li>
            <li><b className="text-slate-300">الافتراضية</b> حسب اللغة.</li>
          </ol>
          <p className="mt-2">الأيقونة المعطّلة في المكتبة تُتجاوز تلقائيًا وتنتقل الأولوية لما بعدها.</p>
        </div>
      </div>

      {/* ─── 3) Manual control ─── */}
      <div ref={manualRef} className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">التحكم اليدوي الكامل</h2>
        </div>

        {/* Icon picker */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_ICON_KEYS.map((key) => {
            const disabled = config.iconLibrary?.[key]?.enabled === false;
            const active = formIcon === key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => setFormIcon(key)}
                className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                  active ? 'border-accent bg-accent/10 ring-2 ring-accent/30' : 'border-admin-border bg-admin-bg hover:border-admin-muted'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-admin-surface-light">
                  <img src={iconImg(key)} alt={iconName(key)} className="w-full h-full object-cover" />
                </div>
                <div className={`text-xs text-center ${active ? 'text-accent-light' : 'text-white'}`}>{iconName(key)}</div>
              </button>
            );
          })}
        </div>

        {/* Type */}
        <div className="flex flex-wrap gap-2">
          {([
            { v: 'now', label: 'تفعيل فوري (حتى إشعار آخر)' },
            { v: 'window', label: 'فترة محددة (من / إلى)' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setFormType(opt.v)}
              className={`px-4 py-2 rounded-lg text-sm border ${
                formType === opt.v ? 'border-accent bg-accent/10 text-accent-light' : 'border-admin-border bg-admin-bg text-admin-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {formType === 'window' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm text-admin-muted">
              من
              <input
                type="datetime-local"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="mt-1 w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-white text-sm"
              />
            </label>
            <label className="text-sm text-admin-muted">
              إلى
              <input
                type="datetime-local"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="mt-1 w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-white text-sm"
              />
            </label>
          </div>
        )}

        {/* Targeting */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="text-sm text-admin-muted">
            المنصات (فارغ = الكل)
            <div className="flex gap-2 mt-1">
              {(['android', 'ios'] as IconPlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setFormPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    formPlatforms.includes(p) ? 'border-accent bg-accent/10 text-accent-light' : 'border-admin-border bg-admin-bg text-admin-muted'
                  }`}
                >
                  {p === 'android' ? 'Android' : 'iOS'}
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm text-admin-muted">
            أقل إصدار (اختياري)
            <input
              value={formMinVer}
              onChange={(e) => setFormMinVer(e.target.value)}
              placeholder="مثال 2.3.0"
              className="mt-1 w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-white text-sm"
            />
          </label>
          <label className="text-sm text-admin-muted">
            أعلى إصدار (اختياري)
            <input
              value={formMaxVer}
              onChange={(e) => setFormMaxVer(e.target.value)}
              placeholder="مثال 3.0.0"
              className="mt-1 w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-white text-sm"
            />
          </label>
        </div>

        <input
          value={formNote}
          onChange={(e) => setFormNote(e.target.value)}
          placeholder="ملاحظة (اختياري)"
          className="w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-white text-sm"
        />

        <label className="flex items-center gap-2 text-sm text-admin-muted">
          <input type="checkbox" checked={formAnnounce} onChange={(e) => setFormAnnounce(e.target.checked)} />
          إرسال إشعار للمستخدمين بهذا التغيير (يزيد رقم الإصدار)
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addSchedule(formType)}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {savingAction === 'action' ? <Loader2 className="w-4 h-4 animate-spin" /> : formType === 'now' ? <Zap className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {formType === 'now' ? 'تفعيل الآن' : 'جدولة'}
          </button>
          <button
            type="button"
            onClick={clearAllOverrides}
            disabled={saving}
            className="flex items-center gap-2 bg-admin-bg border border-admin-border text-white px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> إلغاء كل التبديلات اليدوية
          </button>
        </div>
      </div>

      {/* Schedules list */}
      <div ref={schedulesRef} className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">التبديلات المجدولة ({(config.schedules ?? []).length})</h2>
        </div>
        {(config.schedules ?? []).length === 0 ? (
          <div className="text-sm text-admin-muted bg-admin-bg rounded-lg p-4 border border-admin-border">
            لا توجد جدولة. أنشئ واحدة من «التحكم اليدوي» بالأعلى.
          </div>
        ) : (
          (config.schedules ?? [])
            .slice()
            .sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'))
            .map((s) => {
              const isActiveNow = effective.activeScheduleId === s.id;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isActiveNow ? 'border-accent bg-accent/10' : 'border-admin-border bg-admin-bg'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-admin-surface-light flex-shrink-0">
                    <img src={iconImg(s.iconKey)} alt={iconName(s.iconKey)} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium flex items-center gap-2">
                      {iconName(s.iconKey)}
                      {isActiveNow && <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full">نشط الآن</span>}
                    </div>
                    <div className="text-xs text-admin-muted truncate">
                      {s.startAt ? fmtDateTime(s.startAt) : 'فوري'} → {s.endAt ? fmtDateTime(s.endAt) : 'حتى إشعار آخر'} • {scopeLabel(s.platforms ?? [], s.minAppVersion, s.maxAppVersion)}
                      {s.note ? ` • ${s.note}` : ''}
                    </div>
                  </div>
                  {/* extend end date */}
                  <input
                    type="datetime-local"
                    title="تعديل/تمديد تاريخ النهاية"
                    value={toLocalInput(s.endAt)}
                    onChange={(e) =>
                      updateSchedule(
                        s.id,
                        { endAt: fromLocalInput(e.target.value) },
                        { action: 'schedule_toggle', to: s.iconKey, detail: 'تعديل تاريخ النهاية' }
                      )
                    }
                    className="bg-admin-surface border border-admin-border rounded-lg px-2 py-1.5 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateSchedule(
                        s.id,
                        { enabled: !s.enabled },
                        { action: 'schedule_toggle', to: s.iconKey, detail: s.enabled ? 'تعطيل' : 'تفعيل' }
                      )
                    }
                    title={s.enabled ? 'تعطيل' : 'تفعيل'}
                    className={`relative w-10 h-5 rounded-full flex-shrink-0 ${s.enabled ? 'bg-accent' : 'bg-admin-surface-light'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${s.enabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                  <button type="button" onClick={() => removeSchedule(s.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
        )}
      </div>

      {/* ─── Operating mode ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">الوضع التلقائي (عند عدم وجود تبديل مجدول)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              { value: 'auto', titleAr: 'تلقائي حسب الموسم', descAr: 'تتبدل الأيقونة تلقائياً حسب الموسم النشط' },
              { value: 'manual', titleAr: 'يدوي دائم', descAr: 'أيقونة واحدة ثابتة (manualIcon)' },
              { value: 'language_only', titleAr: 'حسب اللغة فقط', descAr: 'بدون أيقونات موسمية' },
            ] as { value: IconMode; titleAr: string; descAr: string }[]
          ).map((opt) => {
            const active = (config.mode ?? 'auto') === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConfig((p) => ({ ...p, mode: opt.value }))}
                className={`text-right p-4 rounded-xl border transition-all ${
                  active ? 'border-accent bg-accent/10' : 'border-admin-border bg-admin-bg hover:border-admin-muted'
                }`}
              >
                <div className={`font-semibold mb-1 ${active ? 'text-accent-light' : 'text-white'}`}>{opt.titleAr}</div>
                <div className="text-xs text-admin-muted">{opt.descAr}</div>
              </button>
            );
          })}
        </div>

        {config.mode === 'manual' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {usableIconKeys.map((key) => {
              const active = config.manualIcon === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, manualIcon: key }))}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${
                    active ? 'border-accent bg-accent/10 ring-2 ring-accent/30' : 'border-admin-border bg-admin-bg'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-admin-surface-light">
                    <img src={iconImg(key)} alt={iconName(key)} className="w-full h-full object-cover" />
                  </div>
                  <div className={`text-xs ${active ? 'text-accent-light' : 'text-white'}`}>{iconName(key)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 5) Seasonal rules ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-light" />
            <h2 className="text-lg font-bold text-white">قواعد المواسم</h2>
          </div>
          <Link
            to="/seasonal"
            className="text-xs text-accent-light flex items-center gap-1 hover:underline"
          >
            تعديل تواريخ المواسم في صفحة المواسم <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs text-admin-muted">
          هنا تتحكم في <b>ربط كل موسم بأيقونة</b> و<b>تفعيله</b>. تواريخ بداية/نهاية المواسم مصدرها الوحيد
          صفحة المواسم (نفس ما يستخدمه التطبيق) لتفادي أي تعارض. الموسم النشط حاليًا:{' '}
          <span className="text-accent-light">{activeSeasonInfo ? SEASON_NAMES_AR[activeSeasonInfo.season] : 'لا يوجد'}</span>.
        </p>

        <div className="space-y-2">
          {SEASON_LIST.map((season) => {
            const enabled = enabledSeasons.includes(season);
            const mapped = normalizeIconKey((config.seasonalMap ?? {})[season] ?? DEFAULT_SEASONAL_MAP[season]);
            const range = seasonRanges[season];
            const isActive = activeSeasonInfo?.season === season;
            const priority = SEASON_PRIORITY.indexOf(season) + 1;
            return (
              <div key={season} className={`flex items-center gap-3 p-3 rounded-xl border ${isActive ? 'border-accent/60 bg-accent/5' : 'border-admin-border bg-admin-bg'}`}>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      enabledSeasons: enabled
                        ? (p.enabledSeasons ?? []).filter((x) => x !== season)
                        : [...(p.enabledSeasons ?? []), season],
                    }))
                  }
                  title={enabled ? 'تعطيل الموسم' : 'تفعيل الموسم'}
                  className={`relative w-10 h-5 rounded-full flex-shrink-0 ${enabled ? 'bg-accent' : 'bg-admin-surface-light'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium flex items-center gap-2">
                    {SEASON_NAMES_AR[season]}
                    {isActive && <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full">نشط</span>}
                    <span className="text-[10px] text-admin-muted">أولوية #{priority}</span>
                  </div>
                  <div className="text-xs text-admin-muted">
                    {range
                      ? `هجري ${range.start.day}/${range.start.month} → ${range.end.day}/${range.end.month}`
                      : `افتراضي (هجري)`}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-admin-surface-light flex-shrink-0">
                  <img src={iconImg(mapped)} alt={iconName(mapped)} className="w-full h-full object-cover" />
                </div>
                <select
                  value={mapped}
                  onChange={(e) => setConfig((p) => ({ ...p, seasonalMap: { ...p.seasonalMap, [season]: e.target.value as SeasonalIconKey } }))}
                  disabled={!enabled}
                  className="bg-admin-surface border border-admin-border rounded-lg px-2 py-1.5 text-white text-sm disabled:opacity-50"
                >
                  {ALL_ICON_KEYS.map((k) => (
                    <option key={k} value={k}>{iconName(k)}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-admin-muted">احفظ التغييرات من الأسفل لتطبيق ربط المواسم والتفعيل.</p>
      </div>

      {/* ─── 4) Icons library ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">مكتبة الأيقونات</h2>
        </div>
        <p className="text-xs text-admin-muted">
          الصور الفعلية مُجمَّعة في نسخة التطبيق — الصورة هنا للمعاينة فقط. <b>استبدال الأيقونة الفعلية يتطلب نسخة متجر جديدة.</b>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_ICON_KEYS.map((key) => {
            const meta = config.iconLibrary?.[key] ?? buildDefaultLibrary()[key];
            const inUse = effective.iconKey === key;
            const isEnabled = meta.enabled !== false;
            return (
              <div key={key} className="flex items-start gap-3 p-3 rounded-xl border border-admin-border bg-admin-bg">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-admin-surface-light flex-shrink-0">
                  <img src={iconImg(key)} alt={iconName(key)} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-white text-sm font-semibold flex items-center gap-2">
                    {iconName(key)}
                    {inUse && <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full">مستخدمة الآن</span>}
                  </div>
                  <div className="text-[11px] text-admin-muted font-mono">{key} • {KIND_LABEL[meta.kind]}</div>
                  <div className="flex items-center gap-2 pt-1">
                    {(['android', 'ios'] as IconPlatform[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleIconPlatform(key, p)}
                        className={`px-2 py-0.5 rounded text-[11px] border flex items-center gap-1 ${
                          meta.platforms.includes(p) ? 'border-accent/40 bg-accent/10 text-accent-light' : 'border-admin-border text-admin-muted'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" /> {p === 'android' ? 'Android' : 'iOS'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => toggleIconEnabled(key)}
                    title={isEnabled ? 'تعطيل' : 'تفعيل'}
                    className={`relative w-10 h-5 rounded-full ${isEnabled ? 'bg-accent' : 'bg-admin-surface-light'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                  <label className="text-[11px] text-accent-light cursor-pointer flex items-center gap-1">
                    {uploadingKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    معاينة
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadPreview(key, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Alert configuration (existing, preserved) ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.alertEnabled ? <Bell className="w-5 h-5 text-accent-light" /> : <BellOff className="w-5 h-5 text-admin-muted" />}
            <h2 className="text-lg font-bold text-white">تفعيل التنبيه عند تغيير الأيقونة</h2>
          </div>
          <button
            type="button"
            onClick={() => setConfig((p) => ({ ...p, alertEnabled: !p.alertEnabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${config.alertEnabled ? 'bg-accent' : 'bg-admin-surface-light'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.alertEnabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        {config.alertEnabled && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-admin-muted" />
              <span className="text-xs text-admin-muted">حرّر النص لكل لغة:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const active = activeLang === l.code;
                const filled = !!(config.alertTitleI18n?.[l.code] && config.alertMessageI18n?.[l.code]);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setActiveLang(l.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      active ? 'bg-accent text-white' : filled ? 'bg-accent/15 text-accent-light hover:bg-accent/25' : 'bg-admin-bg text-admin-muted hover:text-white'
                    }`}
                  >
                    {l.nameAr} {filled && !active ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            {(() => {
              const lang = LANGUAGES.find((x) => x.code === activeLang)!;
              const dir = lang.rtl ? 'rtl' : 'ltr';
              return (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-admin-muted block mb-1.5">عنوان التنبيه ({lang.nameAr})</label>
                    <input
                      type="text"
                      value={config.alertTitleI18n?.[lang.code] ?? ''}
                      onChange={(e) => setConfig((p) => ({ ...p, alertTitleI18n: { ...p.alertTitleI18n, [lang.code]: e.target.value } }))}
                      dir={dir}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent outline-none w-full"
                      placeholder={`Title in ${lang.nameEn}`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-admin-muted block mb-1.5">نص التنبيه ({lang.nameAr})</label>
                    <textarea
                      value={config.alertMessageI18n?.[lang.code] ?? ''}
                      onChange={(e) => setConfig((p) => ({ ...p, alertMessageI18n: { ...p.alertMessageI18n, [lang.code]: e.target.value } }))}
                      dir={dir}
                      rows={2}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent outline-none w-full resize-none"
                      placeholder={`Message in ${lang.nameEn}`}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="border-t border-admin-border pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent-light" />
                <div>
                  <h3 className="text-sm font-semibold text-white">رسائل التنبيه الموسمية</h3>
                  <p className="text-xs text-admin-muted mt-0.5">تظهر بدل النص العام عندما تكون أيقونة الموسم هي الفعلية.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SEASON_LIST.map((season) => {
                  const active = activeSeasonAlert === season;
                  const filled = !!(config.seasonalAlertTitleI18n?.[season]?.[activeLang] && config.seasonalAlertMessageI18n?.[season]?.[activeLang]);
                  return (
                    <button
                      key={season}
                      type="button"
                      onClick={() => setActiveSeasonAlert(season)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                        active ? 'bg-accent text-white' : filled ? 'bg-accent/15 text-accent-light hover:bg-accent/25' : 'bg-admin-bg text-admin-muted hover:text-white'
                      }`}
                    >
                      {SEASON_NAMES_AR[season]} {filled && !active ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
              {(() => {
                const lang = LANGUAGES.find((x) => x.code === activeLang)!;
                const dir = lang.rtl ? 'rtl' : 'ltr';
                const seasonalTitle = config.seasonalAlertTitleI18n?.[activeSeasonAlert]?.[lang.code] ?? '';
                const seasonalMessage = config.seasonalAlertMessageI18n?.[activeSeasonAlert]?.[lang.code] ?? '';
                return (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={seasonalTitle}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          seasonalAlertTitleI18n: {
                            ...p.seasonalAlertTitleI18n,
                            [activeSeasonAlert]: { ...(p.seasonalAlertTitleI18n?.[activeSeasonAlert] ?? {}), [lang.code]: e.target.value },
                          },
                        }))
                      }
                      dir={dir}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm w-full"
                      placeholder={`عنوان تنبيه ${SEASON_NAMES_AR[activeSeasonAlert]}`}
                    />
                    <textarea
                      value={seasonalMessage}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          seasonalAlertMessageI18n: {
                            ...p.seasonalAlertMessageI18n,
                            [activeSeasonAlert]: { ...(p.seasonalAlertMessageI18n?.[activeSeasonAlert] ?? {}), [lang.code]: e.target.value },
                          },
                        }))
                      }
                      dir={dir}
                      rows={3}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm w-full resize-none"
                      placeholder={`نص تنبيه ${SEASON_NAMES_AR[activeSeasonAlert]}`}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ─── 7) Propagation status ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">حالة النشر والوصول</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
            <div className="text-xs text-admin-muted">رقم الإصدار (الإشعار)</div>
            <div className="text-white font-semibold">{config.version}</div>
          </div>
          <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
            <div className="text-xs text-admin-muted">رقم التعديل</div>
            <div className="text-white font-semibold">#{config.configRevision ?? 0}</div>
          </div>
          <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
            <div className="text-xs text-admin-muted">آخر نشر بإشعار</div>
            <div className="text-white">{fmtDateTime(config.lastPublishedAt)}</div>
          </div>
          <div className="bg-admin-bg rounded-lg p-3 border border-admin-border">
            <div className="text-xs text-admin-muted">آخر تعديل</div>
            <div className="text-white">{fmtDateTime(config.updatedAt)}</div>
          </div>
        </div>
        <div className="text-xs text-admin-muted leading-relaxed bg-admin-bg rounded-lg p-4 border border-admin-border space-y-1">
          <p>• التغيير ليس فوريًا: يصل عند <b>فتح المستخدم للتطبيق</b> أو خلال المهمة الخلفية (~كل ٦ ساعات).</p>
          <p>• «حفظ» يحدّث الإعدادات بصمت. «حفظ وإرسال إشعار» يزيد رقم الإصدار فيظهر تنبيه مرة واحدة لكل مستخدم.</p>
          <p>• طبقات التخزين المؤقت: حالة الأيقونة محليًا (<span className="font-mono">@app_icon_variant</span>)، كاش الإعدادات داخل التطبيق، ثم Firestore. لا يوجد قياس فعلي لعدد المستلمين.</p>
          <p>• على بعض أجهزة أندرويد (MIUI/EMUI/One UI) قد لا تتحدث الأيقونة إلا بعد إغلاق التطبيق وإعادة فتحه.</p>
        </div>
      </div>

      {/* ─── 8) Audit log ─── */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">سجل التعديلات</h2>
        </div>
        {auditRecords.length === 0 ? (
          <div className="text-sm text-admin-muted bg-admin-bg rounded-lg p-4 border border-admin-border">لا توجد تعديلات مسجّلة بعد.</div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {auditRecords.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-admin-bg border border-admin-border text-xs">
                <span className="text-admin-muted whitespace-nowrap">{r.at ? r.at.toLocaleString('ar-EG') : '—'}</span>
                <span className="text-accent-light font-mono">{r.action}</span>
                <span className="text-white flex-1 min-w-0 truncate">
                  {r.from && r.to ? `${r.from} → ${r.to}` : r.to || r.from || ''} {r.detail ? `• ${r.detail}` : ''}
                </span>
                {r.announce && <span className="bg-accent/20 text-accent-light px-2 py-0.5 rounded-full">إشعار</span>}
                <span className="text-admin-muted">{r.by}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="flex flex-wrap items-center gap-4 sticky bottom-0 bg-admin-bg/80 backdrop-blur py-3 -mx-1 px-1 rounded-xl">
        <button
          onClick={() => handleSaveSettings(false)}
          disabled={saving}
          className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {savingAction === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {savingAction === 'save' ? 'جاري الحفظ...' : 'حفظ (بدون إشعار)'}
        </button>
        <button
          onClick={() => handleSaveSettings(true)}
          disabled={saving || !config.alertEnabled}
          title={config.alertEnabled ? 'حفظ + إظهار تنبيه التحديث لكل المستخدمين مرة واحدة' : 'فعّل «التنبيه» أولاً'}
          className="bg-admin-surface-light hover:bg-admin-surface-light/70 border border-admin-border text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingAction === 'announce' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          {savingAction === 'announce' ? 'جاري الإرسال...' : 'حفظ وإرسال إشعار'}
        </button>
        {saveMessage && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${saveMessage.type === 'success' ? 'bg-accent/20 text-accent-light' : 'bg-red-500/20 text-red-400'}`}>
            {saveMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function TimelineRow({
  badge,
  badgeClass,
  img,
  title,
  subtitle,
  range,
}: {
  badge: string;
  badgeClass: string;
  img: string;
  title: string;
  subtitle: string;
  range: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-admin-border bg-admin-bg">
      <span className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${badgeClass}`}>{badge}</span>
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-admin-surface-light flex-shrink-0">
        <img src={img} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-admin-muted truncate">{subtitle}</div>
      </div>
      <div className="text-xs text-admin-muted whitespace-nowrap">{range}</div>
    </div>
  );
}
