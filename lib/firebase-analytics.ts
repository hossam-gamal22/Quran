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
import Constants from 'expo-constants';

// ==================== الثوابت ====================

const STATS_DOC_PATH = 'stats/global';
const ACTIVITY_COLLECTION = 'activity';
const LOCAL_STATS_KEY = '@rooh_local_stats';

/** Get current app version for per-version stats doc */
const getVersionDocPath = (): string => {
  const version = Constants.expoConfig?.version || '1.2.1';
  return `stats/${version}`;
};

/** Update both global and per-version stats docs simultaneously */
const updateStatsDoc = async (ref: ReturnType<typeof doc>, fields: Record<string, any>): Promise<void> => {
  try {
    await updateDoc(ref, fields);
  } catch {
    // Doc may not exist yet (race with initializeGlobalStats) — create with merge
    await setDoc(ref, { ...fields, lastUpdated: serverTimestamp() }, { merge: true });
  }
};

const updateStatsDual = async (fields: Record<string, any>): Promise<void> => {
  const globalRef = doc(db, STATS_DOC_PATH);
  const versionRef = doc(db, getVersionDocPath());
  await Promise.all([
    updateStatsDoc(globalRef, fields),
    updateStatsDoc(versionRef, fields),
  ]);
};

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
    const initialData = {
      totalAzkarRead: 0,
      totalQuranPages: 0,
      totalPrayers: 0,
      totalTasbih: 0,
      totalAppOpens: 0,
      lastUpdated: serverTimestamp(),
    };

    const statsRef = doc(db, STATS_DOC_PATH);
    const versionRef = doc(db, getVersionDocPath());

    const [globalDoc, versionDoc] = await Promise.all([
      getDoc(statsRef),
      getDoc(versionRef),
    ]);

    const promises: Promise<void>[] = [];
    if (!globalDoc.exists()) promises.push(setDoc(statsRef, initialData));
    if (!versionDoc.exists()) promises.push(setDoc(versionRef, initialData));
    if (promises.length > 0) await Promise.all(promises);

    console.log('✅ Global stats initialized');
  } catch (error) {
    console.warn('⚠️ Error initializing global stats:', error);
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
    
    // Update monthly engagement score FIRST (saves locally even if Firestore fails)
    updateMonthlyScore(userId, 'app_open').catch(e => console.warn('⚠️ Monthly score update failed (app_open):', e));
    
    // تحديث Firebase (global + per-version)
    await updateStatsDual({
      totalAppOpens: increment(1),
      lastUpdated: serverTimestamp(),
    }).catch(() => {});
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'app_open',
      userId,
      description: 'فتح التطبيق',
      timestamp: serverTimestamp(),
    }).catch(() => {});
    
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
    
    // Update monthly engagement score FIRST (saves locally even if Firestore fails)
    updateMonthlyScore(userId, 'azkar').catch(e => console.warn('⚠️ Monthly score update failed (azkar):', e));
    
    // تحديث Firebase (global + per-version)
    await updateStatsDual({
      totalAzkarRead: increment(1),
      lastUpdated: serverTimestamp(),
    }).catch(() => {});
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'azkar',
      userId,
      azkarId,
      category,
      language,
      description: `قراءة ذكر — ${category}`,
      timestamp: serverTimestamp(),
    }).catch(() => {});
    
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
    
    // Update monthly engagement score FIRST (saves locally even if Firestore fails)
    updateMonthlyScore(userId, 'quran').catch(e => console.warn('⚠️ Monthly score update failed (quran):', e));
    
    // تحديث Firebase (global + per-version)
    await updateStatsDual({
      totalQuranPages: increment(1),
      lastUpdated: serverTimestamp(),
    }).catch(() => {});
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'quran',
      userId,
      surahId,
      surahName,
      ayahNumber,
      description: `قراءة ${surahName}`,
      timestamp: serverTimestamp(),
    }).catch(() => {});
    
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
    
    // Update monthly engagement score FIRST (saves locally even if Firestore fails)
    updateMonthlyScore(userId, 'prayer').catch(e => console.warn('⚠️ Monthly score update failed (prayer):', e));
    
    // تحديث Firebase (global + per-version)
    await updateStatsDual({
      totalPrayers: increment(1),
      lastUpdated: serverTimestamp(),
    }).catch(() => {});
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'prayer',
      userId,
      prayerName,
      onTime,
      description: `تسجيل صلاة ${prayerName}`,
      timestamp: serverTimestamp(),
    }).catch(() => {});
    
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
    
    // Update monthly engagement score FIRST (saves locally even if Firestore fails)
    // Use actual tap count (not cumulative round number) so 100 taps = 100 in honor board
    updateMonthlyScore(userId, 'tasbih', count).catch(e => console.warn('⚠️ Monthly score update failed (tasbih):', e));
    
    // تحديث Firebase (global + per-version)
    await updateStatsDual({
      totalTasbih: increment(count),
      lastUpdated: serverTimestamp(),
    }).catch(() => {});
    
    // تسجيل النشاط
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      type: 'tasbih',
      userId,
      count,
      zikrText: zikrText.substring(0, 50), // أول 50 حرف فقط
      totalRounds,
      description: `تسبيح ${count} مرة`,
      timestamp: serverTimestamp(),
    }).catch(() => {});
    
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
      description: `تقدم في الختمة — ${surahName} (${progressPercent}%)`,
      timestamp: serverTimestamp(),
    });
    
    // Khatma activity tracked for analytics only (not for honor board points — overlaps with quran pages)
    
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
