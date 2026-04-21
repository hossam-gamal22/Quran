// contexts/SeasonalContext.tsx
// سياق المحتوى الموسمي - روح المسلم

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SeasonType,
  SeasonInfo,
  SpecialDay,
  SeasonalContent,
  DailySeasonalData,
  getCurrentSeason,
  getUpcomingSeason,
  getCurrentSpecialDay,
  getAllSeasons,
  getSeasonalGreeting,
  getDailySeasonalData,
  getSeasonInfo,
  getSeasonProgress,
  applySeasonsMetadataOverrides,
} from '@/lib/seasonal-content';
import { loadSeasonsMetadata } from '@/lib/content-api';
import { getHijriDate } from '@/lib/hijri-date';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getLanguage } from '@/lib/i18n';
import type { WelcomeBannerConfig } from '@/lib/app-config-api';

const FIRESTORE_TIMEOUT_MS = 8000;

// ========================================
// الأنواع
// ========================================

interface SeasonalProgress {
  seasonType: SeasonType;
  year: number;
  completedDays: number[];
  achievements: string[];
  stats: {
    fastingDays: number;
    prayerCount: number;
    quranPages: number;
    azkarCount: number;
    duaCount: number;
  };
}

interface SeasonalNotification {
  id: string;
  seasonType: SeasonType;
  day: number;
  title: string;
  body: string;
  scheduledTime: string;
  enabled: boolean;
}

interface SeasonalSettings {
  enableSeasonalTheme: boolean;
  enableSeasonalNotifications: boolean;
  enableSpecialDayReminders: boolean;
  enableSeasonalContent: boolean;
  preferredContentTypes: ('dua' | 'zikr' | 'article' | 'tip' | 'hadith' | 'verse')[];
}

interface SeasonalContextType {
  // الحالة
  isLoading: boolean;
  currentSeason: SeasonInfo | null;
  upcomingSeason: (SeasonInfo & { daysUntil: number }) | null;
  specialDay: SpecialDay | null;
  dailyData: DailySeasonalData;
  allSeasons: SeasonInfo[];
  
  // التقدم
  seasonalProgress: SeasonalProgress | null;
  
  // الإعدادات
  settings: SeasonalSettings;
  
  // المحتوى
  seasonalContent: SeasonalContent[];
  featuredContent: SeasonalContent | null;
  
  // بانر المحتوى الموسمي من الأدمن
  adminBanner: WelcomeBannerConfig | null;
  
  // الدوال
  refreshSeasonalData: () => Promise<void>;
  markDayCompleted: (day: number) => Promise<void>;
  updateProgress: (stats: Partial<SeasonalProgress['stats']>) => Promise<void>;
  updateSettings: (newSettings: Partial<SeasonalSettings>) => Promise<void>;
  getContentForDay: (day: number) => SeasonalContent[];
  getSeasonById: (seasonType: SeasonType) => SeasonInfo | null;
  addAchievement: (achievement: string) => Promise<void>;
  resetSeasonProgress: () => Promise<void>;
}

// ========================================
// القيم الافتراضية
// ========================================

const defaultSettings: SeasonalSettings = {
  enableSeasonalTheme: true,
  enableSeasonalNotifications: true,
  enableSpecialDayReminders: true,
  enableSeasonalContent: true,
  preferredContentTypes: ['dua', 'zikr', 'hadith', 'verse', 'tip', 'article'],
};

const defaultProgress: SeasonalProgress = {
  seasonType: 'none',
  year: new Date().getFullYear(),
  completedDays: [],
  achievements: [],
  stats: {
    fastingDays: 0,
    prayerCount: 0,
    quranPages: 0,
    azkarCount: 0,
    duaCount: 0,
  },
};

async function getDocsWithTimeout<T>(promise: Promise<T>, timeoutMs = FIRESTORE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`seasonal-firestore-timeout-${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// ========================================
// مفاتيح التخزين
// ========================================

const STORAGE_KEYS = {
  SETTINGS: 'seasonal_settings',
  PROGRESS: 'seasonal_progress',
  CONTENT_CACHE: 'seasonal_content_cache',
  LAST_UPDATE: 'seasonal_last_update',
};

// ========================================
// السياق
// ========================================

const SeasonalContext = createContext<SeasonalContextType | undefined>(undefined);

// ========================================
// المزود
// ========================================

interface SeasonalProviderProps {
  children: ReactNode;
}

export const SeasonalProvider: React.FC<SeasonalProviderProps> = ({ children }) => {
  // الحالة
  const [isLoading, setIsLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState<SeasonInfo | null>(null);
  const [upcomingSeason, setUpcomingSeason] = useState<(SeasonInfo & { daysUntil: number }) | null>(null);
  const [specialDay, setSpecialDay] = useState<SpecialDay | null>(null);
  const [dailyData, setDailyData] = useState<DailySeasonalData>({
    season: null,
    content: [],
    specialDay: null,
    greeting: '',
  });
  const [allSeasons, setAllSeasons] = useState<SeasonInfo[]>([]);
  const [seasonalProgress, setSeasonalProgress] = useState<SeasonalProgress | null>(null);
  const [settings, setSettings] = useState<SeasonalSettings>(defaultSettings);
  const [seasonalContent, setSeasonalContent] = useState<SeasonalContent[]>([]);
  const [featuredContent, setFeaturedContent] = useState<SeasonalContent | null>(null);
  const [adminBanner, setAdminBanner] = useState<WelcomeBannerConfig | null>(null);

  // ========================================
  // تحميل البيانات
  // ========================================

  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error loading seasonal settings:', error);
    }
  }, []);

  const loadProgress = useCallback(async (seasonType: SeasonType) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (stored) {
        const progress: SeasonalProgress = JSON.parse(stored);
        const hijriDate = getHijriDate();
        
        // التحقق من أن التقدم للموسم الحالي والسنة الحالية
        if (progress.seasonType === seasonType && progress.year === hijriDate.year) {
          setSeasonalProgress(progress);
        } else {
          // إنشاء تقدم جديد للموسم الجديد
          const newProgress: SeasonalProgress = {
            ...defaultProgress,
            seasonType,
            year: hijriDate.year,
          };
          setSeasonalProgress(newProgress);
          await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(newProgress));
        }
      } else {
        const newProgress: SeasonalProgress = {
          ...defaultProgress,
          seasonType,
          year: getHijriDate().year,
        };
        setSeasonalProgress(newProgress);
      }
    } catch (error) {
      console.error('Error loading seasonal progress:', error);
    }
  }, []);

  const loadSeasonalContent = useCallback(async (seasonType: SeasonType) => {
    try {
      // جلب المحتوى من Firestore (ما يكتبه الأدمن)
      const lang = getLanguage() || 'ar';
      const q = query(
        collection(db, 'seasonalContent'),
        where('isActive', '==', true),
        orderBy('priority', 'asc')
      );
      const snapshot = await getDocsWithTimeout(getDocs(q));
      
      const firestoreContent: SeasonalContent[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // تصفية حسب نوع الموسم (أو سماح بالمحتوى المخصص)
        if (data.seasonType === seasonType || data.seasonType === 'custom') {
          firestoreContent.push({
            id: doc.id,
            seasonType: data.seasonType as SeasonType,
            title: lang === 'ar' ? (data.titleAr || data.titleEn || '') : (data.titleEn || data.titleAr || ''),
            content: lang === 'ar' ? (data.contentAr || data.contentEn || '') : (data.contentEn || data.contentAr || ''),
            type: mapContentType(data.contentType || 'reminder'),
            day: data.day,
            priority: data.priority || 999,
          });
        }
      });

      // استخدام المحتوى من Firestore، مع fallback للمحتوى المحلي إذا لم يوجد محتوى
      const content = firestoreContent.length > 0
        ? firestoreContent
        : generateLocalFallbackContent(seasonType);
      
      setSeasonalContent(content);
      
      // اختيار محتوى مميز عشوائي
      if (content.length > 0) {
        const featured = content[Math.floor(Math.random() * content.length)];
        setFeaturedContent(featured);
      }
    } catch (error) {
      console.error('Error loading seasonal content:', error);
    }
  }, []);

  // ========================================
  // جلب بانر المحتوى الموسمي من الأدمن
  // ========================================

  const loadAdminBanners = useCallback(async () => {
    try {
      const lang = getLanguage() || 'ar';
      const q = query(
        collection(db, 'seasonalContent'),
        where('isActive', '==', true),
        orderBy('priority', 'asc')
      );
      const snapshot = await getDocsWithTimeout(getDocs(q));
      if (snapshot.empty) {
        setAdminBanner(null);
        return;
      }

      const now = new Date();
      const hijri = getHijriDate(now);
      const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri

      // خريطة المواسم حسب التاريخ الهجري
      const seasonHijriRanges: Record<string, { month: number; startDay: number; endDay: number }> = {
        ramadan:   { month: 9,  startDay: 1,  endDay: 30 },
        eid_fitr:  { month: 10, startDay: 1,  endDay: 3 },
        eid_adha:  { month: 12, startDay: 10, endDay: 13 },
        hajj:      { month: 12, startDay: 8,  endDay: 13 },
        mawlid:    { month: 3,  startDay: 12, endDay: 12 },
        ashura:    { month: 1,  startDay: 9,  endDay: 10 },
        isra_miraj:{ month: 7,  startDay: 27, endDay: 27 },
      };

      // تحقق هل المحتوى يطابق اليوم
      const isActiveToday = (data: any): boolean => {
        const type = data.seasonType;

        // يوم الجمعة
        if (type === 'friday') return dayOfWeek === 5;

        // مواسم هجرية ثابتة
        const range = seasonHijriRanges[type];
        if (range) {
          return hijri.month === range.month && hijri.day >= range.startDay && hijri.day <= range.endDay;
        }

        // محتوى مخصص — تحقق من نطاق التاريخ
        if (type === 'custom' && data.startDate && data.endDate) {
          if (data.isHijriDate) {
            const [startM, startD] = data.startDate.split('-').map(Number);
            const [endM, endD] = data.endDate.split('-').map(Number);
            if (startM && startD && endM && endD) {
              const hijriDayOfYear = (hijri.month - 1) * 30 + hijri.day;
              const startDayOfYear = (startM - 1) * 30 + startD;
              const endDayOfYear = (endM - 1) * 30 + endD;
              return hijriDayOfYear >= startDayOfYear && hijriDayOfYear <= endDayOfYear;
            }
          } else {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return now >= start && now <= end;
            }
          }
        }

        return false;
      };

      // Route map for season types
      const seasonRoutes: Record<string, string> = {
        ramadan: '/seasonal/ramadan',
        hajj: '/seasonal/hajj',
        eid_fitr: '/seasonal/ramadan',
        eid_adha: '/seasonal/hajj',
        mawlid: '/seasonal/mawlid',
        ashura: '/seasonal/ashura',
        isra_miraj: '/seasonal/ashura',
        friday: '/(tabs)',
        custom: '/(tabs)',
      };

      // البحث عن أول محتوى يطابق اليوم (مرتب حسب الأولوية)
      let bestMatch: WelcomeBannerConfig | null = null;
      snapshot.forEach(doc => {
        if (bestMatch) return; // خذ أول مطابقة فقط (أعلى أولوية)
        const data = doc.data();
        if (isActiveToday(data)) {
          // استخدام الترجمات المحفوظة أولاً، ثم العربي/الإنجليزي كـ fallback
          const translations = data.translations || {};
          const title = translations[`title_${lang}`]
            || (lang === 'ar' ? data.titleAr : data.titleEn)
            || data.titleAr || data.titleEn || '';
          const subtitle = translations[`content_${lang}`]
            || (lang === 'ar' ? data.contentAr : data.contentEn)
            || data.contentAr || data.contentEn || '';
          bestMatch = {
            enabled: true,
            title,
            subtitle,
            icon: data.icon || 'moon-waning-crescent',
            color: data.backgroundColor || '#1a1a2e',
            route: data.targetScreen ? `/${data.targetScreen}` : (seasonRoutes[data.seasonType] || '/(tabs)'),
            displayMode: data.backgroundImage ? 'text_image' : 'text',
            backgroundImage: data.backgroundImage,
          };
        }
      });

      setAdminBanner(bestMatch);
    } catch (error) {
      // Silently handle — missing admin banners is expected when no seasonal content is configured
      console.warn('Admin banners not available:', (error as any)?.code || error);
      setAdminBanner(null);
    }
  }, []);

  // ========================================
  // تحديث البيانات الموسمية
  // ========================================

  const refreshSeasonalData = useCallback(async () => {
    setIsLoading(true);
    try {
      // تحميل الإعدادات
      await loadSettings();

      // Apply CMS metadata overrides before reading seasons
      try {
        const meta = await loadSeasonsMetadata();
        if (meta?.seasons) {
          applySeasonsMetadataOverrides(meta.seasons);
        }
      } catch { /* CMS unavailable — use defaults */ }

      // الحصول على الموسم الحالي
      const season = getCurrentSeason();
      setCurrentSeason(season);

      // الحصول على الموسم القادم
      const upcoming = getUpcomingSeason();
      setUpcomingSeason(upcoming);

      // الحصول على اليوم المميز
      const special = getCurrentSpecialDay(season);
      setSpecialDay(special);

      // الحصول على البيانات اليومية
      const daily = getDailySeasonalData();
      setDailyData(daily);

      // الحصول على جميع المواسم
      const seasons = getAllSeasons();
      setAllSeasons(seasons);

      // تحميل التقدم إذا كان هناك موسم نشط
      if (season) {
        await loadProgress(season.type);
        await loadSeasonalContent(season.type);
      } else {
        setSeasonalProgress(null);
        setSeasonalContent([]);
        setFeaturedContent(null);
      }

      // جلب بانرات الأدمن (دائماً — حتى لو لا يوجد موسم تقويمي)
      await loadAdminBanners();
    } catch (error) {
      console.error('Error refreshing seasonal data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadSettings, loadProgress, loadSeasonalContent, loadAdminBanners]);

  // ========================================
  // إدارة التقدم
  // ========================================

  const markDayCompleted = useCallback(async (day: number) => {
    if (!seasonalProgress || !currentSeason) return;

    try {
      const updatedProgress: SeasonalProgress = {
        ...seasonalProgress,
        completedDays: [...new Set([...seasonalProgress.completedDays, day])].sort((a, b) => a - b),
      };

      // التحقق من الإنجازات
      const newAchievements = checkAchievements(updatedProgress, currentSeason);
      if (newAchievements.length > 0) {
        updatedProgress.achievements = [...new Set([...updatedProgress.achievements, ...newAchievements])];
      }

      setSeasonalProgress(updatedProgress);
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updatedProgress));
    } catch (error) {
      console.error('Error marking day completed:', error);
    }
  }, [seasonalProgress, currentSeason]);

  const updateProgress = useCallback(async (stats: Partial<SeasonalProgress['stats']>) => {
    if (!seasonalProgress) return;

    try {
      const updatedProgress: SeasonalProgress = {
        ...seasonalProgress,
        stats: {
          ...seasonalProgress.stats,
          ...stats,
        },
      };

      setSeasonalProgress(updatedProgress);
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updatedProgress));
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }, [seasonalProgress]);

  const addAchievement = useCallback(async (achievement: string) => {
    if (!seasonalProgress) return;

    try {
      if (seasonalProgress.achievements.includes(achievement)) return;

      const updatedProgress: SeasonalProgress = {
        ...seasonalProgress,
        achievements: [...seasonalProgress.achievements, achievement],
      };

      setSeasonalProgress(updatedProgress);
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updatedProgress));
    } catch (error) {
      console.error('Error adding achievement:', error);
    }
  }, [seasonalProgress]);

  const resetSeasonProgress = useCallback(async () => {
    if (!currentSeason) return;

    try {
      const newProgress: SeasonalProgress = {
        ...defaultProgress,
        seasonType: currentSeason.type,
        year: getHijriDate().year,
      };

      setSeasonalProgress(newProgress);
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(newProgress));
    } catch (error) {
      console.error('Error resetting progress:', error);
    }
  }, [currentSeason]);

  // ========================================
  // مزامنة أيقونة التطبيق مع الموسم النشط
  // ========================================
  useEffect(() => {
    if (isLoading) return;
    (async () => {
      try {
        const { syncAppIconOnStartup } = await import('@/lib/app-icon-manager');
        await syncAppIconOnStartup(getLanguage() as any, currentSeason?.type ?? null);
      } catch (e) {
        if (__DEV__) console.log('Seasonal icon sync skipped:', e);
      }
    })();
  }, [currentSeason?.type, isLoading]);

  // ========================================
  // إدارة الإعدادات
  // ========================================

  const updateSettings = useCallback(async (newSettings: Partial<SeasonalSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [settings]);

  // ========================================
  // دوال المحتوى
  // ========================================

  const getContentForDay = useCallback((day: number): SeasonalContent[] => {
    return seasonalContent.filter(content => content.day === day || content.day === undefined);
  }, [seasonalContent]);

  const getSeasonById = useCallback((seasonType: SeasonType): SeasonInfo | null => {
    return getSeasonInfo(seasonType);
  }, []);

  // ========================================
  // التأثيرات
  // ========================================

  useEffect(() => {
    refreshSeasonalData();
  }, []);

  // تحديث يومي
  useEffect(() => {
    const checkForNewDay = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        refreshSeasonalData();
      }
    }, 60000); // كل دقيقة

    return () => clearInterval(checkForNewDay);
  }, [refreshSeasonalData]);

  // ========================================
  // القيمة
  // ========================================

  const value: SeasonalContextType = {
    isLoading,
    currentSeason,
    upcomingSeason,
    specialDay,
    dailyData,
    allSeasons,
    seasonalProgress,
    settings,
    seasonalContent,
    featuredContent,
    adminBanner,
    refreshSeasonalData,
    markDayCompleted,
    updateProgress,
    updateSettings,
    getContentForDay,
    getSeasonById,
    addAchievement,
    resetSeasonProgress,
  };

  return (
    <SeasonalContext.Provider value={value}>
      {children}
    </SeasonalContext.Provider>
  );
};

// ========================================
// الـ Hooks
// ========================================

export const useSeasonal = (): SeasonalContextType => {
  const context = useContext(SeasonalContext);
  if (!context) {
    throw new Error('useSeasonal must be used within a SeasonalProvider');
  }
  return context;
};

export const useCurrentSeason = () => {
  const { currentSeason, isLoading } = useSeasonal();
  return { currentSeason, isLoading };
};

export const useSeasonalProgress = () => {
  const { seasonalProgress, markDayCompleted, updateProgress, resetSeasonProgress } = useSeasonal();
  return { seasonalProgress, markDayCompleted, updateProgress, resetSeasonProgress };
};

export const useSeasonalContent = () => {
  const { seasonalContent, featuredContent, getContentForDay } = useSeasonal();
  return { seasonalContent, featuredContent, getContentForDay };
};

export const useSeasonalSettings = () => {
  const { settings, updateSettings } = useSeasonal();
  return { settings, updateSettings };
};

// ========================================
// دوال مساعدة
// ========================================

/**
 * التحقق من الإنجازات
 */
const checkAchievements = (progress: SeasonalProgress, season: SeasonInfo): string[] => {
  const achievements: string[] = [];

  // إنجازات عامة
  if (progress.completedDays.length === 1) {
    achievements.push('first_day');
  }
  if (progress.completedDays.length === 7) {
    achievements.push('one_week');
  }
  if (progress.completedDays.length === season.totalDays) {
    achievements.push('complete_season');
  }

  // إنجازات رمضان
  if (season.type === 'ramadan') {
    if (progress.stats.fastingDays >= 30) {
      achievements.push('ramadan_complete_fasting');
    }
    if (progress.stats.quranPages >= 604) {
      achievements.push('ramadan_khatma');
    }
    if (progress.completedDays.includes(27)) {
      achievements.push('laylat_qadr');
    }
  }

  // إنجازات ذي الحجة
  if (season.type === 'dhul_hijjah') {
    if (progress.completedDays.includes(9)) {
      achievements.push('arafah_fasted');
    }
  }

  return achievements;
};

/**
 * تحويل نوع المحتوى من صيغة الأدمن إلى صيغة التطبيق
 */
const mapContentType = (adminType: string): SeasonalContent['type'] => {
  const mapping: Record<string, SeasonalContent['type']> = {
    greeting: 'tip',
    azkar: 'zikr',
    dua: 'dua',
    reminder: 'tip',
    challenge: 'tip',
    fact: 'article',
    quote: 'hadith',
  };
  return mapping[adminType] || 'tip';
};

/**
 * محتوى احتياطي محلي (يُستخدم فقط عند عدم وجود محتوى في Firestore)
 */
const generateLocalFallbackContent = (seasonType: SeasonType): SeasonalContent[] => {
  const content: SeasonalContent[] = [];

  if (seasonType === 'ramadan') {
    content.push(
      {
        id: 'ramadan_dua_1',
        seasonType: 'ramadan',
        title: 'دعاء الإفطار',
        content: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
        type: 'dua',
        priority: 1,
      },
      {
        id: 'ramadan_dua_2',
        seasonType: 'ramadan',
        title: 'دعاء ليلة القدر',
        content: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
        type: 'dua',
        day: 27,
        priority: 1,
      }
    );
  } else if (seasonType === 'dhul_hijjah') {
    content.push(
      {
        id: 'dhul_hijjah_dua_1',
        seasonType: 'dhul_hijjah',
        title: 'دعاء يوم عرفة',
        content: 'لا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        type: 'dua',
        day: 9,
        priority: 1,
      }
    );
  } else if (seasonType === 'ashura') {
    content.push(
      {
        id: 'ashura_hadith_1',
        seasonType: 'ashura',
        title: 'فضل صيام عاشوراء',
        content: 'صِيَامُ يَوْمِ عَاشُورَاءَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ',
        type: 'hadith',
        priority: 1,
      }
    );
  }

  return content;
};

export default SeasonalContext;
