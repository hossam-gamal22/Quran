// lib/performance.ts
// نظام تحسين الأداء ومراقبته - روح المسلم

import { InteractionManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// الأنواع
// ========================================

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: 'ms' | 'mb' | 'fps' | 'count';
  timestamp: string;
  context?: string;
}

export interface PerformanceReport {
  appStartTime: number;
  screenLoadTimes: Record<string, number[]>;
  averageFrameRate: number;
  memoryUsage: number;
  cacheSize: number;
  metrics: PerformanceMetric[];
  generatedAt: string;
}

export interface CacheConfig {
  maxSize: number; // بالـ MB
  maxAge: number; // بالدقائق
  cleanupInterval: number; // بالدقائق
}

export interface ImageCacheEntry {
  uri: string;
  size: number;
  lastAccessed: string;
  accessCount: number;
}

// ========================================
// الثوابت
// ========================================

const STORAGE_KEYS = {
  PERFORMANCE_DATA: 'performance_data',
  CACHE_INDEX: 'cache_index',
  IMAGE_CACHE: 'image_cache_index',
};

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 50, // 50 MB
  maxAge: 7 * 24 * 60, // 7 أيام
  cleanupInterval: 60, // كل ساعة
};

// ========================================
// متغيرات عامة
// ========================================

let appStartTimestamp: number = 0;
let screenLoadTimes: Record<string, number[]> = {};
let performanceMetrics: PerformanceMetric[] = [];
let isMonitoring = false;

// ========================================
// قياس وقت بدء التطبيق
// ========================================

export const markAppStart = (): void => {
  appStartTimestamp = Date.now();
};

export const getAppStartTime = (): number => {
  return appStartTimestamp;
};

export const measureAppStartupTime = (): number => {
  if (appStartTimestamp === 0) return 0;
  return Date.now() - appStartTimestamp;
};

// ========================================
// قياس أوقات تحميل الشاشات
// ========================================

const screenStartTimes: Record<string, number> = {};

export const markScreenStart = (screenName: string): void => {
  screenStartTimes[screenName] = Date.now();
};

export const markScreenEnd = (screenName: string): number => {
  const startTime = screenStartTimes[screenName];
  if (!startTime) return 0;
  
  const loadTime = Date.now() - startTime;
  
  if (!screenLoadTimes[screenName]) {
    screenLoadTimes[screenName] = [];
  }
  screenLoadTimes[screenName].push(loadTime);
  
  // الاحتفاظ بآخر 10 قياسات فقط
  if (screenLoadTimes[screenName].length > 10) {
    screenLoadTimes[screenName].shift();
  }
  
  delete screenStartTimes[screenName];
  
  return loadTime;
};

export const getAverageScreenLoadTime = (screenName: string): number => {
  const times = screenLoadTimes[screenName];
  if (!times || times.length === 0) return 0;
  
  const sum = times.reduce((a, b) => a + b, 0);
  return Math.round(sum / times.length);
};

export const getAllScreenLoadTimes = (): Record<string, number> => {
  const averages: Record<string, number> = {};
  
  Object.keys(screenLoadTimes).forEach(screen => {
    averages[screen] = getAverageScreenLoadTime(screen);
  });
  
  return averages;
};

// ========================================
// تأخير المهام الثقيلة
// ========================================

export const runAfterInteractions = <T>(
  task: () => T | Promise<T>,
  timeout: number = 500
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      try {
        const result = task();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    }, timeout);

    InteractionManager.runAfterInteractions(() => {
      clearTimeout(timeoutId);
      try {
        const result = task();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
};

export const deferTask = <T>(
  task: () => T | Promise<T>,
  delay: number = 0
): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = task();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
};

// ========================================
// إدارة الذاكرة المؤقتة (Cache)
// ========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
}

const memoryCache: Map<string, CacheEntry<any>> = new Map();
let totalCacheSize = 0;

export const setCache = async <T>(
  key: string,
  data: T,
  persistToDisk: boolean = false
): Promise<void> => {
  const serialized = JSON.stringify(data);
  const size = new Blob([serialized]).size / (1024 * 1024); // بالـ MB
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    size,
  };
  
  // التحقق من حجم الكاش
  if (totalCacheSize + size > DEFAULT_CACHE_CONFIG.maxSize) {
    await cleanupCache();
  }
  
  memoryCache.set(key, entry);
  totalCacheSize += size;
  
  if (persistToDisk) {
    try {
      await AsyncStorage.setItem(`cache_${key}`, serialized);
    } catch (error) {
      console.error('Error persisting cache:', error);
    }
  }
};

export const getCache = async <T>(
  key: string,
  fromDisk: boolean = false
): Promise<T | null> => {
  // البحث في الذاكرة أولاً
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) {
    const age = (Date.now() - memoryEntry.timestamp) / (1000 * 60);
    if (age < DEFAULT_CACHE_CONFIG.maxAge) {
      return memoryEntry.data as T;
    }
    // منتهي الصلاحية
    memoryCache.delete(key);
    totalCacheSize -= memoryEntry.size;
  }
  
  // البحث في التخزين الدائم
  if (fromDisk) {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (stored) {
        const data = JSON.parse(stored) as T;
        await setCache(key, data, false); // إعادة للذاكرة
        return data;
      }
    } catch (error) {
      console.error('Error reading cache from disk:', error);
    }
  }
  
  return null;
};

export const removeCache = async (key: string): Promise<void> => {
  const entry = memoryCache.get(key);
  if (entry) {
    totalCacheSize -= entry.size;
    memoryCache.delete(key);
  }
  
  try {
    await AsyncStorage.removeItem(`cache_${key}`);
  } catch (error) {
    console.error('Error removing cache:', error);
  }
};

export const clearCache = async (): Promise<void> => {
  memoryCache.clear();
  totalCacheSize = 0;
  
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

const cleanupCache = async (): Promise<void> => {
  const now = Date.now();
  const maxAgeMs = DEFAULT_CACHE_CONFIG.maxAge * 60 * 1000;
  
  // حذف العناصر القديمة
  const keysToDelete: string[] = [];
  
  memoryCache.forEach((entry, key) => {
    if (now - entry.timestamp > maxAgeMs) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => {
    const entry = memoryCache.get(key);
    if (entry) {
      totalCacheSize -= entry.size;
      memoryCache.delete(key);
    }
  });
  
  // إذا لا يزال الحجم كبيراً، حذف الأقدم
  if (totalCacheSize > DEFAULT_CACHE_CONFIG.maxSize * 0.8) {
    const entries = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    while (totalCacheSize > DEFAULT_CACHE_CONFIG.maxSize * 0.5 && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      totalCacheSize -= entry.size;
      memoryCache.delete(key);
    }
  }
};

export const getCacheStats = (): { size: number; entries: number } => {
  return {
    size: Math.round(totalCacheSize * 100) / 100,
    entries: memoryCache.size,
  };
};

// ========================================
// تسجيل المقاييس
// ========================================

export const recordMetric = (
  name: string,
  value: number,
  unit: PerformanceMetric['unit'],
  context?: string
): void => {
  const metric: PerformanceMetric = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    value,
    unit,
    timestamp: new Date().toISOString(),
    context,
  };
  
  performanceMetrics.push(metric);
  
  // الاحتفاظ بآخر 100 مقياس
  if (performanceMetrics.length > 100) {
    performanceMetrics.shift();
  }
};

export const getMetrics = (): PerformanceMetric[] => {
  return [...performanceMetrics];
};

// ========================================
// تقرير الأداء
// ========================================

export const generatePerformanceReport = async (): Promise<PerformanceReport> => {
  const cacheStats = getCacheStats();
  
  const report: PerformanceReport = {
    appStartTime: measureAppStartupTime(),
    screenLoadTimes: { ...screenLoadTimes },
    averageFrameRate: 60, // قيمة افتراضية
    memoryUsage: 0, // يحتاج native module للقياس الفعلي
    cacheSize: cacheStats.size,
    metrics: getMetrics(),
    generatedAt: new Date().toISOString(),
  };
  
  return report;
};

export const savePerformanceReport = async (): Promise<void> => {
  try {
    const report = await generatePerformanceReport();
    await AsyncStorage.setItem(
      STORAGE_KEYS.PERFORMANCE_DATA,
      JSON.stringify(report)
    );
  } catch (error) {
    console.error('Error saving performance report:', error);
  }
};

export const getLastPerformanceReport = async (): Promise<PerformanceReport | null> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PERFORMANCE_DATA);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting performance report:', error);
  }
  return null;
};

// ========================================
// مراقبة الأداء
// ========================================

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

export const startPerformanceMonitoring = (): void => {
  if (isMonitoring) return;
  
  isMonitoring = true;
  markAppStart();
  
  // تنظيف الكاش دورياً
  cleanupIntervalId = setInterval(
    cleanupCache,
    DEFAULT_CACHE_CONFIG.cleanupInterval * 60 * 1000
  );
};

export const stopPerformanceMonitoring = async (): Promise<void> => {
  if (!isMonitoring) return;
  
  isMonitoring = false;
  
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  
  await savePerformanceReport();
};

// ========================================
// أدوات التحسين
// ========================================

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  ttl: number = 5 * 60 * 1000 // 5 دقائق
): T => {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    const result = func(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    
    return result;
  }) as T;
};

// ========================================
// تصدير موحد
// ========================================

const Performance = {
  // بدء التطبيق
  markAppStart,
  getAppStartTime,
  measureAppStartupTime,
  
  // الشاشات
  markScreenStart,
  markScreenEnd,
  getAverageScreenLoadTime,
  getAllScreenLoadTimes,
  
  // المهام
  runAfterInteractions,
  deferTask,
  
  // الكاش
  setCache,
  getCache,
  removeCache,
  clearCache,
  getCacheStats,
  
  // المقاييس
  recordMetric,
  getMetrics,
  
  // التقارير
  generatePerformanceReport,
  savePerformanceReport,
  getLastPerformanceReport,
  
  // المراقبة
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  
  // الأدوات
  debounce,
  throttle,
  memoize,
};

export default Performance;
