// lib/firebase-analytics.ts
// تتبع استخدام التطبيق وإرسال التحليلات
// آخر تحديث: 2026-03-04

import { db } from './firebase-config';
import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { getUserId } from './firebase-user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateMonthlyScore } from './rewards-manager';

// ==================== الثوابت ====================

const STATS_DOC_PATH = 'stats/global';
const ACTIVITY_DAILY_COLLECTION = 'activityDaily';
const LOCAL_STATS_KEY = '@rooh_local_stats';
const ANALYTICS_BUFFER_KEY = '@rooh_analytics_buffer';

/** Update the global stats doc, creating it if it doesn't exist yet. */
const updateStatsDoc = async (ref: ReturnType<typeof doc>, fields: Record<string, any>): Promise<void> => {
  try {
    await updateDoc(ref, fields);
  } catch {
    // Doc may not exist yet (race with initializeGlobalStats) — create with merge
    await setDoc(ref, { ...fields, lastUpdated: serverTimestamp() }, { merge: true });
  }
};

// ==================== Activity buffering ====================
//
// Previously every tracked action issued 3 Firestore writes (global stats +
// per-version stats + one activity-log doc). That made analytics the single
// largest cost driver and created a write hotspot on `stats/global`.
//
// We now buffer counts on-device and flush them periodically:
//   • one merged increment to `activityDaily/{userId}_{date}` (per-user/day)
//   • one merged increment to `stats/global`
// So a flush is 2 writes regardless of how many actions occurred since the
// last flush, and the activity collection holds one doc per user per day
// instead of one per action.

type BufferType = 'app_open' | 'azkar' | 'quran' | 'prayer' | 'tasbih' | 'khatma';

interface AnalyticsBuffer {
  userId: string;
  app_open: number;
  azkar: number;
  quran: number;
  prayer: number;
  tasbih: number;
  khatma: number;
  lastDescription: string;
  lastType: string;
}

let memBuffer: AnalyticsBuffer | null = null;
let bufferLoaded = false;
let isFlushing = false;

const emptyBuffer = (userId: string): AnalyticsBuffer => ({
  userId,
  app_open: 0,
  azkar: 0,
  quran: 0,
  prayer: 0,
  tasbih: 0,
  khatma: 0,
  lastDescription: '',
  lastType: '',
});

const loadBufferOnce = async (): Promise<void> => {
  if (bufferLoaded) return;
  bufferLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_BUFFER_KEY);
    if (raw) memBuffer = JSON.parse(raw);
  } catch {}
};

const persistBuffer = async (): Promise<void> => {
  try {
    if (memBuffer) await AsyncStorage.setItem(ANALYTICS_BUFFER_KEY, JSON.stringify(memBuffer));
    else await AsyncStorage.removeItem(ANALYTICS_BUFFER_KEY);
  } catch {}
};

/** Add an action to the on-device buffer. No Firestore write happens here. */
const bufferActivity = async (
  userId: string,
  type: BufferType,
  amount: number,
  description: string,
): Promise<void> => {
  await loadBufferOnce();
  if (!memBuffer || memBuffer.userId !== userId) {
    // Flush any leftover buffer for a previous user before switching.
    if (memBuffer && memBuffer.userId !== userId) await flushAnalytics().catch(() => {});
    memBuffer = emptyBuffer(userId);
  }
  memBuffer[type] += amount;
  if (description) memBuffer.lastDescription = description;
  memBuffer.lastType = type;
  await persistBuffer();
};

const todayDateString = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/**
 * Flush the buffered actions to Firestore. Safe to call repeatedly; a no-op
 * when the buffer is empty. Called on a timer and when the app backgrounds.
 */
export const flushAnalytics = async (): Promise<void> => {
  if (isFlushing) return;
  await loadBufferOnce();
  const buf = memBuffer;
  if (!buf) return;
  const total = buf.app_open + buf.azkar + buf.quran + buf.prayer + buf.tasbih + buf.khatma;
  if (total <= 0) return;

  isFlushing = true;
  // Clear the buffer up-front so concurrent actions accumulate into a fresh
  // one rather than being double-counted by this flush.
  memBuffer = null;
  await persistBuffer();

  try {
    const now = new Date();
    const date = todayDateString(now);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const dailyRef = doc(db, ACTIVITY_DAILY_COLLECTION, `${buf.userId}_${date}`);
    await setDoc(dailyRef, {
      userId: buf.userId,
      date,
      timestamp: Timestamp.fromDate(dayStart),
      lastActivityAt: serverTimestamp(),
      lastDescription: buf.lastDescription,
      lastType: buf.lastType,
      app_open: increment(buf.app_open),
      azkar: increment(buf.azkar),
      quran: increment(buf.quran),
      prayer: increment(buf.prayer),
      tasbih: increment(buf.tasbih),
      khatma: increment(buf.khatma),
    }, { merge: true });

    await updateStatsDoc(doc(db, STATS_DOC_PATH), {
      totalAppOpens: increment(buf.app_open),
      totalAzkarRead: increment(buf.azkar),
      totalQuranPages: increment(buf.quran),
      totalPrayers: increment(buf.prayer),
      totalTasbih: increment(buf.tasbih),
      lastUpdated: serverTimestamp(),
    });
  } catch {
    // Network/permission failure — fold the counts back so we retry next flush.
    await loadBufferOnce();
    const current = memBuffer || emptyBuffer(buf.userId);
    if (current.userId === buf.userId) {
      current.app_open += buf.app_open;
      current.azkar += buf.azkar;
      current.quran += buf.quran;
      current.prayer += buf.prayer;
      current.tasbih += buf.tasbih;
      current.khatma += buf.khatma;
      if (!current.lastDescription) current.lastDescription = buf.lastDescription;
      memBuffer = current;
      await persistBuffer();
    }
  } finally {
    isFlushing = false;
  }
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
    const globalDoc = await getDoc(statsRef);
    if (!globalDoc.exists()) await setDoc(statsRef, initialData);

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

    // Buffer for the next flush (no immediate Firestore write)
    await bufferActivity(userId, 'app_open', 1, 'فتح التطبيق');
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

    await bufferActivity(userId, 'azkar', 1, `قراءة ذكر — ${category}`);
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

    await bufferActivity(userId, 'quran', 1, `قراءة ${surahName}`);
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

    await bufferActivity(userId, 'prayer', 1, `تسجيل صلاة ${prayerName}`);
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

    // Buffer the actual tap count so the daily aggregate sums to the same
    // total the admin Analytics page previously derived from per-event docs.
    await bufferActivity(userId, 'tasbih', count, `تسبيح ${count} مرة`);
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

    // Buffer for analytics only (not for honor board points — overlaps with quran pages)
    await bufferActivity(userId, 'khatma', 1, `تقدم في الختمة — ${surahName} (${progressPercent}%)`);
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
