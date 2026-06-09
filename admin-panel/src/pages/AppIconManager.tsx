// admin-panel/src/pages/AppIconManager.tsx
// إدارة أيقونات التطبيق — مواسم + 12 لغة + تنبيه

import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Save,
  Bell,
  BellOff,
  Loader2,
  Info,
  CheckCircle,
  AlertCircle,
  Calendar,
  Languages,
  Sparkles,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { bumpContentVersion } from '../utils/content-version';
import { getArabicSeasonalBannerCopy } from '@app-lib/seasonal-banner-copy';
import defaultArIcon from '../../../assets/images/icons/icon.png';
import defaultEnIcon from '../../../assets/images/icons/icon_en.png';
import ramadanIcon from '../../../assets/images/icons/seasonal/ramadan.png';
import hajjIcon from '../../../assets/images/icons/seasonal/hajj.png';
import mawlidIcon from '../../../assets/images/icons/seasonal/mawlid.png';
import eidFitrIcon from '../../../assets/images/icons/seasonal/eid_fitr.png';
import eidAdhaIcon from '../../../assets/images/icons/seasonal/eid_adha.png';
import hijriNewYearIcon from '../../../assets/images/icons/seasonal/hijri_new_year.png';

// ─── Types ───────────────────────────────────────────────

type IconMode = 'auto' | 'manual' | 'language_only';

type SeasonalIconKey =
  | 'default_ar'
  | 'default_en'
  | 'ramadan'
  | 'hajj'
  | 'mawlid'
  | 'eid_fitr'
  | 'eid_adha'
  | 'hijri_new_year';

type SeasonName =
  | 'ramadan'
  | 'hajj'
  | 'mawlid'
  | 'eid_fitr'
  | 'eid_adha'
  | 'dhul_hijjah'
  | 'hijri_new_year'
  | 'ashura'
  | 'muharram'
  | 'rajab'
  | 'shaban';

type LangCode = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

type LocalizedText = Partial<Record<LangCode, string>>;
type SeasonalLocalizedText = Partial<Record<SeasonName, LocalizedText>>;

interface AppIconsConfig {
  version: number;
  alertEnabled: boolean;
  // Legacy AR/EN fields for backward compat with the running app.
  alertTitle: string;
  alertMessage: string;
  alertTitleEn: string;
  alertMessageEn: string;
  // Multilingual maps (preferred).
  alertTitleI18n: LocalizedText;
  alertMessageI18n: LocalizedText;
  // Seasonal alert messages shown when the active icon is seasonal.
  seasonalAlertTitleI18n: SeasonalLocalizedText;
  seasonalAlertMessageI18n: SeasonalLocalizedText;
  // Seasonal switching.
  mode: IconMode;
  manualIcon: SeasonalIconKey | null;
  seasonalMap: Partial<Record<SeasonName, SeasonalIconKey>>;
  enabledSeasons: SeasonName[];
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────

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

const seasonTitleAr = (season: SeasonName, fallback: string) =>
  getArabicSeasonalBannerCopy(season)?.title || fallback;
const seasonSubtitleAr = (season: SeasonName, fallback: string) =>
  getArabicSeasonalBannerCopy(season)?.subtitle || fallback;

const ICONS: { key: SeasonalIconKey; nameAr: string; nameEn: string; color: string; image: string }[] = [
  { key: 'default_ar', nameAr: 'الافتراضية (عربي)', nameEn: 'Default (AR)', color: '#0d8e62', image: defaultArIcon },
  { key: 'default_en', nameAr: 'الافتراضية (إنجليزي)', nameEn: 'Default (EN)', color: '#0d8e62', image: defaultEnIcon },
  { key: 'ramadan', nameAr: 'رمضان', nameEn: 'Ramadan', color: '#0f987f', image: ramadanIcon },
  { key: 'hajj', nameAr: 'الحج', nameEn: 'Hajj', color: '#8B4513', image: hajjIcon },
  { key: 'mawlid', nameAr: 'المولد النبوي', nameEn: 'Mawlid', color: '#2E8B57', image: mawlidIcon },
  { key: 'eid_fitr', nameAr: 'عيد الفطر', nameEn: 'Eid Fitr', color: '#FFD700', image: eidFitrIcon },
  { key: 'eid_adha', nameAr: 'عيد الأضحى', nameEn: 'Eid Adha', color: '#CD853F', image: eidAdhaIcon },
  { key: 'hijri_new_year', nameAr: 'رأس السنة الهجرية', nameEn: 'Hijri New Year', color: '#607D8B', image: hijriNewYearIcon },
];

const SEASONS: { key: SeasonName; nameAr: string; nameEn: string }[] = [
  { key: 'ramadan', nameAr: 'رمضان', nameEn: 'Ramadan' },
  { key: 'hajj', nameAr: 'موسم الحج', nameEn: 'Hajj season' },
  { key: 'mawlid', nameAr: 'المولد النبوي', nameEn: 'Mawlid' },
  { key: 'eid_fitr', nameAr: 'عيد الفطر', nameEn: 'Eid Fitr' },
  { key: 'eid_adha', nameAr: 'عيد الأضحى', nameEn: 'Eid Adha' },
  { key: 'dhul_hijjah', nameAr: 'العشر الأوائل من ذي الحجة', nameEn: 'Dhul Hijjah' },
  { key: 'hijri_new_year', nameAr: 'رأس السنة الهجرية', nameEn: 'Hijri New Year' },
  { key: 'ashura', nameAr: 'عاشوراء', nameEn: 'Ashura' },
  { key: 'muharram', nameAr: 'محرم', nameEn: 'Muharram' },
  { key: 'rajab', nameAr: 'رجب', nameEn: 'Rajab' },
  { key: 'shaban', nameAr: 'شعبان', nameEn: 'Shaban' },
];

const DEFAULT_SEASONAL_MAP: Record<SeasonName, SeasonalIconKey> = {
  ramadan: 'ramadan',
  hajj: 'hajj',
  mawlid: 'mawlid',
  eid_fitr: 'eid_fitr',
  eid_adha: 'eid_adha',
  // Days 1–9 of Dhul-Hijjah show the single Hajj icon (the `dhul_hijjah` season
  // wins priority over `hajj` for those days, so both map to `hajj`). Day 10
  // flips to `eid_adha` (sheep) automatically. Keep this in lockstep with
  // DEFAULT_SEASONAL_MAP in lib/app-icon-manager.ts.
  dhul_hijjah: 'hajj',
  hijri_new_year: 'hijri_new_year',
  ashura: 'default_ar',
  muharram: 'default_ar',
  rajab: 'default_ar',
  shaban: 'default_ar',
};

// Retired icon keys → replacement. Keep in lockstep with LEGACY_ICON_ALIASES in
// lib/app-icon-manager.ts so the panel and the app resolve old data identically.
const LEGACY_ICON_ALIASES: Record<string, SeasonalIconKey> = {
  dhul_hijjah: 'hajj',
};

const normalizeIconKey = (key: SeasonalIconKey): SeasonalIconKey =>
  (LEGACY_ICON_ALIASES[key] ?? key) as SeasonalIconKey;

const DEFAULT_SEASONAL_ALERT_TITLES: SeasonalLocalizedText = {
  ramadan: {
    ar: seasonTitleAr('ramadan', 'رمضان المبارك'),
    en: 'Ramadan Mubarak',
  },
  hajj: {
    ar: seasonTitleAr('hajj', 'موسم الحج'),
    en: 'Blessed Hajj Season',
  },
  dhul_hijjah: {
    ar: seasonTitleAr('dhul_hijjah', 'العشر الأوائل من ذي الحجة'),
    en: 'Blessed Days',
  },
  eid_fitr: {
    ar: seasonTitleAr('eid_fitr', 'عيد الفطر المبارك'),
    en: 'Eid al-Fitr Mubarak',
  },
  eid_adha: {
    ar: seasonTitleAr('eid_adha', 'عيد الأضحى المبارك'),
    en: 'Eid al-Adha Mubarak',
  },
  mawlid: {
    ar: seasonTitleAr('mawlid', 'ذكرى المولد النبوي'),
    en: 'Mawlid Reminder',
  },
  hijri_new_year: {
    ar: seasonTitleAr('hijri_new_year', 'رأس السنة الهجرية'),
    en: 'Hijri New Year',
  },
  ashura: {
    ar: seasonTitleAr('ashura', 'عاشوراء'),
    en: 'Day of Ashura',
  },
  muharram: {
    ar: seasonTitleAr('muharram', 'شهر محرم'),
    en: 'Blessed Hijri Year',
  },
  rajab: {
    ar: seasonTitleAr('rajab', 'شهر رجب'),
    en: 'Rajab',
  },
  shaban: {
    ar: seasonTitleAr('shaban', 'شهر شعبان'),
    en: 'Blessed Shaban',
  },
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

const DEFAULT_CONFIG: AppIconsConfig = {
  version: 0,
  alertEnabled: true,
  alertTitle: 'تم تحديث أيقونة التطبيق',
  alertMessage: 'تم تحديث أيقونة التطبيق بنجاح! استمتع بالتصميم الجديد',
  alertTitleEn: 'App Icon Updated',
  alertMessageEn: 'The app icon has been updated! Enjoy the new design',
  alertTitleI18n: {
    ar: 'تم تحديث أيقونة التطبيق',
    en: 'App Icon Updated',
  },
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
  updatedAt: '',
};

const FIRESTORE_DOC = 'appConfig/appIcons';

// Keep identical to SEASON_PRIORITY in lib/app-icon-manager.ts / lib/seasonal-content.ts.
const SEASON_PRIORITY: SeasonName[] = [
  'eid_fitr',
  'eid_adha',
  'mawlid',
  'ashura',
  'ramadan',
  'dhul_hijjah',
  'hajj',
  'hijri_new_year',
  'muharram',
  'rajab',
  'shaban',
];

const SEASON_RANGES: Record<SeasonName, { start: { month: number; day: number }; end: { month: number; day: number } }> = {
  ramadan: { start: { month: 9, day: 1 }, end: { month: 9, day: 30 } },
  hajj: { start: { month: 12, day: 8 }, end: { month: 12, day: 13 } },
  mawlid: { start: { month: 3, day: 12 }, end: { month: 3, day: 12 } },
  eid_fitr: { start: { month: 10, day: 1 }, end: { month: 10, day: 3 } },
  eid_adha: { start: { month: 12, day: 10 }, end: { month: 12, day: 13 } },
  dhul_hijjah: { start: { month: 12, day: 1 }, end: { month: 12, day: 9 } },
  hijri_new_year: { start: { month: 1, day: 1 }, end: { month: 1, day: 3 } },
  ashura: { start: { month: 1, day: 9 }, end: { month: 1, day: 10 } },
  muharram: { start: { month: 1, day: 1 }, end: { month: 1, day: 30 } },
  rajab: { start: { month: 7, day: 1 }, end: { month: 7, day: 30 } },
  shaban: { start: { month: 8, day: 1 }, end: { month: 8, day: 30 } },
};

const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذي الحجة',
];

function isHijriLeapYear(year: number): boolean {
  return ((11 * year + 14) % 30) < 11;
}

function getHijriMonthDays(year: number, month: number): number {
  if (month % 2 === 1) return 30;
  if (month === 12) return isHijriLeapYear(year) ? 30 : 29;
  return 29;
}

function getHijriDateForPreview(date: Date = new Date()) {
  const g = date.getFullYear();
  const m = date.getMonth() + 1;
  const gd = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y = g + 4800 - a;
  const mo = m + 12 * a - 3;
  const julianDay =
    gd +
    Math.floor((153 * mo + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const l = julianDay - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  let year = 30 * n + j - 30;
  let month = Math.floor((24 * (l3 - 1)) / 709);
  let day = l3 - Math.floor((709 * month) / 24);
  const maxDays = getHijriMonthDays(year, month);
  if (day > maxDays) {
    day -= maxDays;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { year, month, day, label: `${day} ${HIJRI_MONTHS_AR[month - 1]} ${year}` };
}

function isDateInRange(
  current: { month: number; day: number },
  start: { month: number; day: number },
  end: { month: number; day: number }
) {
  const currentValue = (current.month - 1) * 30 + current.day;
  const startValue = (start.month - 1) * 30 + start.day;
  const endValue = (end.month - 1) * 30 + end.day;
  return currentValue >= startValue && currentValue <= endValue;
}

function getCurrentSeasonForPreview(date: Date = new Date()): { season: SeasonName | null; hijriLabel: string } {
  const hijri = getHijriDateForPreview(date);
  const active = SEASON_PRIORITY.find((season) => {
    const range = SEASON_RANGES[season];
    return isDateInRange({ month: hijri.month, day: hijri.day }, range.start, range.end);
  });

  return { season: active ?? null, hijriLabel: hijri.label };
}

// ─── Component ───────────────────────────────────────────

export default function AppIconManager() {
  const [config, setConfig] = useState<AppIconsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<null | 'save' | 'announce'>(null);
  const saving = savingAction !== null;
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>('ar');
  const [activeSeasonAlert, setActiveSeasonAlert] = useState<SeasonName>('ramadan');

  // ─── Load ────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, FIRESTORE_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<AppIconsConfig>;
          // Normalize retired icon keys (e.g. legacy `dhul_hijjah` icon → `hajj`)
          // coming from older saved configs so the dropdowns/preview stay valid.
          const mergedMap = { ...DEFAULT_SEASONAL_MAP, ...(data.seasonalMap ?? {}) };
          const seasonalMap = Object.fromEntries(
            Object.entries(mergedMap).map(([s, ic]) => [s, normalizeIconKey(ic as SeasonalIconKey)])
          ) as Record<SeasonName, SeasonalIconKey>;
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            manualIcon: data.manualIcon ? normalizeIconKey(data.manualIcon) : data.manualIcon ?? null,
            seasonalMap,
            alertTitleI18n: { ...DEFAULT_CONFIG.alertTitleI18n, ...(data.alertTitleI18n ?? {}) },
            alertMessageI18n: { ...DEFAULT_CONFIG.alertMessageI18n, ...(data.alertMessageI18n ?? {}) },
            seasonalAlertTitleI18n: {
              ...DEFAULT_SEASONAL_ALERT_TITLES,
              ...(data.seasonalAlertTitleI18n ?? {}),
            },
            seasonalAlertMessageI18n: {
              ...DEFAULT_SEASONAL_ALERT_MESSAGES,
              ...(data.seasonalAlertMessageI18n ?? {}),
            },
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

    return unsubscribe;
  }, []);

  // ─── Save ────────────────────────────────────────────

  // `announce: false` (الحفظ العادي) — persists the settings WITHOUT bumping the
  // version, so existing users are NOT re-prompted. `announce: true` (حفظ وإرسال
  // إشعار) bumps the version, which makes the app show the icon-update alert once
  // to every user on next open. Only announce when you genuinely want to notify.
  const handleSave = async (announce: boolean) => {
    setSavingAction(announce ? 'announce' : 'save');
    setSaveMessage(null);
    try {
      const updated: AppIconsConfig = {
        ...config,
        // keep legacy fields in sync with the i18n maps so older app versions still work
        alertTitle: config.alertTitleI18n.ar || config.alertTitle,
        alertMessage: config.alertMessageI18n.ar || config.alertMessage,
        alertTitleEn: config.alertTitleI18n.en || config.alertTitleEn,
        alertMessageEn: config.alertMessageI18n.en || config.alertMessageEn,
        version: announce ? (config.version || 0) + 1 : config.version || 0,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, FIRESTORE_DOC), updated);
      await bumpContentVersion('appIcons');
      setConfig(updated);
      setSaveMessage({
        type: 'success',
        text: announce ? 'تم الحفظ وإرسال الإشعار للمستخدمين' : 'تم الحفظ بدون إشعار',
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving app icons config:', err);
      setSaveMessage({ type: 'error', text: `حدث خطأ: ${(err as Error).message}` });
    } finally {
      setSavingAction(null);
    }
  };

  // ─── Helpers ─────────────────────────────────────────

  const iconByKey = useMemo(() => {
    const m: Record<string, (typeof ICONS)[number]> = {};
    for (const i of ICONS) m[i.key] = i;
    return m;
  }, []);

  const currentSeason = useMemo(() => getCurrentSeasonForPreview(), []);

  const resolvePreviewIcon = (language: LangCode, season: SeasonName | null): SeasonalIconKey => {
    const languageDefault: SeasonalIconKey = language === 'ar' ? 'default_ar' : 'default_en';

    if (config.mode === 'language_only') return languageDefault;
    if (config.mode === 'manual' && config.manualIcon) return config.manualIcon;

    if (config.mode === 'auto' && season && config.enabledSeasons.includes(season)) {
      const mapped = config.seasonalMap[season] ?? DEFAULT_SEASONAL_MAP[season];
      if (mapped !== 'default_ar' && mapped !== 'default_en') return mapped;
    }

    return languageDefault;
  };

  const previewArIcon = resolvePreviewIcon('ar', currentSeason.season);
  const previewOtherIcon = resolvePreviewIcon('en', currentSeason.season);
  const currentSeasonLabel = currentSeason.season
    ? SEASONS.find((s) => s.key === currentSeason.season)?.nameAr ?? currentSeason.season
    : 'لا يوجد موسم نشط';

  // ─── Loading state ───────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent/20 rounded-xl">
            <ImageIcon className="w-6 h-6 text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة أيقونات التطبيق</h1>
            <p className="text-sm text-admin-muted mt-0.5">
              تبديل أيقونة التطبيق حسب الموسم تلقائياً أو يدوياً — بدون تحديث المتجر
            </p>
          </div>
        </div>
        <span className="bg-accent/20 text-accent-light px-3 py-1 rounded-full text-sm">
          الإصدار: {config.version}
        </span>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300 leading-relaxed space-y-1">
          <p>
            الأيقونات الموسمية مُجمَّعة مسبقاً داخل التطبيق. زر «حفظ (بدون إشعار)» يحفظ الإعدادات
            دون إزعاج المستخدمين الحاليين. زر «حفظ وإرسال إشعار» يزيد رقم الإصدار فيظهر تنبيه
            التحديث مرة واحدة لكل مستخدم عند فتح التطبيق (يتطلب تفعيل «التنبيه»).
          </p>
          <p className="text-xs opacity-80">
            ⚠️ إضافة أيقونة جديدة كلياً يتطلب رفع نسخة جديدة على المتجر. هنا تتحكم فقط في التبديل
            بين الأيقونات الموجودة بالفعل.
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">وضع التشغيل</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              { value: 'auto', titleAr: 'تلقائي حسب الموسم', descAr: 'تتبدل الأيقونة تلقائياً عند بداية كل موسم' },
              { value: 'manual', titleAr: 'يدوي', descAr: 'اختر الأيقونة بنفسك' },
              { value: 'language_only', titleAr: 'حسب اللغة فقط', descAr: 'بدون أيقونات موسمية' },
            ] as { value: IconMode; titleAr: string; descAr: string }[]
          ).map((opt) => {
            const active = config.mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConfig((p) => ({ ...p, mode: opt.value }))}
                className={`text-right p-4 rounded-xl border transition-all ${
                  active
                    ? 'border-accent bg-accent/10'
                    : 'border-admin-border bg-admin-bg hover:border-admin-muted'
                }`}
              >
                <div className={`font-semibold mb-1 ${active ? 'text-accent-light' : 'text-white'}`}>
                  {opt.titleAr}
                </div>
                <div className="text-xs text-admin-muted">{opt.descAr}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual mode: icon picker */}
      {config.mode === 'manual' && (
        <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-accent-light" />
            <h2 className="text-lg font-bold text-white">اختر أيقونة</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ICONS.map((ic) => {
              const active = config.manualIcon === ic.key;
              return (
                <button
                  key={ic.key}
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, manualIcon: ic.key }))}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                    active
                      ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                      : 'border-admin-border bg-admin-bg hover:border-admin-muted'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg bg-admin-surface-light">
                    <img
                      src={ic.image}
                      alt={ic.nameAr}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className={`text-sm font-medium text-center ${active ? 'text-accent-light' : 'text-white'}`}>
                    {ic.nameAr}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto mode: seasonal map */}
      {config.mode === 'auto' && (
        <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-light" />
            <h2 className="text-lg font-bold text-white">ربط المواسم بالأيقونات</h2>
          </div>

          <div className="space-y-2">
            {SEASONS.map((s) => {
              const enabled = config.enabledSeasons.includes(s.key);
              const mapped = config.seasonalMap[s.key] ?? DEFAULT_SEASONAL_MAP[s.key];
              const seasonalMsgPreview = config.seasonalAlertMessageI18n[s.key]?.ar ?? '';
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-3 p-3 bg-admin-bg rounded-xl border border-admin-border"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setConfig((p) => ({
                        ...p,
                        enabledSeasons: enabled
                          ? p.enabledSeasons.filter((x) => x !== s.key)
                          : [...p.enabledSeasons, s.key],
                      }));
                    }}
                    title={enabled ? 'تعطيل هذا الموسم' : 'تفعيل هذا الموسم'}
                    aria-label={enabled ? 'تعطيل هذا الموسم' : 'تفعيل هذا الموسم'}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      enabled ? 'bg-accent' : 'bg-admin-surface-light'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                        enabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{s.nameAr}</div>
                    <div className="text-xs text-admin-muted truncate mt-0.5">
                      {seasonalMsgPreview || 'لا توجد رسالة موسمية مخصصة'}
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-admin-surface-light border border-admin-border flex-shrink-0">
                    {iconByKey[mapped]?.image && (
                      <img
                        src={iconByKey[mapped].image}
                        alt={iconByKey[mapped].nameAr}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <select
                    value={mapped}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        seasonalMap: { ...p.seasonalMap, [s.key]: e.target.value as SeasonalIconKey },
                      }))
                    }
                    disabled={!enabled}
                    aria-label={`أيقونة موسم ${s.nameAr}`}
                    className="bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                  >
                    {ICONS.map((ic) => (
                      <option key={ic.key} value={ic.key}>
                        {ic.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alert configuration */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.alertEnabled ? (
              <Bell className="w-5 h-5 text-accent-light" />
            ) : (
              <BellOff className="w-5 h-5 text-admin-muted" />
            )}
            <h2 className="text-lg font-bold text-white">تفعيل التنبيه عند تغيير الأيقونة</h2>
          </div>
          <button
            type="button"
            onClick={() => setConfig((p) => ({ ...p, alertEnabled: !p.alertEnabled }))}
            title={config.alertEnabled ? 'تعطيل التنبيه' : 'تفعيل التنبيه'}
            aria-label={config.alertEnabled ? 'تعطيل التنبيه' : 'تفعيل التنبيه'}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.alertEnabled ? 'bg-accent' : 'bg-admin-surface-light'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                config.alertEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {config.alertEnabled && (
          <div className="space-y-4 pt-2">
            {/* Language tabs */}
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-admin-muted" />
              <span className="text-xs text-admin-muted">حرّر النص لكل لغة:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const active = activeLang === l.code;
                const filled = !!(config.alertTitleI18n[l.code] && config.alertMessageI18n[l.code]);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setActiveLang(l.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      active
                        ? 'bg-accent text-white'
                        : filled
                        ? 'bg-accent/15 text-accent-light hover:bg-accent/25'
                        : 'bg-admin-bg text-admin-muted hover:text-white'
                    }`}
                  >
                    {l.nameAr} {filled && !active ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            {/* Active language inputs */}
            {(() => {
              const lang = LANGUAGES.find((x) => x.code === activeLang)!;
              const titleVal = config.alertTitleI18n[lang.code] ?? '';
              const msgVal = config.alertMessageI18n[lang.code] ?? '';
              const dir = lang.rtl ? 'rtl' : 'ltr';
              return (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-admin-muted block mb-1.5">
                      عنوان التنبيه ({lang.nameAr})
                    </label>
                    <input
                      type="text"
                      value={titleVal}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          alertTitleI18n: { ...p.alertTitleI18n, [lang.code]: e.target.value },
                        }))
                      }
                      dir={dir}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full"
                      placeholder={`Title in ${lang.nameEn}`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-admin-muted block mb-1.5">
                      نص التنبيه ({lang.nameAr})
                    </label>
                    <textarea
                      value={msgVal}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          alertMessageI18n: { ...p.alertMessageI18n, [lang.code]: e.target.value },
                        }))
                      }
                      dir={dir}
                      rows={2}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full resize-none"
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
                  <p className="text-xs text-admin-muted mt-0.5">
                    تظهر هذه الرسالة بدل النص العام عندما تكون أيقونة الموسم هي الأيقونة الفعلية للمستخدم.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {SEASONS.map((season) => {
                  const active = activeSeasonAlert === season.key;
                  const filled = !!(
                    config.seasonalAlertTitleI18n[season.key]?.[activeLang] &&
                    config.seasonalAlertMessageI18n[season.key]?.[activeLang]
                  );
                  return (
                    <button
                      key={season.key}
                      type="button"
                      onClick={() => setActiveSeasonAlert(season.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                        active
                          ? 'bg-accent text-white'
                          : filled
                          ? 'bg-accent/15 text-accent-light hover:bg-accent/25'
                          : 'bg-admin-bg text-admin-muted hover:text-white'
                      }`}
                    >
                      {season.nameAr} {filled && !active ? '✓' : ''}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const lang = LANGUAGES.find((x) => x.code === activeLang)!;
                const season = SEASONS.find((x) => x.key === activeSeasonAlert)!;
                const dir = lang.rtl ? 'rtl' : 'ltr';
                const seasonalTitle = config.seasonalAlertTitleI18n[season.key]?.[lang.code] ?? '';
                const seasonalMessage = config.seasonalAlertMessageI18n[season.key]?.[lang.code] ?? '';
                const mapped = config.seasonalMap[season.key] ?? DEFAULT_SEASONAL_MAP[season.key];
                const icon = iconByKey[mapped];

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-admin-muted block mb-1.5">
                          عنوان تنبيه {season.nameAr} ({lang.nameAr})
                        </label>
                        <input
                          type="text"
                          value={seasonalTitle}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              seasonalAlertTitleI18n: {
                                ...p.seasonalAlertTitleI18n,
                                [season.key]: {
                                  ...(p.seasonalAlertTitleI18n[season.key] ?? {}),
                                  [lang.code]: e.target.value,
                                },
                              },
                            }))
                          }
                          dir={dir}
                          className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full"
                          placeholder={`Season title in ${lang.nameEn}`}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-admin-muted block mb-1.5">
                          نص تنبيه {season.nameAr} ({lang.nameAr})
                        </label>
                        <textarea
                          value={seasonalMessage}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              seasonalAlertMessageI18n: {
                                ...p.seasonalAlertMessageI18n,
                                [season.key]: {
                                  ...(p.seasonalAlertMessageI18n[season.key] ?? {}),
                                  [lang.code]: e.target.value,
                                },
                              },
                            }))
                          }
                          dir={dir}
                          rows={3}
                          className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full resize-none"
                          placeholder={`Season message in ${lang.nameEn}`}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-admin-bg border border-admin-border p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-admin-surface-light border border-admin-border flex-shrink-0">
                          {icon?.image && (
                            <img src={icon.image} alt={icon.nameAr} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-admin-muted">معاينة التنبيه</div>
                          <div className="text-sm font-semibold text-white truncate">{season.nameAr}</div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-admin-surface border border-admin-border p-3" dir={dir}>
                        <div className="text-sm font-semibold text-white">
                          {seasonalTitle || config.alertTitleI18n[lang.code] || 'عنوان التنبيه'}
                        </div>
                        <div className="text-xs text-admin-muted leading-relaxed mt-2">
                          {seasonalMessage || config.alertMessageI18n[lang.code] || 'نص التنبيه'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">الأيقونة الفعلية التي ستظهر للمستخدم</h3>
            <p className="text-sm text-admin-muted">
              المعاينة محسوبة بنفس منطق التطبيق: الوضع المختار + الموسم الحالي + لغة المستخدم.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-admin-bg text-admin-muted border border-admin-border">
              التاريخ الهجري: {currentSeason.hijriLabel}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-accent/10 text-accent-light border border-accent/25">
              الموسم الحالي: {currentSeasonLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'مستخدم اللغة العربية',
              desc: 'يستخدم الأيقونة العربية الافتراضية عند عدم وجود موسم أو عند اختيار حسب اللغة فقط.',
              iconKey: previewArIcon,
            },
            {
              title: 'مستخدم الإنجليزية وباقي اللغات',
              desc: 'كل لغة غير العربية تستخدم أيقونة الإنجليزي كافتراضي، والموسم يغلّبها إذا كان مفعلاً.',
              iconKey: previewOtherIcon,
            },
          ].map((item) => {
            const icon = iconByKey[item.iconKey];
            return (
              <div
                key={item.title}
                className="flex items-center gap-4 rounded-2xl bg-admin-bg border border-admin-border p-4"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl flex-shrink-0 bg-admin-surface-light border border-admin-border">
                  {icon?.image && (
                    <img
                      src={icon.image}
                      alt={icon.nameAr}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-white font-semibold">{item.title}</div>
                  <div className="text-accent-light text-sm font-medium mt-1">
                    {icon?.nameAr ?? 'غير محدد'}
                  </div>
                  <div className="text-xs text-admin-muted mt-1 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 px-4 py-3 text-sm text-blue-200 leading-relaxed">
          {config.mode === 'auto' && 'في الوضع التلقائي: لو يوجد موسم مفعّل حالياً يتم استخدام أيقونة الموسم، ولو لا يوجد موسم يتم الرجوع لأيقونة اللغة.'}
          {config.mode === 'manual' && 'في الوضع اليدوي: كل المستخدمين يحصلون على نفس الأيقونة التي اخترتها، بغض النظر عن اللغة أو الموسم.'}
          {config.mode === 'language_only' && 'في وضع حسب اللغة فقط: العربي يحصل على الأيقونة العربية، وأي لغة أخرى تحصل على أيقونة الإنجليزي.'}
          </div>
      </div>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {savingAction === 'save' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savingAction === 'save' ? 'جاري الحفظ...' : 'حفظ (بدون إشعار)'}
        </button>

        <button
          onClick={() => handleSave(true)}
          disabled={saving || !config.alertEnabled}
          title={
            config.alertEnabled
              ? 'حفظ وزيادة رقم الإصدار لعرض تنبيه التحديث لكل المستخدمين مرة واحدة'
              : 'فعّل «التنبيه» أولاً لإرسال الإشعار'
          }
          className="bg-admin-surface-light hover:bg-admin-surface-light/70 border border-admin-border text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingAction === 'announce' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {savingAction === 'announce' ? 'جاري الإرسال...' : 'حفظ وإرسال إشعار'}
        </button>

        {saveMessage && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${
              saveMessage.type === 'success'
                ? 'bg-accent/20 text-accent-light'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
