// lib/firebase-analytics.ts
// تتبع استخدام التطبيق وإرسال التحليلات
// آخر تحديث: 2026-03-04

import { db } from './firebase-config';
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { getUserId } from './firebase-user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateMonthlyScore } from './rewards-manager';

// ==================== الثوابت ====================

const STATS_DOC_PATH = 'stats/global';
const ACTIVITY_COLLECTION = 'activity';
const LOCAL_STATS_KEY = '@rooh_local_stats';

// ==================== الأنواع ====================

type ActivityType = 'azkar' | 'quran' | 'prayer' | 'tasbih' | 'khatma' | 'app_open';

interface ActivityData {
  type: ActivityType;
  userId: string;
  timestamp: any;
  [key: string]: any;
}

interface LocalStats {
  azkarRead: number;
  quranPages: number;
  prayers: number;
  tasbihCount: number;
  appOpens: number;
  lastSynced: string;
}

// ==================== الإحصائيات المحلية ====================

/**
 * الحصول على الإحصائيات المحلية
 */
const getLocalStats = async (): Promise<LocalStats> => {
  try {
    const stats = await AsyncStorage.getItem(LOCAL_STATS_KEY);
    if (stats) {
      return JSON.parse(stats);
    }
  } catch (error) {
    console.log('Error getting local stats');
  }
  
  return {
    azkarRead: 0,
    quranPages: 0,
    prayers: 0,
    tasbihCount: 0,
    appOpens: 0,
    lastSynced: new Date().toISOString(),
  };
};

/**
 * حفظ الإحصائيات المحلية
 */
const saveLocalStats = async (stats: LocalStats): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.log('Error saving local stats');
  }
};

// ==================== التتبع ====================

/**
 * تهيئة مستند الإحصائيات العامة (مرة واحدة)
 */
export const initializeGlobalStats = async (): Promise<void> => {
  try {
    const statsRef = doc(db, STATS_DOC_PATH);
    const statsDoc = await getDoc(statsRef);
    
    if (!statsDoc.exists()) {
      await setDoc(statsRef, {
        totalAzkarRead: 0,
        totalQuranPages: 0,
        totalPrayers: 0,
        totalTasbih: 0,
        totalAppOpens: 0,
        lastUpdated: serverTimestamp(),
      });
      console.log('✅ Global stats initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing global stats:', error);
  }
};

/**
 * تسجيل فتح التطبيق
 */
export const trackAppOpen = async (): Promise<void> => {
  try {
    const userId = await getUserId();
    
    // تحديث محلي
    const localStats = await getLocalStats();
    localStats.appOpens += 1;
    await saveLocalStats(localStats);
    
    // تحديث Firebase
    await updateDoc(doc(db, STATS_DOC_PATH), {
      totalAppOpens: increment(1),
      lastUpdated: serverTimestamp(),
    });
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'app_open',
      userId,
      timestamp: serverTimestamp(),
    });
    
    // Update monthly engagement score
    updateMonthlyScore(userId, 'app_open').catch(() => {});
    
    console.log('📊 App open tracked');
  } catch (error) {
    console.log('Could not track app open');
  }
};

/**
 * تسجيل قراءة ذكر
 */
export const trackAzkarRead = async (
  azkarId: number, 
  category: string,
  language: string = 'ar'
): Promise<void> => {
  try {
    const userId = await getUserId();
    
    // تحديث محلي
    const localStats = await getLocalStats();
    localStats.azkarRead += 1;
    await saveLocalStats(localStats);
    
    // تحديث Firebase
    await updateDoc(doc(db, STATS_DOC_PATH), {
      totalAzkarRead: increment(1),
      lastUpdated: serverTimestamp(),
    });
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'azkar',
      userId,
      azkarId,
      category,
      language,
      timestamp: serverTimestamp(),
    });
    
    // Update monthly engagement score
    updateMonthlyScore(userId, 'azkar').catch(() => {});
    
    console.log('📿 Azkar read tracked:', azkarId);
  } catch (error) {
    console.log('Could not track azkar');
  }
};

/**
 * تسجيل قراءة صفحة قرآن
 */
export const trackQuranPage = async (
  surahId: number, 
  surahName: string,
  ayahNumber?: number
): Promise<void> => {
  try {
    const userId = await getUserId();
    
    // تحديث محلي
    const localStats = await getLocalStats();
    localStats.quranPages += 1;
    await saveLocalStats(localStats);
    
    // تحديث Firebase
    await updateDoc(doc(db, STATS_DOC_PATH), {
      totalQuranPages: increment(1),
      lastUpdated: serverTimestamp(),
    });
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'quran',
      userId,
      surahId,
      surahName,
      ayahNumber,
      timestamp: serverTimestamp(),
    });
    
    // Update monthly engagement score
    updateMonthlyScore(userId, 'quran').catch(() => {});
    
    console.log('📖 Quran page tracked:', surahName);
  } catch (error) {
    console.log('Could not track quran page');
  }
};
/**
 * تسجيل صلاة
 */
export const trackPrayer = async (
  prayerName: string,
  onTime: boolean = true
): Promise<void> => {
  try {
    const userId = await getUserId();
    
    // تحديث محلي
    const localStats = await getLocalStats();
    localStats.prayers += 1;
    await saveLocalStats(localStats);
    
    // تحديث Firebase
    await updateDoc(doc(db, STATS_DOC_PATH), {
      totalPrayers: increment(1),
      lastUpdated: serverTimestamp(),
    });
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'prayer',
      userId,
      prayerName,
      onTime,
      timestamp: serverTimestamp(),
    });
    
    // Update monthly engagement score
    updateMonthlyScore(userId, 'prayer').catch(() => {});
    
    console.log('🕌 Prayer tracked:', prayerName);
  } catch (error) {
    console.log('Could not track prayer');
  }
};

/**
 * تسجيل تسبيح
 */
export const trackTasbih = async (
  count: number, 
  zikrText: string,
  totalRounds: number = 1
): Promise<void> => {
  try {
    const userId = await getUserId();
    
    // تحديث محلي
    const localStats = await getLocalStats();
    localStats.tasbihCount += count;
    await saveLocalStats(localStats);
    
    // تحديث Firebase
    await updateDoc(doc(db, STATS_DOC_PATH), {
      totalTasbih: increment(count),
      lastUpdated: serverTimestamp(),
    });
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'tasbih',
      userId,
      count,
      zikrText: zikrText.substring(0, 50), // أول 50 حرف فقط
      totalRounds,
      timestamp: serverTimestamp(),
    });
    
    // Update monthly engagement score
    updateMonthlyScore(userId, 'tasbih', totalRounds).catch(() => {});
    
    console.log('📿 Tasbih tracked:', count);
  } catch (error) {
    console.log('Could not track tasbih');
  }
};

/**
 * تسجيل تقدم في الختمة
 */
export const trackKhatmaProgress = async (
  khatmaId: string,
  surahId: number,
  surahName: string,
  progressPercent: number
): Promise<void> => {
  try {
    const userId = await getUserId();
    
    // تسجيل النشاط فقط (بدون إحصائيات عامة)
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'khatma',
      userId,
      khatmaId,
      surahId,
      surahName,
      progressPercent,
      timestamp: serverTimestamp(),
    });
    
    // Update monthly engagement score
    updateMonthlyScore(userId, 'khatma').catch(() => {});
    
    console.log('📚 Khatma progress tracked:', progressPercent + '%');
  } catch (error) {
    console.log('Could not track khatma');
  }
};

/**
 * الحصول على الإحصائيات المحلية للمستخدم
 */
export const getUserLocalStats = async (): Promise<LocalStats> => {
  return await getLocalStats();
};

/**
 * مزامنة الإحصائيات المحلية مع Firebase
 */
export const syncLocalStats = async (): Promise<void> => {
  try {
    const localStats = await getLocalStats();
    const userId = await getUserId();
    
    // حفظ في مستند المستخدم
    const userStatsRef = doc(db, 'users', userId, 'stats', 'lifetime');
    await setDoc(userStatsRef, {
      ...localStats,
      lastSynced: serverTimestamp(),
    }, { merge: true });
    
    // تحديث وقت المزامنة
    localStats.lastSynced = new Date().toISOString();
    await saveLocalStats(localStats);
    
    console.log('✅ Local stats synced to Firebase');
  } catch (error) {
    console.log('Could not sync local stats');
  }
};
