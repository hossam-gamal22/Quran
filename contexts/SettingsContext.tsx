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
import { Appearance, ColorSchemeName, I18nManager, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { scheduleNotificationsFromSettings } from '@/lib/notifications-manager';
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

// ========================================
// الأنواع
// ========================================

export type { Language } from '@/constants/translations';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type CalculationMethod = 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 99;

export type NotificationSoundType = 'default' | 'asbahna' | 'amsayna' | 'subhanallah' | 'alhamdulillah' | 'allahuakbar' | 'silent';

export type AdhanSoundType = 'default' | 'makkah' | 'madinah' | 'alaqsa' | 'mishary' | 'abdulbasit' | 'silent';

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
}

export type AppBackgroundKey = 'none' | 'background1' | 'background2' | 'background3' | 'background4' | 'background5' | 'background6' | 'background7' | 'dynamic';
export type QuranBackgroundKey = 'quranbg1' | 'quranbg2' | 'quranbg3' | 'quranbg4';

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
  updateNotifications: (notifications: Partial<NotificationSettings>) => Promise<void>;
  updateDisplay: (display: Partial<DisplaySettings>) => Promise<void>;
  updatePrayer: (prayer: Partial<PrayerSettings>) => Promise<void>;
  
  // دوال عامة
  resetSettings: () => Promise<void>;
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
  prayerReminder: true,
  prayerReminderMinutes: 10,
  reminderMinutes: 10,
  fajrSpecial: true,
  azkarMorning: true,
  azkarMorningTime: '06:00',
  azkarEvening: true,
  azkarEveningTime: '18:00',
  morningAzkar: true,
  morningAzkarTime: '06:00',
  eveningAzkar: true,
  eveningAzkarTime: '18:00',
  dailyVerse: true,
  dailyVerseTime: '08:00',
  dailyHadith: false,
  khatmaReminder: true,
  sound: true,
  vibration: true,
  soundType: 'default',
  adhanSoundType: 'default',
  // Worship tracking notifications
  worshipPrayerLogging: true,
  worshipDailySummary: false,
  worshipDailySummaryTime: '22:00',
  worshipStreakAlerts: true,
  worshipWeeklyReport: false,
  worshipQuietHoursEnabled: false,
  worshipQuietHoursStart: '23:00',
  worshipQuietHoursEnd: '06:00',
  // Quran reading reminder
  quranReadingReminder: false,
  quranReadingReminderTime: '20:00',
  quranReminderDays: [0, 1, 2, 3, 4, 5, 6],
  quranReminder24Hour: true,
  quranReminderSoundType: 'default',
  // Salawat, Istighfar, Tasbih reminders
  salawatReminder: false,
  salawatReminderTime: '09:00',
  istighfarReminder: false,
  istighfarReminderTime: '12:00',
  tasbihReminder: false,
  tasbihReminderTime: '15:00',
  // Additional Adhkar reminders
  sleepAzkar: false,
  sleepAzkarTime: '22:00',
  wakeupAzkar: false,
  wakeupAzkarTime: '05:30',
  afterPrayerAzkar: false,
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
  appBackground: 'none',
  quranBackground: 'quranbg1',
  quranFontSizeAdjust: 0,
  quranThemeIndex: 0,
  quranUseCdnPages: false,
  homeLayout: 'grid',
  showTafsir: false,
  focusMode: false,
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
  layout: 'list',
};

const defaultSettings: AppSettings = {
  language: 'ar',
  theme: 'dark',
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
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // حساب الوضع الداكن
  const isDarkMode = settings.theme === 'system' 
    ? systemTheme === 'dark' 
    : settings.theme === 'dark';

  // حساب اتجاه اللغة
  const isRTLMode = isRTL(settings.language);

  // الترجمات الحالية
  const currentTranslations = translations[settings.language] || translations['ar'];

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
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedSettings = { ...defaultSettings, ...parsed };
        setSettings(loadedSettings);
        
        // تحديث اللغة في نظام الترجمة
        await setI18nLanguage(loadedSettings.language);
        
        // تحديث اتجاه النص
        const shouldBeRTL = isRTL(loadedSettings.language);
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
        }

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
            wakeupAzkarTime: n.wakeupAzkarTime ?? '05:30',
            afterPrayerAzkar: n.afterPrayerAzkar ?? false,
            dailyVerse: n.dailyVerse,
            dailyVerseTime: n.dailyVerseTime,
            sound: n.sound,
          }).catch((e) => console.log('Init notification scheduling error (non-blocking):', e));
        }
      } else {
        // أول تشغيل - محاولة تحديد اللغة من الجهاز
        await setI18nLanguage('ar');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // حفظ الإعدادات
  // ========================================

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
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
    
    // تحديث اتجاه النص
    const shouldBeRTL = isRTL(language);
    const needsRestart = I18nManager.isRTL !== shouldBeRTL;
    
    if (needsRestart) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
    
    // حفظ الإعدادات
    const newSettings = { ...settings, language };
    await saveSettings(newSettings);
    
    // إعادة تحميل التطبيق إذا تغير الاتجاه
    if (needsRestart) {
      try {
        await Updates.reloadAsync();
      } catch (e) {
        Alert.alert(
          'يلزم إعادة التشغيل',
          'يرجى إعادة تشغيل التطبيق لتطبيق اتجاه النص الجديد.',
          [{ text: 'حسناً' }]
        );
      }
    }
  }, [settings]);

  const updateTheme = useCallback(async (theme: ThemeMode) => {
    const newSettings = { ...settings, theme };
    await saveSettings(newSettings);
  }, [settings]);

  const updateNotifications = useCallback(async (notifications: Partial<NotificationSettings>) => {
    const newSettings = {
      ...settings,
      notifications: { ...settings.notifications, ...notifications },
    };
    await saveSettings(newSettings);
    
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
    });
  }, [settings]);

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
    updateNotifications,
    updateDisplay,
    updatePrayer,
    resetSettings,
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
    throw new Error('useSettings must be used within a SettingsProvider');
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
