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
export type CalculationMethod = 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 99;

export type NotificationSoundType = 'default' | 'salawat' | 'istighfar' | 'tasbih' | 'subhanallah' | 'alhamdulillah' | 'general_reminder' | 'silent';

export type ReminderSoundType = 'default' | 'salawat' | 'istighfar' | 'tasbih' | 'subhanallah' | 'alhamdulillah' | 'general_reminder' | 'silent';

export type AdhanSoundType = 'default' | 'makkah' | 'madinah' | 'alaqsa' | 'mishary' | 'abdulbasit' | 'sudais' | 'egypt' | 'dosari' | 'ajman' | 'ali_mulla' | 'naqshbandi' | 'sharif' | 'mansoor_zahrani' | 'haramain' | 'silent';

export interface NotificationSettings {
  enabled: boolean;
  prayerTimes: boolean;
  prayerReminder: boolean;
  prayerReminderMinutes: number;
  reminderMinutes: number;
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
  appBackground: AppBackgroundKey;
  appBackgroundUrl?: string; // For dynamic/remote backgrounds
  appBackgroundTextColor?: 'white' | 'black'; // Text color for dynamic backgrounds
  /** Average color of dynamic photo background for smart contrast */
  dynamicBgColor?: string;
  /** Background image opacity (0.1–0.5, default 0.2) */
  backgroundOpacity: number;
  quranBackground: QuranBackgroundKey;
  quranThemeIndex: number;
  homeLayout: HomeLayout;
  /** Font size adjustment for Mushaf reader (-4 to +8, default 0) */
  quranFontSizeAdjust: number;
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
  dailyVerseTime: '13:00',
  dailyHadith: false,
  khatmaReminder: true,
  sound: true,
  vibration: true,
  soundType: 'default',
  adhanSoundType: 'makkah',
  // Worship tracking notifications
  worshipPrayerLogging: true,
  worshipDailySummary: true,
  worshipDailySummaryTime: '21:30',
  worshipStreakAlerts: true,
  worshipWeeklyReport: true,
  worshipWeeklyReportTime: '21:00',
  worshipQuietHoursEnabled: false,
  worshipQuietHoursStart: '23:00',
  worshipQuietHoursEnd: '06:00',
  // Quran reading reminder
  quranReadingReminder: true,
  quranReadingReminderTime: '15:00',
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
  afterPrayerAzkar: true,
  // Friday Surah Al-Kahf reminder
  kahfReminder: true,
  kahfTime: '07:00',
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
  appBackground: 'background3',
  backgroundOpacity: 1,
  quranBackground: 'quranbg1',
  quranFontSizeAdjust: 0,
  quranThemeIndex: 0,
  quranUseCdnPages: false,
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
};

const defaultPrayer: PrayerSettings = {
  calculationMethod: 4, // أم القرى
  asrJuristic: 0, // شافعي
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

// ========================================
// Notification Defaults Migration
// ========================================
// Bump this version whenever default notification times change.
// On app update, existing users will get their notification times
// reset to the new defaults (toggles/booleans are preserved).
const NOTIFICATION_DEFAULTS_VERSION = 4;
const NOTIF_DEFAULTS_VERSION_KEY = '@notification_defaults_version';

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

  // Calculate isDarkMode based on theme mode
  let isDarkMode: boolean;
  if (settings.theme === 'custom') {
    // Custom theme: default to dark mode, only override to light if we explicitly detect a light background
    const hasLightBg = (hasDynamicPhotoBg || hasBuiltInBg) && !needsWhiteText;
    isDarkMode = !hasLightBg;
  } else {
    // Standard themes: theme directly controls
    isDarkMode = settings.theme === 'system' 
      ? systemTheme === 'dark' 
      : settings.theme === 'dark';
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
    
    return () => subscription.remove();
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
            // Enable newly-defaulted-on categories
            loadedSettings.notifications.istighfarReminder = true;
            loadedSettings.notifications.tasbihReminder = true;
            loadedSettings.notifications.worshipWeeklyReport = true;
            // Persist migrated settings to AsyncStorage so they survive restarts
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadedSettings));
            await AsyncStorage.setItem(NOTIF_DEFAULTS_VERSION_KEY, String(NOTIFICATION_DEFAULTS_VERSION));
            console.log('🔔 Migrated notification defaults to version', NOTIFICATION_DEFAULTS_VERSION);
          }
        } catch (migrationErr) {
          console.warn('⚠️ Notification defaults migration failed:', migrationErr);
        }

        setSettings(loadedSettings);
        
        // Cache theme snapshot for next cold start
        const snapshot: ThemeCacheSnapshot = {
          theme: loadedSettings.theme,
          appBackground: loadedSettings.display.appBackground ?? 'none',
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
          scheduleNotificationsFromSettings({
            enabled: n.enabled,
            prayerTimes: n.prayerTimes,
            prayerReminder: n.prayerReminder,
            reminderMinutes: n.reminderMinutes,
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
            worshipWeeklyReportTime: n.worshipWeeklyReportTime,
            kahfReminder: n.kahfReminder,
            kahfTime: n.kahfTime,
          }).then(() => {
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
  // حفظ الإعدادات
  // ========================================

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      // Cache theme snapshot for next cold start — eliminates theme flash
      const snapshot: ThemeCacheSnapshot = {
        theme: newSettings.theme,
        appBackground: newSettings.display.appBackground ?? 'none',
        appBackgroundTextColor: newSettings.display.appBackgroundTextColor,
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
    // تحديث نظام الترجمة
    await setI18nLanguage(language);
    
    // RTL is handled manually via useIsRTL() hook — do NOT call
    // I18nManager.forceRTL() as it causes double-reversal on Android production builds.
    
    // حفظ الإعدادات
    const newSettings = { ...settings, language };
    await saveSettings(newSettings);
    
    // تحديث بيانات الويدجت باللغة الجديدة
    try { await updateSharedData(); } catch (e) { console.log('Widget data update failed:', e); }

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

  const updateTheme = useCallback(async (theme: ThemeMode) => {
    const newSettings = { ...settings, theme };
    await saveSettings(newSettings);
  }, [settings]);

  const updateThemeAndDisplay = useCallback(async (theme: ThemeMode, display: Partial<DisplaySettings>) => {
    const newSettings = {
      ...settings,
      theme,
      display: { ...settings.display, ...display },
    };
    await saveSettings(newSettings);
  }, [settings]);

  const updateNotifications = useCallback(async (notifications: Partial<NotificationSettings>) => {
    const newSettings = {
      ...settings,
      notifications: { ...settings.notifications, ...notifications },
    };
    await saveSettings(newSettings);

    // If sound-related keys changed, reset Android channels so the new sound takes effect
    const soundKeys = [
      'adhanSoundType', 'soundType', 'azkarSoundType',
      'salawatSoundType', 'tasbihSoundType', 'istighfarSoundType',
      'dailyVerseSoundType', 'customReminderSoundType', 'quranReminderSoundType',
    ] as const;
    const soundChanged = soundKeys.some(k => k in notifications);
    if (soundChanged) {
      const n2 = newSettings.notifications;
      // 'default' adhan → treat as 'makkah' so channels always get a real adhan sound
      const adhan = (n2.adhanSoundType && n2.adhanSoundType !== 'default') ? n2.adhanSoundType : 'makkah';
      const fajr = adhan; // Fajr uses same adhan by default
      const reminder = (n2.soundType && n2.soundType !== 'default') ? n2.soundType : 'general_reminder';
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
      worshipWeeklyReportTime: n.worshipWeeklyReportTime,
      kahfReminder: n.kahfReminder,
      kahfTime: n.kahfTime,
    });
    await AsyncStorage.setItem('@last_notification_reschedule', new Date().toISOString());
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

  const updateDisplay = useCallback(async (display: Partial<DisplaySettings>) => {
    const newSettings = {
      ...settings,
      display: { ...settings.display, ...display },
    };
    await saveSettings(newSettings);
  }, [settings]);

  const updatePrayer = useCallback(async (prayer: Partial<PrayerSettings>) => {
    const newSettings = {
      ...settings,
      prayer: { ...settings.prayer, ...prayer },
    };
    await saveSettings(newSettings);
  }, [settings]);

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
  }, [settings.language]); // تتحدث عند تغيير اللغة

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
