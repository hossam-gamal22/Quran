// lib/analytics.ts
// نظام التحليلات وتتبع الاستخدام - روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ========================================
// الأنواع
// ========================================

export type EventCategory = 
  | 'navigation'
  | 'azkar'
  | 'quran'
  | 'prayer'
  | 'worship'
  | 'seasonal'
  | 'settings'
  | 'widget'
  | 'notification'
  | 'error';

export type EventAction = 
  | 'view'
  | 'click'
  | 'complete'
  | 'share'
  | 'copy'
  | 'save'
  | 'play'
  | 'pause'
  | 'toggle'
  | 'error';

export interface AnalyticsEvent {
  id: string;
  category: EventCategory;
  action: EventAction;
  label?: string;
  value?: number;
  timestamp: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: string;
  startTime: string;
  endTime?: string;
  platform: string;
  appVersion: string;
  events: number;
  screens: string[];
}

export interface AnalyticsData {
  totalEvents: number;
  totalSessions: number;
  events: AnalyticsEvent[];
  sessions: UserSession[];
  lastSync?: string;
}

export interface UsageStats {
  azkarCompleted: number;
  quranPagesRead: number;
  prayersTracked: number;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
  favoriteAzkar: string[];
  totalTimeSpent: number; // بالدقائق
}

// ========================================
// الثوابت
// ========================================

const STORAGE_KEYS = {
  ANALYTICS_DATA: 'analytics_data',
  USAGE_STATS: 'usage_stats',
  CURRENT_SESSION: 'current_session',
  LAST_ACTIVE_DATE: 'last_active_date',
};

const MAX_STORED_EVENTS = 500;
const MAX_STORED_SESSIONS = 50;
const APP_VERSION = '1.0.0';

// ========================================
// متغيرات الجلسة
// ========================================

let currentSession: UserSession | null = null;
let analyticsEnabled = true;

// ========================================
// دوال مساعدة
// ========================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

const getTodayDate = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// ========================================
// إدارة الجلسات
// ========================================

export const startSession = async (): Promise<UserSession> => {
  const session: UserSession = {
    id: generateId(),
    startTime: getCurrentTimestamp(),
    platform: Platform.OS,
    appVersion: APP_VERSION,
    events: 0,
    screens: [],
  };
  
  currentSession = session;
  
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    await updateDailyActivity();
  } catch (error) {
    console.error('Error starting session:', error);
  }
  
  return session;
};

export const endSession = async (): Promise<void> => {
  if (!currentSession) return;
  
  currentSession.endTime = getCurrentTimestamp();
  
  try {
    // حفظ الجلسة في السجل
    const data = await getAnalyticsData();
    data.sessions.unshift(currentSession);
    data.totalSessions++;
    
    // الحفاظ على الحد الأقصى
    if (data.sessions.length > MAX_STORED_SESSIONS) {
      data.sessions = data.sessions.slice(0, MAX_STORED_SESSIONS);
    }
    
    await saveAnalyticsData(data);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  } catch (error) {
    console.error('Error ending session:', error);
  }
  
  currentSession = null;
};

export const getCurrentSession = (): UserSession | null => {
  return currentSession;
};

// ========================================
// تسجيل الأحداث
// ========================================

export const trackEvent = async (
  category: EventCategory,
  action: EventAction,
  label?: string,
  value?: number,
  metadata?: Record<string, any>
): Promise<void> => {
  if (!analyticsEnabled) return;
  
  // بدء جلسة إذا لم تكن موجودة
  if (!currentSession) {
    await startSession();
  }
  
  const event: AnalyticsEvent = {
    id: generateId(),
    category,
    action,
    label,
    value,
    timestamp: getCurrentTimestamp(),
    sessionId: currentSession!.id,
    metadata,
  };
  
  try {
    const data = await getAnalyticsData();
    data.events.unshift(event);
    data.totalEvents++;
    
    // الحفاظ على الحد الأقصى
    if (data.events.length > MAX_STORED_EVENTS) {
      data.events = data.events.slice(0, MAX_STORED_EVENTS);
    }
    
    // تحديث عداد أحداث الجلسة
    if (currentSession) {
      currentSession.events++;
    }
    
    await saveAnalyticsData(data);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

// ========================================
// أحداث محددة مسبقاً
// ========================================

export const trackScreenView = async (screenName: string): Promise<void> => {
  if (currentSession && !currentSession.screens.includes(screenName)) {
    currentSession.screens.push(screenName);
  }
  await trackEvent('navigation', 'view', screenName);
};

export const trackAzkarComplete = async (
  azkarId: string,
  azkarName: string,
  count: number
): Promise<void> => {
  await trackEvent('azkar', 'complete', azkarName, count, { azkarId });
  await updateUsageStats({ azkarCompleted: 1 });
};

export const trackQuranReading = async (
  surahId: number,
  surahName: string,
  pagesRead: number
): Promise<void> => {
  await trackEvent('quran', 'view', surahName, pagesRead, { surahId });
  await updateUsageStats({ quranPagesRead: pagesRead });
};

export const trackPrayerLogged = async (
  prayerName: string,
  prayerType: string
): Promise<void> => {
  await trackEvent('prayer', 'complete', prayerName, 1, { prayerType });
  await updateUsageStats({ prayersTracked: 1 });
};

export const trackShare = async (contentType: string, contentId: string): Promise<void> => {
  await trackEvent('azkar', 'share', contentType, 1, { contentId });
};

export const trackError = async (
  errorType: string,
  errorMessage: string,
  stackTrace?: string
): Promise<void> => {
  await trackEvent('error', 'error', errorType, 1, {
    message: errorMessage,
    stack: stackTrace,
  });
};

// ========================================
// إحصائيات الاستخدام
// ========================================

export const getUsageStats = async (): Promise<UsageStats> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_STATS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting usage stats:', error);
  }
  
  return {
    azkarCompleted: 0,
    quranPagesRead: 0,
    prayersTracked: 0,
    daysActive: 0,
    currentStreak: 0,
    longestStreak: 0,
    favoriteAzkar: [],
    totalTimeSpent: 0,
  };
};

export const updateUsageStats = async (
  updates: Partial<UsageStats>
): Promise<void> => {
  try {
    const stats = await getUsageStats();
    
    // تحديث القيم العددية
    if (updates.azkarCompleted) {
      stats.azkarCompleted += updates.azkarCompleted;
    }
    if (updates.quranPagesRead) {
      stats.quranPagesRead += updates.quranPagesRead;
    }
    if (updates.prayersTracked) {
      stats.prayersTracked += updates.prayersTracked;
    }
    if (updates.totalTimeSpent) {
      stats.totalTimeSpent += updates.totalTimeSpent;
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.USAGE_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error updating usage stats:', error);
  }
};

// ========================================
// النشاط اليومي والـ Streaks
// ========================================

const updateDailyActivity = async (): Promise<void> => {
  try {
    const today = getTodayDate();
    const lastActiveDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE);
    const stats = await getUsageStats();
    
    if (lastActiveDate !== today) {
      // يوم جديد
      stats.daysActive++;
      
      // حساب الـ streak
      if (lastActiveDate) {
        const lastDate = new Date(lastActiveDate);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // استمرارية
          stats.currentStreak++;
        } else {
          // انقطاع
          stats.currentStreak = 1;
        }
      } else {
        stats.currentStreak = 1;
      }
      
      // تحديث أطول streak
      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
      await AsyncStorage.setItem(STORAGE_KEYS.USAGE_STATS, JSON.stringify(stats));
    }
  } catch (error) {
    console.error('Error updating daily activity:', error);
  }
};

// ========================================
// إدارة البيانات
// ========================================

const getAnalyticsData = async (): Promise<AnalyticsData> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_DATA);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting analytics data:', error);
  }
  
  return {
    totalEvents: 0,
    totalSessions: 0,
    events: [],
    sessions: [],
  };
};

const saveAnalyticsData = async (data: AnalyticsData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving analytics data:', error);
  }
};

export const clearAnalyticsData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ANALYTICS_DATA,
      STORAGE_KEYS.USAGE_STATS,
      STORAGE_KEYS.CURRENT_SESSION,
      STORAGE_KEYS.LAST_ACTIVE_DATE,
    ]);
  } catch (error) {
    console.error('Error clearing analytics data:', error);
  }
};

// ========================================
// التحكم في التحليلات
// ========================================

export const setAnalyticsEnabled = (enabled: boolean): void => {
  analyticsEnabled = enabled;
};

export const isAnalyticsEnabled = (): boolean => {
  return analyticsEnabled;
};

// ========================================
// تصدير موحد
// ========================================

const Analytics = {
  // الجلسات
  startSession,
  endSession,
  getCurrentSession,
  
  // الأحداث
  trackEvent,
  trackScreenView,
  trackAzkarComplete,
  trackQuranReading,
  trackPrayerLogged,
  trackShare,
  trackError,
  
  // الإحصائيات
  getUsageStats,
  updateUsageStats,
  
  // البيانات
  getAnalyticsData,
  clearAnalyticsData,
  
  // التحكم
  setAnalyticsEnabled,
  isAnalyticsEnabled,
};

export default Analytics;
