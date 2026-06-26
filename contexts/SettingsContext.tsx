// contexts/SettingsContext.tsx
// سياق الإعدادات - روح المسلم
// آخر تحديث: 2026-03-04

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName, Alert, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { scheduleNotificationsFromSettings, syncNotificationDefaults } from '@/lib/notifications-manager';
import { 
  t as translate, 
  setLanguage as setI18nLanguage, 
  getLanguage,
  loadSavedLanguage,
  isRTL,
  getTranslations,
  supportedLanguages,
} from '@/lib/i18n';
import { translations, Language, TranslationKeys } from '@/constants/translations';
import { blendWithDimOverlay, getContrastTextColor } from '@/lib/contrast-helper';
import { updateSharedData } from '@/lib/widget-data';
import { switchAppIcon } from '@/lib/app-icon-manager';
import {
  applyCountryPrayerDefaults,
  COUNTRY_DEFAULTS,
  MAKKAH_FALLBACK_DEFAULTS,
} from '@/lib/country-prayer-defaults';
import { getSavedUserCountry } from '@/services/hijriCalendarService';
import { calculationMethods, getPrayerSettings, getStoredLocation, savePrayerSettings } from '@/lib/prayer-times';
import { subscribeRemoteTranslationChanges } from '@/lib/remote-translations';

// ========================================
// Eager theme cache — read previous session's theme/background at module load
// so useState initializer can use the correct values on first render,
// eliminating the dark→light (or vice-versa) flash.
// ========================================

const THEME_CACHE_KEY = '@cached_theme_snapshot';

interface ThemeCacheSnapshot {
  theme: string;
  appBackground: string;
  appBackgroundTextColor?: string;
  isDarkMode?: boolean;
}

let _cachedThemeSnapshot: ThemeCacheSnapshot | null = null;

// Serializes the read-merge-write settings updaters. Each updater reads the
// persisted settings (or a closure snapshot), merges its partial on top, and
// writes the whole object back — two of those interleaving drop each other's
// keys. The freshest-read inside each updater handles staleness; this queue
// ensures the read→write window of one updater can't overlap another's.
let _settingsUpdateChain: Promise<unknown> = Promise.resolve();
function enqueueSettingsUpdate<T>(fn: () => Promise<T>): Promise<T> {
  const task = _settingsUpdateChain.then(fn, fn);
  _settingsUpdateChain = task.catch(() => {});
  return task;
}

/** Eagerly started at module scope — resolves before SettingsProvider mounts
 *  because _layout.tsx gates on languageReady which also reads AsyncStorage. */
export const themeCachePromise: Promise<ThemeCacheSnapshot | null> = AsyncStorage.getItem(THEME_CACHE_KEY)
  .then((raw) => {
    if (raw) {
      try {
        _cachedThemeSnapshot = JSON.parse(raw);
      } catch { /* corrupted — use defaults */ }
    }
    return _cachedThemeSnapshot;
  })
  .catch(() => null);

/** Synchronously returns the cached snapshot (available after themeCachePromise resolves) */
export function getCachedThemeSnapshot(): ThemeCacheSnapshot | null {
  return _cachedThemeSnapshot;
}

// ========================================
// الأنواع
// ========================================

export type { Language } from '@/constants/translations';
export type ThemeMode = 'light' | 'dark' | 'system' | 'custom';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type CalculationMethod = 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 99;

export type NotificationSoundType = 'default' | 'salawat' | 'istighfar' | 'tasbih' | 'subhanallah' | 'alhamdulillah' | 'silent';

export type ReminderSoundType = 'default' | 'salawat' | 'istighfar' | 'tasbih' | 'subhanallah' | 'alhamdulillah' | 'silent';

export type AdhanSoundType = 'default' | 'makkah' | 'madinah' | 'alaqsa' | 'mishary' | 'abdulbasit' | 'sudais' | 'egypt' | 'dosari' | 'ajman' | 'ali_mulla' | 'naqshbandi' | 'sharif' | 'mansoor_zahrani' | 'haramain' | 'silent';

export interface NotificationSettings {
  enabled: boolean;
  prayerTimes: boolean;
  prayerReminder: boolean;
  prayerReminderMinutes: number;
  reminderMinutes: number;
  // "هل صليت؟" follow-up reminder
  didYouPrayReminder?: boolean;
  didYouPrayDelayMinutes?: number;
  didYouPraySnoozeMinutes?: number;
  fajrSpecial: boolean;
  azkarMorning: boolean;
  azkarMorningTime: string;
  azkarEvening: boolean;
  azkarEveningTime: string;
  morningAzkar: boolean;
  morningAzkarTime: string;
  eveningAzkar: boolean;
  eveningAzkarTime: string;
  dailyVerse: boolean;
  dailyVerseTime: string;
  dailyHadith: boolean;
  khatmaReminder: boolean;
  sound: boolean;
  vibration: boolean;
  soundType: NotificationSoundType;
  adhanSoundType: AdhanSoundType;
  fullAdhanSoundType?: string;
  // When true, prayer notifications use full adhan recordings from
  // assets/sounds/adhan_full/. Android plays them via a foreground media
  // service; iOS uses the bundled full sound and the system cuts it at ~29s.
  useFullAdhan?: boolean;
  // Worship tracking notifications
  worshipPrayerLogging: boolean;
  worshipDailySummary: boolean;
  worshipDailySummaryTime: string;
  worshipStreakAlerts: boolean;
  worshipWeeklyReport: boolean;
  worshipWeeklyReportTime?: string;
  worshipQuietHoursEnabled: boolean;
  worshipQuietHoursStart: string;
  worshipQuietHoursEnd: string;
  // Quran reading reminder
  quranReadingReminder: boolean;
  quranReadingReminderTime: string;
  quranReminderDays: number[]; // 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
  quranReminder24Hour: boolean;
  quranReminderSoundType: NotificationSoundType;
  // Salawat, Istighfar, Tasbih reminders
  salawatReminder?: boolean;
  salawatReminderTime?: string;
  istighfarReminder?: boolean;
  istighfarReminderTime?: string;
  tasbihReminder?: boolean;
  tasbihReminderTime?: string;
  // Additional Adhkar reminders
  sleepAzkar: boolean;
  sleepAzkarTime: string;
  wakeupAzkar: boolean;
  wakeupAzkarTime: string;
  afterPrayerAzkar: boolean;
  // Per-category sound selection
  salawatSoundType?: ReminderSoundType;
  tasbihSoundType?: ReminderSoundType;
  istighfarSoundType?: ReminderSoundType;
  azkarSoundType?: ReminderSoundType;
  dailyVerseSoundType?: ReminderSoundType;
  // Custom reminder
  customReminder?: boolean;
  customReminderTime?: string;
  customReminderTitle?: string;
  customReminderSoundType?: ReminderSoundType;
  // Custom reminder content
  customReminderContentType?: 'text' | 'ayah' | 'surah' | 'azkar' | 'dua';
  customReminderSurah?: number;
  customReminderAyah?: number;
  customReminderReciter?: string;
  // Per-category day-of-week selection (1=Sun, 2=Mon, ... 7=Sat — expo-notifications weekday)
  salawatDays?: number[];
  tasbihDays?: number[];
  istighfarDays?: number[];
  azkarDays?: number[];
  dailyVerseDays?: number[];
  customReminderDays?: number[];
  // Friday Surah Al-Kahf reminder (auto 2h after Jummah Dhuhr)
  kahfReminder?: boolean;
  kahfTime?: string;
  // Per-category sound overrides for hardcoded reminders.
  // Defaults: 'notif_sleep', 'notif_wakeup', 'notif_kahf'.
  sleepSoundType?: string;
  wakeupSoundType?: string;
  kahfSoundType?: string;
  // Multi-time scheduling (up to 3 times per category)
  morningAzkarTimes?: string[];
  eveningAzkarTimes?: string[];
  sleepAzkarTimes?: string[];
  wakeupAzkarTimes?: string[];
  dailyVerseTimes?: string[];
  salawatReminderTimes?: string[];
  tasbihReminderTimes?: string[];
  istighfarReminderTimes?: string[];
  customReminderTimes?: string[];
  quranReadingReminderTimes?: string[];
  // Phase 7: ربط أذكار الصباح/المساء/النوم/الاستيقاظ بأوقات الصلاة الفعلية تلقائياً
  azkarAutoAnchor?: boolean;
  // Per-category admin override tracking (true = user customized, skip admin sync)
  notifOverrides?: Record<string, boolean>;
}

export type AppBackgroundKey = 'none' | 'background1' | 'background2' | 'background3' | 'background4' | 'background5' | 'background6' | 'background7' | 'dynamic';
export type QuranBackgroundKey = 'none' | 'quranbg1' | 'quranbg2' | 'quranbg3' | 'quranbg4';

export type HomeLayout = 'grid' | 'list';

export interface DisplaySettings {
  fontSize: FontSize;
  arabicFontSize: number;
  translationFontSize: number;
  showTashkeel: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  translationEdition: string;
  highlightTajweed: boolean;
  /** Mushaf reading mode: 'tarteel' = monochrome (default), 'tajweed' = colored COLRv1 fonts */
  quranReadingMode?: 'tarteel' | 'tajweed';
  appBackground: AppBackgroundKey;
  appBackgroundUrl?: string; // For dynamic/remote backgrounds
  appBackgroundTextColor?: 'white' | 'black'; // Text color for dynamic backgrounds
  /** Average color of dynamic photo background for smart contrast */
  dynamicBgColor?: string;
  /** Background image opacity (0.1–0.5, default 0.2) */
  backgroundOpacity: number;
  quranBackground: QuranBackgroundKey;
  quranThemeIndex: number;
  /** Default Arabic widget font for Date/Prayer variants. Adhkar widgets are always WidgetFont2. */
  widgetFontVariant: 'widget1' | 'widget2';
  homeLayout: HomeLayout;
  /** Font size adjustment for Mushaf reader (-4 to +8, default 0) */
  quranFontSizeAdjust: number;
  /** Auto-scroll speed for Mushaf reader (0 = slow, 1 = fast) */
  quranAutoScrollSpeed: number;
  /** Use CDN page images instead of text rendering */
  quranUseCdnPages?: boolean;
  /** Show tafsir panel below Mushaf reader */
  showTafsir: boolean;
  /** Focus mode - hide UI elements while reading Quran */
  focusMode: boolean;
  /** Show translation in Dua/Hadith/Quote pages */
  duaShowTranslation: boolean;
  /** Auto-change interval for daily content (in hours, 0 = manual only) */
  dailyContentChangeInterval: number;
  /** Enable blur overlay on background image */
  blurEnabled: boolean;
  /** Blur intensity (1–100, default 15) */
  blurIntensity: number;
  /** Enable dim overlay on background image */
  dimEnabled: boolean;
  /** Dim overlay opacity (0.3–0.7, default 0.5) */
  dimOpacity: number;
  /** Show section info (ⓘ) buttons across the app */
  showSectionInfo: boolean;
  /** Widget calendar preference (legacy / global fallback) */
  widgetCalendar: 'auto' | 'gregorian' | 'hijri';
  /** Per-widget-type calendar: Day widgets (DaySimple, DayThuluth, DayDigital) */
  widgetDayCalendar: 'auto' | 'gregorian' | 'hijri';
  /** Per-widget-type calendar: Month widgets (MonthSimple, MonthThuluth) */
  widgetMonthCalendar: 'auto' | 'gregorian' | 'hijri';
  /** Widget numeral style */
  widgetNumerals: 'auto' | 'arabic' | 'western';
  /** Widget theme */
  widgetTheme: 'auto' | 'dark' | 'light' | 'olive' | 'green' | 'blue' | 'desert' | 'slate';
  /** Widget language override */
  widgetLanguage: 'auto' | 'ar' | 'en';
  /** Widget date format (Glassify-style sample values) */
  widgetDateFormat: 'none' | 'gregorian-ar' | 'hijri-ar' | 'gregorian-en' | 'hijri-en';
}

export interface PrayerSettings {
  calculationMethod: CalculationMethod;
  asrJuristic: 0 | 1;
  adjustments: {
    fajr: number;
    sunrise: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
  showSunrise: boolean;
  show24Hour: boolean;
  showDate: boolean;
  showLocation: boolean;
  layout?: 'list' | 'widget';
  methodManuallySet?: boolean;
}

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  notifications: NotificationSettings;
  display: DisplaySettings;
  prayer: PrayerSettings;
  firstLaunch: boolean;
  lastBackup: string | null;
  analytics: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  isDarkMode: boolean;
  isRTL: boolean;
  currentTranslations: TranslationKeys;
  
  // دوال التحديث
  updateLanguage: (language: Language) => Promise<void>;
  updateTheme: (theme: ThemeMode) => Promise<void>;
  updateThemeAndDisplay: (theme: ThemeMode, display: Partial<DisplaySettings>) => Promise<void>;
  updateNotifications: (notifications: Partial<NotificationSettings>) => Promise<void>;
  updateDisplay: (display: Partial<DisplaySettings>) => Promise<void>;
  updatePrayer: (prayer: Partial<PrayerSettings>) => Promise<void>;
  
  // دوال عامة
  resetSettings: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (data: string) => Promise<boolean>;
  
  // دالة الترجمة
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ========================================
// القيم الافتراضية
// ========================================

const defaultNotifications: NotificationSettings = {
  enabled: true,
  prayerTimes: true,
  prayerReminder: false,
  prayerReminderMinutes: 0,
  reminderMinutes: 0,
  didYouPrayReminder: true,
  didYouPrayDelayMinutes: 30,
  didYouPraySnoozeMinutes: 15,
  fajrSpecial: true,
  azkarMorning: true,
  azkarMorningTime: '06:00',
  azkarEvening: true,
  azkarEveningTime: '17:45',
  morningAzkar: true,
  morningAzkarTime: '06:00',
  eveningAzkar: true,
  eveningAzkarTime: '17:45',
  dailyVerse: true,
  dailyVerseTime: '13:30',
  dailyHadith: false,
  khatmaReminder: true,
  sound: true,
  vibration: true,
  soundType: 'default',
  adhanSoundType: 'makkah',
  fullAdhanSoundType: 'makkah',
  useFullAdhan: false,
  // Worship tracking notifications
  worshipPrayerLogging: true,
  worshipDailySummary: true,
  worshipDailySummaryTime: '23:00',
  worshipStreakAlerts: true,
  worshipWeeklyReport: true,
  worshipWeeklyReportTime: '21:00',
  worshipQuietHoursEnabled: false,
  worshipQuietHoursStart: '23:00',
  worshipQuietHoursEnd: '06:00',
  // Quran reading reminder
  quranReadingReminder: true,
  quranReadingReminderTime: '20:00',
  quranReminderDays: [0, 1, 2, 3, 4, 5, 6],
  quranReminder24Hour: true,
  quranReminderSoundType: 'default',
  // Salawat, Istighfar, Tasbih reminders
  salawatReminder: true,
  salawatReminderTime: '17:00',
  istighfarReminder: true,
  istighfarReminderTime: '19:00',
  tasbihReminder: true,
  tasbihReminderTime: '21:00',
  // Additional Adhkar reminders
  sleepAzkar: true,
  sleepAzkarTime: '22:00',
  wakeupAzkar: true,
  wakeupAzkarTime: '10:00',
  // Retired: superseded by "هل صليت؟" (did_you_pray) reminder.
  afterPrayerAzkar: false,
  // Friday Surah Al-Kahf reminder
  kahfReminder: true,
  kahfTime: '14:00',
  // Per-category sound overrides (null/undefined falls back to hardcoded keys)
  sleepSoundType: 'notif_sleep',
  wakeupSoundType: 'notif_wakeup',
  kahfSoundType: 'notif_kahf',
  // Phase 7: ربط الأذكار بأوقات الصلاة (افتراضي: معطّل — اختياري للمستخدم)
  azkarAutoAnchor: false,
};

const defaultDisplay: DisplaySettings = {
  fontSize: 'medium',
  arabicFontSize: 24,
  translationFontSize: 16,
  showTashkeel: true,
  showTranslation: false,
  showTransliteration: false,
  translationEdition: 'en.sahih',
  highlightTajweed: true,
  quranReadingMode: 'tarteel',
  appBackground: 'background3',
  backgroundOpacity: 1,
  quranBackground: 'quranbg1',
  quranFontSizeAdjust: 0,
  quranAutoScrollSpeed: 0.5,
  quranThemeIndex: 0,
  quranUseCdnPages: false,
  widgetFontVariant: 'widget1',
  homeLayout: 'grid',
  showTafsir: false,
  focusMode: false,
  duaShowTranslation: true,
  dailyContentChangeInterval: 24, // Change daily content every 24 hours
  blurEnabled: false,
  blurIntensity: 15,
  dimEnabled: false,
  dimOpacity: 0.55,
  showSectionInfo: true,
  widgetCalendar: 'auto',
  widgetDayCalendar: 'auto',
  widgetMonthCalendar: 'auto',
  widgetNumerals: 'auto',
  widgetTheme: 'auto',
  widgetLanguage: 'auto',
  widgetDateFormat: 'gregorian-ar',
};

const defaultPrayer: PrayerSettings = {
  calculationMethod: MAKKAH_FALLBACK_DEFAULTS.method as CalculationMethod,
  asrJuristic: MAKKAH_FALLBACK_DEFAULTS.asrSchool,
  adjustments: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
  showSunrise: true,
  show24Hour: false,
  showDate: true,
  showLocation: true,
  layout: 'list',
};

const defaultSettings: AppSettings = {
  language: 'ar',
  theme: 'custom',
  notifications: defaultNotifications,
  display: defaultDisplay,
  prayer: defaultPrayer,
  firstLaunch: true,
  lastBackup: null,
  analytics: true,
};

// ========================================
// مفاتيح التخزين
// ========================================

const STORAGE_KEY = 'app_settings';
const WIDGET_DISPLAY_PREFS_KEY = '@widget_display_preferences';
const WIDGET_DISPLAY_KEYS = [
  'widgetCalendar',
  'widgetDayCalendar',
  'widgetMonthCalendar',
  'widgetNumerals',
  'widgetTheme',
  'widgetLanguage',
  'widgetDateFormat',
  'widgetFontVariant',
] as const;

type WidgetDisplayKey = typeof WIDGET_DISPLAY_KEYS[number];
type WidgetDisplayPrefs = Partial<Pick<DisplaySettings, WidgetDisplayKey>>;

function pickWidgetDisplayPrefs(display: Partial<DisplaySettings>): WidgetDisplayPrefs {
  const out: Partial<Record<WidgetDisplayKey, unknown>> = {};
  for (const key of WIDGET_DISPLAY_KEYS) {
    if (key in display && display[key] !== undefined) {
      out[key] = display[key];
    }
  }
  return out as WidgetDisplayPrefs;
}

function logWidgetTheme(message: string, payload?: unknown) {
  if (!__DEV__) return;
  if (payload === undefined) {
    console.log(`[WidgetTheme] ${message}`);
  } else {
    console.log(`[WidgetTheme] ${message}`, payload);
  }
}

async function readWidgetDisplayPrefs(reason: string): Promise<WidgetDisplayPrefs> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DISPLAY_PREFS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    logWidgetTheme(`loaded from storage (${reason}):`, parsed);
    return parsed;
  } catch (e) {
    logWidgetTheme(`loaded from storage (${reason}) failed:`, (e as Error)?.message ?? e);
    return {};
  }
}

async function writeWidgetDisplayPrefs(prefs: WidgetDisplayPrefs, reason: string): Promise<void> {
  await AsyncStorage.setItem(WIDGET_DISPLAY_PREFS_KEY, JSON.stringify(prefs));
  logWidgetTheme(`saved to storage (${reason}):`, prefs);
}

function mergeWidgetDisplayPrefs(settings: AppSettings, prefs: WidgetDisplayPrefs, reason: string): AppSettings {
  const merged = {
    ...settings,
    display: {
      ...settings.display,
      ...prefs,
    },
  };
  logWidgetTheme(`after merge/normalization (${reason}):`, {
    selectedWidgetTheme: merged.display.widgetTheme,
    widgetPrefs: pickWidgetDisplayPrefs(merged.display),
  });
  return merged;
}

// ========================================
// Notification Defaults Migration
// ========================================
// Bump this version whenever default notification times/toggles change.
// On app update, existing users will get their notification settings
// reset to the new defaults (both times AND on/off toggles).
// v10 (April 2026): force-enable all categories + reset times so every user
// receives the full standardized notification schedule.
const NOTIFICATION_DEFAULTS_VERSION = 10;
const NOTIF_DEFAULTS_VERSION_KEY = '@notification_defaults_version';
const QURAN_ISTIGHFAR_COLLISION_MIGRATION_KEY = '@quran_istighfar_collision_migration_v1';
const MAKKAH_FALLBACK_MIGRATION_KEY = '@prayer_makkah_fallback_migration_v1';
const APP_BACKGROUND_DEFAULT_MIGRATION_KEY = '@app_background_default_migration_v1';

async function clearPrayerTimeFallbackCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((key) =>
    key.startsWith('prayer_times_cache_') ||
    key.startsWith('@prayer_week_cache')
  );
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}

async function syncLocalPrayerFallbackSettings(): Promise<void> {
  const localPrayerSettings = await getPrayerSettings();
  localPrayerSettings.calculationMethod = MAKKAH_FALLBACK_DEFAULTS.method as CalculationMethod;
  localPrayerSettings.asrJuristic = MAKKAH_FALLBACK_DEFAULTS.asrSchool;
  await savePrayerSettings(localPrayerSettings);
}

// ========================================
// السياق
// ========================================

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ========================================
// المزود
// ========================================

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Use lazy initializer so the FIRST render already has the correct language
  // AND theme. By the time SettingsProvider mounts, _layout.tsx's languageReady
  // gate has ensured languageInitPromise resolved, so getLanguage() is the saved
  // value. We also read the eagerly-cached theme snapshot so the initial render
  // uses the correct theme/background — eliminating the flash.
  const [settings, setSettings] = useState<AppSettings>(() => {
    const initialLang = getLanguage() as Language;
    const themeCache = getCachedThemeSnapshot();
    if (__DEV__) console.log(`📱 SettingsProvider initial language: ${initialLang}, cachedTheme: ${themeCache?.theme ?? 'none'}`);
    
    const initial = {
      ...defaultSettings,
      language: initialLang,
    };
    
    // Apply cached theme/background to avoid flash
    if (themeCache) {
      initial.theme = themeCache.theme as ThemeMode;
      initial.display = {
        ...initial.display,
        appBackground: themeCache.appBackground as AppBackgroundKey,
        appBackgroundTextColor: themeCache.appBackgroundTextColor as 'white' | 'black' | undefined,
      };
    }
    
    return initial;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [initialSchedulingDone, setInitialSchedulingDone] = useState(false);
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  const [remoteTranslationVersion, setRemoteTranslationVersion] = useState(0);

  // حساب الوضع الداكن
  // When theme is 'custom', use background-based contrast detection
  // Otherwise, theme directly controls dark mode
  const appBgKey = settings.display.appBackground;
  const hasActiveBg = appBgKey && appBgKey !== 'none';
  const hasDynamicPhotoBg = appBgKey === 'dynamic' && settings.display.dimEnabled;
  const hasBuiltInBg = hasActiveBg && appBgKey !== 'dynamic';

  // Smart contrast for custom theme: determine if white text is needed
  let needsWhiteText = settings.display.appBackgroundTextColor !== 'black';
  if (hasDynamicPhotoBg && settings.display.dynamicBgColor) {
    const dimOpacity = settings.display.dimOpacity ?? 0.55;
    const effectiveColor = blendWithDimOverlay(settings.display.dynamicBgColor, dimOpacity);
    needsWhiteText = getContrastTextColor(effectiveColor) === '#FFFFFF';
  }

  // Calculate isDarkMode based on theme mode.
  // Policy: only the explicit 'light' theme renders light. Every other choice
  // ('dark', 'system', 'custom') is treated as dark so contrast rules stay
  // consistent across the app regardless of OS scheme. Custom theme still
  // allows an explicit light override when paired with a bright background.
  let isDarkMode: boolean;
  if (settings.theme === 'light') {
    isDarkMode = false;
  } else if (settings.theme === 'custom') {
    const hasLightBg = (hasDynamicPhotoBg || hasBuiltInBg) && !needsWhiteText;
    isDarkMode = !hasLightBg;
  } else {
    // 'dark' and 'system' → always dark for consistent contrast
    isDarkMode = true;
  }

  // حساب اتجاه اللغة
  const isRTLMode = isRTL(settings.language);

  // الترجمات الحالية
  const currentTranslations = translations[settings.language] || translations['en'];

  // ========================================
  // تحميل الإعدادات
  // ========================================

  useEffect(() => {
    loadSettings();
    
    // الاستماع لتغيير ثيم النظام
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme);
    });
    const unsubscribeRemoteTranslations = subscribeRemoteTranslationChanges(() => {
      setRemoteTranslationVersion(version => version + 1);
    });
    
    return () => {
      subscription.remove();
      unsubscribeRemoteTranslations();
    };
  }, []);

  const loadSettings = async () => {
    try {
      // تحميل الإعدادات المحفوظة
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      
      // Check if language was set directly (e.g. during onboarding) via @app_language
      const i18nLang = await loadSavedLanguage();
      
      if (stored) {
        let parsed: any;
        try {
          parsed = JSON.parse(stored);
        } catch (parseError) {
          console.error('⚠️ Corrupted settings JSON, resetting to defaults:', parseError);
          // Remove corrupted data and fall back to defaults
          await AsyncStorage.removeItem(STORAGE_KEY);
          parsed = {};
        }
        // Deep merge nested objects to preserve new defaults for fields added after initial save
        const loadedSettings = {
          ...defaultSettings,
          ...parsed,
          notifications: { ...defaultNotifications, ...(parsed.notifications || {}) },
          display: { ...defaultDisplay, ...(parsed.display || {}) },
          prayer: { ...defaultPrayer, ...(parsed.prayer || {}) },
        };
        console.log('[FullAdhan] loaded settings:', parsed.notifications);
        console.log('[FullAdhan] after merge:', {
          useFullAdhan: loadedSettings.notifications.useFullAdhan === true,
          fullAdhanSoundType: loadedSettings.notifications.fullAdhanSoundType,
          adhanSoundType: loadedSettings.notifications.adhanSoundType,
        });

        // Widget visual preferences are also mirrored to a narrow key so
        // default normalization / unrelated settings writes cannot silently
        // reset an explicit user-selected widget theme back to `auto`.
        {
          const widgetPrefs = await readWidgetDisplayPrefs('loadSettings');
          Object.assign(loadedSettings.display, widgetPrefs);
          logWidgetTheme('after merge/normalization (loadSettings):', {
            selectedWidgetTheme: loadedSettings.display.widgetTheme,
            widgetPrefs: pickWidgetDisplayPrefs(loadedSettings.display),
          });
        }
        
        // Prefer i18n-saved language if it differs (handles onboarding sync)
        if (i18nLang && i18nLang !== loadedSettings.language) {
          loadedSettings.language = i18nLang;
        }

        // Migration: force-update notification times when defaults version changes
        try {
          const storedVersion = await AsyncStorage.getItem(NOTIF_DEFAULTS_VERSION_KEY);
          const currentVersion = parseInt(storedVersion || '0', 10);
          if (currentVersion < NOTIFICATION_DEFAULTS_VERSION) {
            // Reset notification times to new defaults (preserve user toggles/booleans)
            const timeKeys = [
              'azkarMorningTime', 'azkarEveningTime', 'morningAzkarTime', 'eveningAzkarTime',
              'dailyVerseTime', 'quranReadingReminderTime', 'salawatReminderTime',
              'istighfarReminderTime', 'tasbihReminderTime', 'sleepAzkarTime', 'wakeupAzkarTime',
              'worshipDailySummaryTime', 'worshipWeeklyReportTime', 'kahfTime',
            ] as const;
            for (const key of timeKeys) {
              (loadedSettings.notifications as any)[key] = (defaultNotifications as any)[key];
            }
            // Also clear multi-time arrays so UI picks up the new single-time defaults
            const multiTimeKeys = [
              'morningAzkarTimes', 'eveningAzkarTimes', 'sleepAzkarTimes', 'wakeupAzkarTimes',
              'dailyVerseTimes', 'salawatReminderTimes', 'istighfarReminderTimes',
              'tasbihReminderTimes', 'customReminderTimes', 'quranReadingReminderTimes',
            ] as const;
            for (const key of multiTimeKeys) {
              delete (loadedSettings.notifications as any)[key];
            }
            // Mark all categories as user-customized so Firestore admin defaults
            // don't override the freshly migrated times on next sync.
            loadedSettings.notifications.notifOverrides = {
              morningAzkar: true, eveningAzkar: true, sleepAzkar: true, wakeupAzkar: true,
              dailyVerse: true, quranReading: true, salawat: true, tasbih: true,
              istighfar: true, customReminder: true, kahfFriday: true,
            };
            // v10: Force-enable ALL standard notification categories so every user
            // gets the full schedule after the update. customReminder is left untouched
            // because it is a personal reminder with no sensible default.
            loadedSettings.notifications.enabled = true;
            loadedSettings.notifications.prayerTimes = true;
            loadedSettings.notifications.didYouPrayReminder = true;
            loadedSettings.notifications.morningAzkar = true;
            loadedSettings.notifications.eveningAzkar = true;
            loadedSettings.notifications.sleepAzkar = true;
            loadedSettings.notifications.wakeupAzkar = true;
            loadedSettings.notifications.dailyVerse = true;
            loadedSettings.notifications.salawatReminder = true;
            loadedSettings.notifications.tasbihReminder = true;
            loadedSettings.notifications.istighfarReminder = true;
            loadedSettings.notifications.quranReadingReminder = true;
            loadedSettings.notifications.kahfReminder = true;
            loadedSettings.notifications.worshipPrayerLogging = true;
            loadedSettings.notifications.worshipDailySummary = true;
            loadedSettings.notifications.worshipWeeklyReport = true;
            loadedSettings.notifications.worshipStreakAlerts = true;
            loadedSettings.notifications.sound = true;
            // afterPrayerAzkar retired: force off for upgrading users so stale schedules stop firing.
            loadedSettings.notifications.afterPrayerAzkar = false;
            // Persist migrated settings to AsyncStorage so they survive next cold start
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadedSettings));
            await AsyncStorage.setItem(NOTIF_DEFAULTS_VERSION_KEY, String(NOTIFICATION_DEFAULTS_VERSION));
            console.log('🔔 Migrated notification defaults to version', NOTIFICATION_DEFAULTS_VERSION);
          }
        } catch (migrationErr) {
          console.warn('⚠️ Notification defaults migration failed:', migrationErr);
        }

        try {
          const migrated = await AsyncStorage.getItem(QURAN_ISTIGHFAR_COLLISION_MIGRATION_KEY);
          if (migrated !== 'true') {
            const notifications = loadedSettings.notifications as any;
            const quranTime = notifications.quranReadingReminderTime;
            const istighfarTime = notifications.istighfarReminderTime;
            const quranTimes = notifications.quranReadingReminderTimes;
            const quranOnlyAtSeven =
              !Array.isArray(quranTimes) ||
              quranTimes.length === 0 ||
              (quranTimes.length === 1 && quranTimes[0] === '19:00');

            if (quranTime === '19:00' && istighfarTime === '19:00' && quranOnlyAtSeven) {
              notifications.quranReadingReminderTime = '20:00';
              notifications.quranReadingReminderTimes = ['20:00'];
              notifications.notifOverrides = {
                ...(notifications.notifOverrides ?? {}),
                quranReading: true,
              };
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadedSettings));
              console.log('🔔 Moved Quran reminder from 19:00 to 20:00 to avoid istighfar collision');
            }

            await AsyncStorage.setItem(QURAN_ISTIGHFAR_COLLISION_MIGRATION_KEY, 'true');
          }
        } catch (migrationErr) {
          console.warn('⚠️ Quran/istighfar collision migration failed:', migrationErr);
        }

        try {
          const migrated = await AsyncStorage.getItem(MAKKAH_FALLBACK_MIGRATION_KEY);
          if (migrated !== 'true') {
            const [savedGpsCountry, storedLocation] = await Promise.all([
              getSavedUserCountry(),
              getStoredLocation(),
            ]);
            const hasSavedGpsCountry = !!savedGpsCountry;
            const hasStoredLocation = !!(storedLocation?.latitude && storedLocation?.longitude);

            if (!hasSavedGpsCountry && !hasStoredLocation && loadedSettings.prayer.methodManuallySet !== true) {
              loadedSettings.prayer = {
                ...loadedSettings.prayer,
                calculationMethod: MAKKAH_FALLBACK_DEFAULTS.method as CalculationMethod,
                asrJuristic: MAKKAH_FALLBACK_DEFAULTS.asrSchool,
              };
              await syncLocalPrayerFallbackSettings();
              await clearPrayerTimeFallbackCaches();
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadedSettings));
              console.log('🕋 Migrated no-location prayer fallback to Makkah/Umm Al-Qura');
            }

            await AsyncStorage.setItem(MAKKAH_FALLBACK_MIGRATION_KEY, 'true');
          }
        } catch (migrationErr) {
          console.warn('⚠️ Makkah prayer fallback migration failed:', migrationErr);
        }

        try {
          const migrated = await AsyncStorage.getItem(APP_BACKGROUND_DEFAULT_MIGRATION_KEY);
          if (migrated !== 'true') {
            if (loadedSettings.display.appBackground === 'none') {
              loadedSettings.display = {
                ...loadedSettings.display,
                appBackground: defaultDisplay.appBackground,
              };
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadedSettings));
              console.log('🎨 Migrated appBackground from "none" to', defaultDisplay.appBackground);
            }
            await AsyncStorage.setItem(APP_BACKGROUND_DEFAULT_MIGRATION_KEY, 'true');
          }
        } catch (migrationErr) {
          console.warn('⚠️ App background default migration failed:', migrationErr);
        }

        setSettings(loadedSettings);
        
        // Cache theme snapshot for next cold start
        const snapshot: ThemeCacheSnapshot = {
          theme: loadedSettings.theme,
          appBackground: loadedSettings.display.appBackground ?? defaultDisplay.appBackground,
          appBackgroundTextColor: loadedSettings.display.appBackgroundTextColor,
        };
        _cachedThemeSnapshot = snapshot;
        AsyncStorage.setItem(THEME_CACHE_KEY, JSON.stringify(snapshot)).catch(() => {});
        
        // تحديث اللغة في نظام الترجمة
        await setI18nLanguage(loadedSettings.language);
        
        // RTL is handled manually via useIsRTL() hook — do NOT call
        // I18nManager.forceRTL() as it causes double-reversal on Android production builds.

        // Wait for notification channels (Android) and installed sounds cache (all platforms)
        // to be initialized before scheduling. These are set up in _layout.tsx's useEffect
        // (parent), which runs AFTER this child useEffect.
        try {
          const { channelsReadyPromise } = await import('@/app/_layout');
          await Promise.race([
            channelsReadyPromise,
            new Promise<void>(resolve => setTimeout(resolve, 5000)),
          ]);
        } catch {}

        // Schedule notifications on app init based on saved settings
        const n = loadedSettings.notifications;
        if (n.enabled) {
          console.log('[FullAdhan] cold-start scheduling with useFullAdhan:', n.useFullAdhan === true);
          scheduleNotificationsFromSettings({
            enabled: n.enabled,
            prayerTimes: n.prayerTimes,
            prayerReminder: n.prayerReminder,
            reminderMinutes: n.reminderMinutes,
            didYouPrayReminder: n.didYouPrayReminder,
            didYouPrayDelayMinutes: n.didYouPrayDelayMinutes,
            didYouPraySnoozeMinutes: n.didYouPraySnoozeMinutes,
            morningAzkar: n.morningAzkar,
            morningAzkarTime: n.morningAzkarTime,
            eveningAzkar: n.eveningAzkar,
            eveningAzkarTime: n.eveningAzkarTime,
            sleepAzkar: n.sleepAzkar ?? false,
            sleepAzkarTime: n.sleepAzkarTime ?? '22:00',
            wakeupAzkar: n.wakeupAzkar ?? false,
            wakeupAzkarTime: n.wakeupAzkarTime ?? '10:00',
            afterPrayerAzkar: n.afterPrayerAzkar ?? false,
            dailyVerse: n.dailyVerse,
            dailyVerseTime: n.dailyVerseTime,
            sound: n.sound,
            vibration: n.vibration !== false,
            soundType: n.soundType,
            adhanSoundType: n.adhanSoundType || 'makkah',
            fullAdhanSoundType: n.fullAdhanSoundType || 'makkah',
            useFullAdhan: n.useFullAdhan === true,
            azkarSoundType: n.azkarSoundType,
            dailyVerseSoundType: n.dailyVerseSoundType,
            salawatReminder: n.salawatReminder,
            salawatReminderTime: n.salawatReminderTime,
            salawatSoundType: n.salawatSoundType,
            tasbihReminder: n.tasbihReminder,
            tasbihReminderTime: n.tasbihReminderTime,
            tasbihSoundType: n.tasbihSoundType,
            istighfarReminder: n.istighfarReminder,
            istighfarReminderTime: n.istighfarReminderTime,
            istighfarSoundType: n.istighfarSoundType,
            customReminder: n.customReminder,
            customReminderTime: n.customReminderTime,
            customReminderTitle: n.customReminderTitle,
            customReminderSoundType: n.customReminderSoundType,
            customReminderContentType: n.customReminderContentType,
            customReminderSurah: n.customReminderSurah,
            customReminderAyah: n.customReminderAyah,
            customReminderReciter: n.customReminderReciter,
            salawatDays: n.salawatDays,
            tasbihDays: n.tasbihDays,
            istighfarDays: n.istighfarDays,
            azkarDays: n.azkarDays,
            dailyVerseDays: n.dailyVerseDays,
            customReminderDays: n.customReminderDays,
            quranReadingReminder: n.quranReadingReminder,
            quranReadingReminderTime: n.quranReadingReminderTime,
            quranReminderDays: n.quranReminderDays,
            quranReminderSoundType: n.quranReminderSoundType,
            worshipPrayerLogging: n.worshipPrayerLogging,
            worshipDailySummary: n.worshipDailySummary,
            worshipDailySummaryTime: n.worshipDailySummaryTime,
            worshipStreakAlerts: n.worshipStreakAlerts,
            worshipWeeklyReport: n.worshipWeeklyReport,
            worshipWeeklyReportTime: n.worshipWeeklyReportTime ?? '21:00',
            kahfReminder: n.kahfReminder,
            kahfTime: n.kahfTime,
            // Phase 7
            azkarAutoAnchor: n.azkarAutoAnchor === true,
          }, { allowPrompt: false }).then(() => {
            // Cold start: check-only, never surface a system prompt. Schedules
            // only if the user already granted; otherwise skips silently.
            // First-time grant happens in onboarding / when the user enables a reminder.
            // Mark initial scheduling complete so admin sync can safely proceed
            setInitialSchedulingDone(true);
          }).catch((e) => {
            console.log('Init notification scheduling error (non-blocking):', e);
            setInitialSchedulingDone(true); // Still mark done so startup isn't blocked
          });
        } else {
          // No notifications enabled, still mark scheduling done
          setInitialSchedulingDone(true);
        }
      } else {
        // أول تشغيل - محاولة تحديد اللغة من الجهاز
        await setI18nLanguage('ar');
        setInitialSchedulingDone(true); // First launch — no notifications to schedule
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setInitialSchedulingDone(true); // Error case — unblock admin sync
    } finally {
      setIsLoading(false);
    }
  };

  const reloadSettings = useCallback(async () => {
    await loadSettings();
  }, []);

  // ========================================
  // GPS-country prayer method reconciliation
  // Runs once after settings load.
  // Case A: methodManuallySet !== true → auto-update silently
  // Case B: methodManuallySet === true AND method mismatches GPS country
  //         → show Alert warning the user about potential discrepancy
  // ========================================
  const hasReconciledCountryRef = React.useRef(false);
  useEffect(() => {
    if (isLoading) return;
    if (hasReconciledCountryRef.current) return;
    hasReconciledCountryRef.current = true;

    (async () => {
      try {
        const countryCode = await getSavedUserCountry();
        if (!countryCode) return;
        const countryDefaults = applyCountryPrayerDefaults(countryCode);
        if (!countryDefaults) return;
        const { method, asrSchool } = countryDefaults;
        const currentMethod = settings.prayer.calculationMethod;
        const currentAsr = settings.prayer.asrJuristic;

        // No mismatch — nothing to do
        if (method === currentMethod && asrSchool === currentAsr) return;

        // Case A: User never manually set method → auto-update silently
        if (settings.prayer.methodManuallySet !== true) {
          console.log(
            `🌍 Country default prayer method for ${countryCode}: ${currentMethod}→${method}, asr ${currentAsr}→${asrSchool}`,
          );
          await updatePrayer({
            calculationMethod: method as CalculationMethod,
            asrJuristic: asrSchool,
          });
          return;
        }

        // Case B: User manually set method but it doesn't match their GPS country
        // Check if user already dismissed this warning for this specific country
        const dismissKey = `@prayer_mismatch_dismissed:${countryCode}`;
        const dismissed = await AsyncStorage.getItem(dismissKey);
        if (dismissed === 'true') return;

        // Get display names
        const countryData = COUNTRY_DEFAULTS[countryCode.toUpperCase()];
        const countryName = countryData?.cityNameAr
          ? countryCode.toUpperCase()
          : countryCode;
        const correctMethodInfo = calculationMethods[method as CalculationMethod];
        const currentMethodInfo = calculationMethods[currentMethod];
        const correctName = correctMethodInfo?.nameAr || correctMethodInfo?.name || `${method}`;
        const currentName = currentMethodInfo?.nameAr || currentMethodInfo?.name || `${currentMethod}`;

        // Show Alert warning
        Alert.alert(
          translate('prayer.methodMismatchTitle'),
          translate('prayer.methodMismatchMessage')
            .replace('{country}', countryName)
            .replace('{correctMethod}', correctName)
            .replace('{currentMethod}', currentName),
          [
            {
              text: translate('prayer.methodMismatchUpdate'),
              style: 'default',
              onPress: async () => {
                await updatePrayer({
                  calculationMethod: method as CalculationMethod,
                  asrJuristic: asrSchool,
                  methodManuallySet: false,
                });
                // Clear any previous dismissal for other countries
                try {
                  const keys = await AsyncStorage.getAllKeys();
                  const mismatchKeys = keys.filter(k => k.startsWith('@prayer_mismatch_dismissed:'));
                  if (mismatchKeys.length > 0) await AsyncStorage.multiRemove(mismatchKeys);
                } catch {}
              },
            },
            {
              text: translate('prayer.methodMismatchKeep'),
              style: 'cancel',
              onPress: async () => {
                try {
                  await AsyncStorage.setItem(dismissKey, 'true');
                } catch {}
              },
            },
          ],
        );
      } catch (e) {
        console.warn('Country prayer reconciliation failed:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ========================================
  // حفظ الإعدادات
  // ========================================

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      // Any generic settings save can be based on an older closure. Keep the
      // user's explicit widget visual preferences authoritative so unrelated
      // saves (notifications, prayer reconciliation, import side effects) never
      // reset `widgetTheme` back to `auto`.
      const widgetPrefs = await readWidgetDisplayPrefs('saveSettings');
      const settingsToSave = mergeWidgetDisplayPrefs(newSettings, widgetPrefs, 'saveSettings');
      logWidgetTheme('saved to app_settings:', {
        selectedWidgetTheme: settingsToSave.display.widgetTheme,
        widgetPrefs: pickWidgetDisplayPrefs(settingsToSave.display),
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      setSettings(settingsToSave);
      // Cache theme snapshot for next cold start — eliminates theme flash
      const snapshot: ThemeCacheSnapshot = {
        theme: settingsToSave.theme,
        appBackground: settingsToSave.display.appBackground ?? defaultDisplay.appBackground,
        appBackgroundTextColor: settingsToSave.display.appBackgroundTextColor,
      };
      _cachedThemeSnapshot = snapshot;
      AsyncStorage.setItem(THEME_CACHE_KEY, JSON.stringify(snapshot)).catch(() => {});
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // ========================================
  // دوال التحديث
  // ========================================

  const updateLanguage = useCallback(async (language: Language) => {
    // setI18nLanguage saves to AsyncStorage AND mirrors to Firestore so admin
    // notification targeting always reflects the user's reading language.
    await setI18nLanguage(language);

    // RTL is handled manually via useIsRTL() hook — do NOT call
    // I18nManager.forceRTL() as it causes double-reversal on Android production builds.

    // حفظ الإعدادات
    const newSettings = { ...settings, language };
    await saveSettings(newSettings);

    // تحديث بيانات الويدجت باللغة الجديدة — FORCE a full, awaited re-bake so every
    // baked prayer name/row-label PNG (active gallery snapshot + per-state
    // templates) regenerates in the new language and triggerNativeWidgetReload
    // fires BEFORE the app reloads. A bare updateSharedData() (force:false) lets
    // the hash/signature skip — and swallows a partial-bake failure — so the
    // widget kept the previous-language names until the debounced post-reload
    // pump finished (only the live time overlay flipped right away).
    try {
      const { updateWidgetData } = require('@/lib/widget-data-bridge');
      // clearSnapshotCache drops the stored per-theme content hashes (no PNG
      // deletion) so a signature collision can never let the bake hash-skip — the
      // new-language PNGs + captured anchors are guaranteed to commit before
      // triggerNativeWidgetReload fires and before the app reloads. Combined with
      // the home-side language guard, this closes the first-switch AR/EN scramble.
      await updateWidgetData(undefined, undefined, { forceSnapshots: true, clearSnapshotCache: true });
    } catch (e) { console.log('Widget language re-bake failed:', e); }

    // تحديث أيقونة التطبيق على الشاشة الرئيسية
    try { await switchAppIcon(language); } catch (e) { console.log('App icon switch failed:', e); }

    // إعادة تحميل التطبيق دائماً عند تغيير اللغة
    // لضمان تحديث جميع الشاشات والمكونات فوراً
    try {
      await Updates.reloadAsync();
    } catch (e) {
      // Updates.reloadAsync may fail in dev — state update still applied via saveSettings
      console.log('Updates.reloadAsync unavailable, using state update only');
    }
  }, [settings]);

  const updateTheme = useCallback((theme: ThemeMode) => enqueueSettingsUpdate(async () => {
    const newSettings = { ...settings, theme };
    await saveSettings(newSettings);
  }), [settings]);

  const updateThemeAndDisplay = useCallback((theme: ThemeMode, display: Partial<DisplaySettings>) => enqueueSettingsUpdate(async () => {
    const newSettings = {
      ...settings,
      theme,
      display: { ...settings.display, ...display },
    };
    await saveSettings(newSettings);
  }), [settings]);

  const updateNotifications = useCallback(async (notifications: Partial<NotificationSettings>) => {
    // Only the read-merge-write section holds the settings queue; the
    // (potentially slow) reschedule below runs outside it and is serialized
    // by the notifications-manager's own mutex.
    const newSettings = await enqueueSettingsUpdate(async () => {
    console.log('[FullAdhan] user toggled:', notifications.useFullAdhan);
    // Read the freshest persisted state from disk so concurrent writers
    // (e.g. non-premium adhan reset effect firing in parallel with a
    // toggle) cannot clobber each other via stale `settings` closures.
    let baseSettings: AppSettings = settings;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppSettings;
        baseSettings = {
          ...settings,
          ...parsed,
          notifications: { ...settings.notifications, ...(parsed.notifications || {}) },
          display: { ...settings.display, ...(parsed.display || {}) },
          prayer: { ...settings.prayer, ...(parsed.prayer || {}) },
        };
      }
    } catch (e) {
      console.warn('[updateNotifications] freshest-read failed, falling back to closure state:', e);
    }
    const merged = {
      ...baseSettings,
      notifications: { ...baseSettings.notifications, ...notifications },
    };
    console.log('[FullAdhan] saved settings:', {
      incoming: notifications,
      useFullAdhan: merged.notifications.useFullAdhan === true,
      fullAdhanSoundType: merged.notifications.fullAdhanSoundType,
      adhanSoundType: merged.notifications.adhanSoundType,
    });
    await saveSettings(merged);

    // If sound-related keys changed, reset Android channels so the new sound takes effect
    const soundKeys = [
      'adhanSoundType', 'fullAdhanSoundType', 'useFullAdhan', 'soundType', 'azkarSoundType',
      'salawatSoundType', 'tasbihSoundType', 'istighfarSoundType',
      'dailyVerseSoundType', 'customReminderSoundType', 'quranReminderSoundType',
    ] as const;
    const soundChanged = soundKeys.some(k => k in notifications);
    if (soundChanged) {
      const n2 = merged.notifications;
      // 'default' adhan → treat as 'makkah' so channels always get a real adhan sound
      const adhan = (n2.adhanSoundType && n2.adhanSoundType !== 'default') ? n2.adhanSoundType : 'makkah';
      const fajr = adhan; // Fajr uses same adhan by default
      const reminder = (n2.soundType && n2.soundType !== 'default') ? n2.soundType : 'default';
      // Persist for backward compatibility
      await AsyncStorage.multiSet([
        ['selectedAdhanSound', adhan],
        ['selectedFajrSound', fajr],
        ['selectedReminderSound', reminder],
      ]);
      // No need to delete/recreate channels — all channels are pre-created at startup.
      // The scheduleNotificationsFromSettings() call below will reschedule notifications
      // with the correct channelId for the new sound.
    }
    return merged;
    });

    // Schedule or cancel notifications based on updated settings
    const n = newSettings.notifications;
    await scheduleNotificationsFromSettings({
      enabled: n.enabled,
      prayerTimes: n.prayerTimes,
      prayerReminder: n.prayerReminder,
      reminderMinutes: n.reminderMinutes,
      morningAzkar: n.morningAzkar,
      morningAzkarTime: n.morningAzkarTime,
      eveningAzkar: n.eveningAzkar,
      eveningAzkarTime: n.eveningAzkarTime,
      sleepAzkar: n.sleepAzkar,
      sleepAzkarTime: n.sleepAzkarTime,
      wakeupAzkar: n.wakeupAzkar,
      wakeupAzkarTime: n.wakeupAzkarTime,
      afterPrayerAzkar: n.afterPrayerAzkar,
      dailyVerse: n.dailyVerse,
      dailyVerseTime: n.dailyVerseTime,
      sound: n.sound,
      vibration: n.vibration !== false,
      soundType: n.soundType,
      adhanSoundType: n.adhanSoundType || 'makkah',
      fullAdhanSoundType: n.fullAdhanSoundType || 'makkah',
      useFullAdhan: n.useFullAdhan === true,
      azkarSoundType: n.azkarSoundType,
      dailyVerseSoundType: n.dailyVerseSoundType,
      salawatReminder: n.salawatReminder,
      salawatReminderTime: n.salawatReminderTime,
      salawatSoundType: n.salawatSoundType,
      tasbihReminder: n.tasbihReminder,
      tasbihReminderTime: n.tasbihReminderTime,
      tasbihSoundType: n.tasbihSoundType,
      istighfarReminder: n.istighfarReminder,
      istighfarReminderTime: n.istighfarReminderTime,
      istighfarSoundType: n.istighfarSoundType,
      customReminder: n.customReminder,
      customReminderTime: n.customReminderTime,
      customReminderTitle: n.customReminderTitle,
      customReminderSoundType: n.customReminderSoundType,
      customReminderContentType: n.customReminderContentType,
      customReminderSurah: n.customReminderSurah,
      customReminderAyah: n.customReminderAyah,
      customReminderReciter: n.customReminderReciter,
      salawatDays: n.salawatDays,
      tasbihDays: n.tasbihDays,
      istighfarDays: n.istighfarDays,
      azkarDays: n.azkarDays,
      dailyVerseDays: n.dailyVerseDays,
      customReminderDays: n.customReminderDays,
      quranReadingReminder: n.quranReadingReminder,
      quranReadingReminderTime: n.quranReadingReminderTime,
      quranReminderDays: n.quranReminderDays,
      quranReminderSoundType: n.quranReminderSoundType,
      worshipPrayerLogging: n.worshipPrayerLogging,
      worshipDailySummary: n.worshipDailySummary,
      worshipDailySummaryTime: n.worshipDailySummaryTime,
      worshipStreakAlerts: n.worshipStreakAlerts,
      worshipWeeklyReport: n.worshipWeeklyReport,
      worshipWeeklyReportTime: n.worshipWeeklyReportTime ?? '21:00',
      kahfReminder: n.kahfReminder,
      kahfTime: n.kahfTime,
      // Phase 7
      azkarAutoAnchor: n.azkarAutoAnchor === true,
    }, { allowPrompt: true });
    // User-initiated update (toggled a reminder in settings): contextual path —
    // surface the OS permission prompt now if not yet granted.
  }, [settings]);

  // ========================================
  // Admin Notification Defaults Sync
  // ========================================
  useEffect(() => {
    // Sync notification defaults from admin only once after:
    // 1. Settings are loaded (isLoading = false)
    // 2. Initial scheduling is complete (initialSchedulingDone = true)
    // This ordering prevents the race condition where sync would trigger
    // another scheduleNotificationsFromSettings call while the initial one
    // is still running.
    if (!isLoading && initialSchedulingDone && settings.notifications.enabled) {
      // Sync admin defaults: save to settings WITHOUT triggering a full reschedule.
      // A reschedule here would cancelAll → wipe the queue we just built on startup.
      // If the rebuild fails (e.g. prayer API timeout on Xiaomi/MIUI), the result
      // is ZERO notifications. The saved defaults take effect on the next natural
      // reschedule (foreground resume, user settings change, etc.).
      (async () => {
        try {
          const updates = await syncNotificationDefaults({
            notifOverrides: settings.notifications.notifOverrides,
          });
          if (updates) {
            const newSettings = {
              ...settings,
              notifications: { ...settings.notifications, ...updates },
            };
            await saveSettings(newSettings);
            console.log('📝 Admin defaults saved to settings (no reschedule — queue preserved)');
          }
        } catch (e) {
          console.log('Admin notification defaults sync error (non-blocking):', e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, initialSchedulingDone]);

  const updateDisplay = useCallback((display: Partial<DisplaySettings>) => enqueueSettingsUpdate(async () => {
    logWidgetTheme('passed to updateDisplay:', display);
    const touchedWidgetPrefs = WIDGET_DISPLAY_KEYS.some((key) => key in display);
    let widgetPrefsForSave: WidgetDisplayPrefs = {};
    if (touchedWidgetPrefs) {
      try {
        const previous = await readWidgetDisplayPrefs('updateDisplay.before');
        widgetPrefsForSave = {
          ...previous,
          ...pickWidgetDisplayPrefs(display),
        };
        if ('widgetTheme' in display) {
          logWidgetTheme('user selected:', display.widgetTheme);
        }
        await writeWidgetDisplayPrefs(widgetPrefsForSave, 'updateDisplay');
      } catch (e) {
        logWidgetTheme('saved to storage (updateDisplay) failed:', (e as Error)?.message ?? e);
      }
    }
    const newSettings = {
      ...settings,
      display: {
        ...settings.display,
        ...display,
        ...widgetPrefsForSave,
      },
    };
    await saveSettings(newSettings);
  }), [settings]);

  const updatePrayer = useCallback((prayer: Partial<PrayerSettings>) => enqueueSettingsUpdate(async () => {
    // Read freshest persisted state from disk before merging, same pattern as
    // updateNotifications. This prevents a stale closure from overwriting keys
    // like `useFullAdhan` that were changed concurrently (e.g. user enabled full
    // adhan then immediately adjusted a prayer time before the state re-render).
    let baseSettings: AppSettings = settings;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppSettings;
        baseSettings = {
          ...settings,
          ...parsed,
          notifications: { ...settings.notifications, ...(parsed.notifications || {}) },
          display: { ...settings.display, ...(parsed.display || {}) },
          prayer: { ...settings.prayer, ...(parsed.prayer || {}) },
        };
      }
    } catch (e) {
      console.warn('[updatePrayer] freshest-read failed, falling back to closure state:', e);
    }
    const newSettings = {
      ...baseSettings,
      prayer: { ...baseSettings.prayer, ...prayer },
    };
    await saveSettings(newSettings);
    // Sync calculation-relevant fields to @prayer_settings for background consumers (notifications, widgets)
    if ('calculationMethod' in prayer || 'asrJuristic' in prayer || 'adjustments' in prayer) {
      try {
        const { getPrayerSettings: getLocal, savePrayerSettings: saveLocal } = require('@/lib/prayer-times');
        const localSettings = await getLocal();
        if ('calculationMethod' in prayer) localSettings.calculationMethod = prayer.calculationMethod;
        if ('asrJuristic' in prayer) localSettings.asrJuristic = prayer.asrJuristic;
        if ('adjustments' in prayer) localSettings.adjustments = { ...localSettings.adjustments, ...prayer.adjustments };
        await saveLocal(localSettings);
      } catch (e) {
        console.warn('Failed to sync prayer settings:', e);
      }
      // Invalidate any week-cache built with a previous method/school so the next
      // prayer-time fetch re-builds with the new params (root-cause fix for the
      // "display shows 6:46, notifications fire 6:49" bug).
      if ('calculationMethod' in prayer || 'asrJuristic' in prayer || 'adjustments' in prayer) {
        try {
          const { clearAllWeekCaches } = require('@/lib/prayer-week-cache');
          await clearAllWeekCaches();
        } catch (e) {
          console.warn('[updatePrayer] clearAllWeekCaches failed:', e);
        }
        try {
          const { clearPrayerTimeCaches } = require('@/lib/prayer-times');
          await clearPrayerTimeCaches();
        } catch (e) {
          console.warn('[updatePrayer] clearPrayerTimeCaches failed:', e);
        }
      }
      // Force-reschedule notifications so they use the updated prayer times
      try {
        const { forceRescheduleAllFromStorage } = require('@/lib/notifications-manager');
        forceRescheduleAllFromStorage().catch((e: any) =>
          console.warn('[updatePrayer] force-reschedule failed:', e)
        );
      } catch (e) {
        console.warn('[updatePrayer] Could not trigger notification reschedule:', e);
      }
      // Update widget shared data immediately so widgets reflect the new prayer times
      // without waiting for the user to open the prayer tab (which has its own useEffect).
      if ('calculationMethod' in prayer || 'asrJuristic' in prayer || 'adjustments' in prayer) {
        try {
          updateSharedData().catch(() => {});
        } catch {}
      }
    }
  }), [settings]);

  // ========================================
  // دوال عامة
  // ========================================

  const resetSettings = useCallback(async () => {
    await saveSettings({ ...defaultSettings, firstLaunch: false });
    await setI18nLanguage('ar');
  }, []);

  const exportSettings = useCallback(async (): Promise<string> => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback(async (data: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(data);
      const newSettings = { ...defaultSettings, ...parsed, firstLaunch: false };
      await saveSettings(newSettings);
      await setI18nLanguage(newSettings.language);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }, []);

  // ========================================
  // دالة الترجمة
  // ========================================

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    return translate(key, params);
  }, [settings.language, remoteTranslationVersion]); // تتحدث عند تغيير اللغة أو ترجمات الأدمن

  // ========================================
  // القيمة
  // ========================================

  const value: SettingsContextType = {
    settings,
    isLoading,
    isDarkMode,
    isRTL: isRTLMode,
    currentTranslations,
    updateLanguage,
    updateTheme,
    updateThemeAndDisplay,
    updateNotifications,
    updateDisplay,
    updatePrayer,
    resetSettings,
    reloadSettings,
    exportSettings,
    importSettings,
    t,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// ========================================
// Hook الرئيسي
// ========================================

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    // Return safe defaults instead of crashing — this can happen during
    // deep-link cold starts or Expo Go hot reloads before providers mount.
    console.warn('[useSettings] Context not ready — returning defaults');
    const noop = async () => {};
    return {
      settings: defaultSettings,
      isLoading: true,
      isDarkMode: false,
      isRTL: false,
      currentTranslations: translations.ar,
      updateLanguage: noop as any,
      updateTheme: noop as any,
      updateThemeAndDisplay: noop as any,
      updateNotifications: noop as any,
      updateDisplay: noop as any,
      updatePrayer: noop as any,
      resetSettings: noop as any,
      reloadSettings: noop as any,
      exportSettings: (async () => '') as any,
      importSettings: (async () => false) as any,
      t: (key: string) => key,
    };
  }
  return context;
};

// ========================================
// Hooks متخصصة
// ========================================

export const useTheme = () => {
  const { settings, isDarkMode, updateTheme } = useSettings();
  return { theme: settings.theme, isDarkMode, updateTheme };
};

export const useLanguage = () => {
  const { settings, updateLanguage, t, isRTL, currentTranslations } = useSettings();
  return { 
    language: settings.language, 
    updateLanguage, 
    t, 
    isRTL,
    translations: currentTranslations,
    supportedLanguages,
  };
};

export const useTranslation = () => {
  const { t, settings, isRTL } = useSettings();
  return { t, language: settings.language, isRTL };
};

export const useNotificationSettings = () => {
  const { settings, updateNotifications } = useSettings();
  return { notifications: settings.notifications, updateNotifications };
};

export const useDisplaySettings = () => {
  const { settings, updateDisplay } = useSettings();
  return { display: settings.display, updateDisplay };
};

export const usePrayerSettings = () => {
  const { settings, updatePrayer } = useSettings();
  return { prayer: settings.prayer, updatePrayer };
};

export default SettingsContext;
