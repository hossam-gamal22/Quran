// contexts/SettingsContext.tsx
// سياق الإعدادات - روح المسلم

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import * as Notifications from 'expo-notifications';

// ========================================
// الأنواع
// ========================================

export type Language = 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type CalculationMethod = 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 99;

export interface NotificationSettings {
  enabled: boolean;
  prayerReminder: boolean;
  prayerReminderMinutes: number;
  fajrSpecial: boolean;
  azkarMorning: boolean;
  azkarMorningTime: string;
  azkarEvening: boolean;
  azkarEveningTime: string;
  dailyVerse: boolean;
  dailyVerseTime: string;
  khatmaReminder: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface DisplaySettings {
  fontSize: FontSize;
  arabicFontSize: number;
  translationFontSize: number;
  showTashkeel: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  highlightTajweed: boolean;
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
  
  // دوال مساعدة
  t: (key: string) => string;
}

// ========================================
// القيم الافتراضية
// ========================================

const defaultNotifications: NotificationSettings = {
  enabled: true,
  prayerReminder: true,
  prayerReminderMinutes: 10,
  fajrSpecial: true,
  azkarMorning: true,
  azkarMorningTime: '06:00',
  azkarEvening: true,
  azkarEveningTime: '18:00',
  dailyVerse: true,
  dailyVerseTime: '08:00',
  khatmaReminder: true,
  sound: true,
  vibration: true,
};

const defaultDisplay: DisplaySettings = {
  fontSize: 'medium',
  arabicFontSize: 24,
  translationFontSize: 16,
  showTashkeel: true,
  showTranslation: true,
  showTransliteration: false,
  highlightTajweed: true,
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
};

const defaultSettings: AppSettings = {
  language: 'ar',
  theme: 'system',
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
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
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
    const newSettings = { ...settings, language };
    await saveSettings(newSettings);
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
    
    // تحديث إعدادات الإشعارات الفعلية
    if (notifications.enabled === false) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
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
  }, []);

  const exportSettings = useCallback(async (): Promise<string> => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback(async (data: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(data);
      const newSettings = { ...defaultSettings, ...parsed, firstLaunch: false };
      await saveSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }, []);

  // ========================================
  // دالة الترجمة المختصرة
  // ========================================

  const t = useCallback((key: string): string => {
    // يمكن ربطها بنظام الترجمات الموجود
    return key;
  }, []);

  // ========================================
  // القيمة
  // ========================================

  const value: SettingsContextType = {
    settings,
    isLoading,
    isDarkMode,
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
// Hook
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
  const { settings, updateLanguage, t } = useSettings();
  return { language: settings.language, updateLanguage, t };
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
