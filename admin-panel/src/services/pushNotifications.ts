// admin-panel/src/services/pushNotifications.ts
// خدمة إرسال الإشعارات عبر Expo Push API
// آخر تحديث: 2026-03-04
// محدث لدعم 12 لغة

import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
// ==================== الأنواع ====================

// اللغات المدعومة (12 لغة)
export type SupportedLanguage = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; flag: string; rtl: boolean }[] = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾', rtl: false },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
];

// ترجمات الإشعار
export type NotificationTranslations = {
  [key in SupportedLanguage]?: {
    title: string;
    body: string;
  };
};

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  _displayInForeground?: boolean;
}

export interface PushNotificationPayload {
  // الترجمات لكل اللغات
  translations: NotificationTranslations;
  // الاستهداف
  targetAudience: 'all' | 'ios' | 'android' | 'active' | 'inactive' | 'custom' | 'single_user';
  targetLanguages?: string[];
  targetCountries?: string[];
  targetUserId?: string;
  // الإجراء
  actionType?: 'none' | 'screen' | 'url';
  actionUrl?: string;
  imageUrl?: string;
}

interface SendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
  perLanguage: { [lang: string]: number };
}

interface UserToken {
  id: string;
  fcmToken: string;
  platform: string;
  language: string;
  country: string;
  lastActive: Timestamp | null;
}

interface BatchResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface UserStats {
  total: number;
  withTokens: number;
  ios: number;
  android: number;
  active: number;
  byLanguage: { [lang: string]: number };
}

// ==================== الثوابت ====================

const BATCH_SIZE = 100;

// ==================== دوال مساعدة ====================

/**
 * جلب توكنات المستخدمين من Firebase
 */
const fetchUserTokens = async (
  targetAudience: string,
  targetLanguages?: string[],
  targetCountries?: string[],
  targetUserId?: string
): Promise<UserToken[]> => {
  try {
    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef);

    // Single user targeting — fetch just that one doc
    if (targetAudience === 'single_user' && targetUserId) {
      const { getDoc, doc: docRef } = await import('firebase/firestore');
      const userSnap = await getDoc(docRef(db, 'users', targetUserId));
      if (!userSnap.exists()) return [];
      const data = userSnap.data();
      if (!data.fcmToken || !data.fcmToken.startsWith('ExponentPushToken')) return [];
      return [{
        id: userSnap.id,
        fcmToken: data.fcmToken,
        platform: data.platform || 'unknown',
        language: data.language || 'ar',
        country: data.country || 'SA',
        lastActive: data.lastActive,
      }];
    }

    // تصفية حسب المنصة
    if (targetAudience === 'ios') {
      usersQuery = query(usersRef, where('platform', '==', 'ios'));
    } else if (targetAudience === 'android') {
      usersQuery = query(usersRef, where('platform', '==', 'android'));
    }
    
    const snapshot = await getDocs(usersQuery);
    const STORE_SOURCES = new Set(['play_store', 'app_store']);
    let users: UserToken[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // SSOT: skip placeholders and non-store installs
      if (data.placeholder) return;
      if (!STORE_SOURCES.has(data.installSource)) return;
      // تجاهل المستخدمين بدون توكن
      if (data.fcmToken && data.fcmToken.startsWith('ExponentPushToken')) {
        users.push({
          id: doc.id,
          fcmToken: data.fcmToken,
          platform: data.platform || 'unknown',
          language: data.language || 'ar',
          country: data.country || 'SA',
          lastActive: data.lastActive,
        });
      }
    });
    
    // تصفية المستخدمين النشطين/غير النشطين
    if (targetAudience === 'active') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      users = users.filter(u => {
        if (!u.lastActive) return false;
        const lastActive = u.lastActive.toDate();
        return lastActive > weekAgo;
      });
    } else if (targetAudience === 'inactive') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      users = users.filter(u => {
        if (!u.lastActive) return true;
        const lastActive = u.lastActive.toDate();
        return lastActive <= weekAgo;
      });
    }
    
    // تصفية حسب اللغة
    if (targetLanguages && targetLanguages.length > 0) {
      users = users.filter(u => targetLanguages.includes(u.language));
    }
    
    // تصفية حسب البلد
    if (targetCountries && targetCountries.length > 0) {
      users = users.filter(u => targetCountries.includes(u.country));
    }

    // Deduplicate by fcmToken — keep latest (last in array = most recent Firestore doc)
    const tokenMap = new Map<string, UserToken>();
    for (const u of users) {
      tokenMap.set(u.fcmToken, u);
    }
    users = Array.from(tokenMap.values());
    
    return users;
  } catch (error) {
    console.error('Error fetching user tokens:', error);
    return [];
  }
};

/**
 * الحصول على الترجمة المناسبة للمستخدم
 */
const getTranslationForUser = (
  translations: NotificationTranslations,
  userLanguage: string
): { title: string; body: string } => {
  // 1. محاولة الحصول على لغة المستخدم
  const userLang = userLanguage as SupportedLanguage;
  if (translations[userLang]?.title && translations[userLang]?.body) {
    return translations[userLang]!;
  }
  
  // 2. Fallback للعربي
  if (translations.ar?.title && translations.ar?.body) {
    return translations.ar;
  }
  
  // 3. Fallback للإنجليزي
  if (translations.en?.title && translations.en?.body) {
    return translations.en;
  }
  
  // 4. أول ترجمة متاحة
  for (const lang of Object.keys(translations) as SupportedLanguage[]) {
    if (translations[lang]?.title && translations[lang]?.body) {
      return translations[lang]!;
    }
  }
  
  return { title: 'روح المسلم', body: '' };
};

/**
 * إرسال دفعة من الإشعارات.
 * - في بيئة التطوير (localhost): يستخدم Vite proxy لتجاوز CORS
 * - في الإنتاج: يستخدم Netlify serverless function
 *
 * Phase A1 (Security): يرسل admin session token في Authorization header
 *   لمنع أي شخص من استدعاء الـ proxy مباشرة من خارج الـ admin panel.
 */
const ADMIN_SESSION_KEY = 'rooh_admin_session';

const sendBatch = async (messages: ExpoPushMessage[]): Promise<BatchResult> => {
  // Both dev (Vite proxy) and production (Netlify function) use the same path pattern
  const pushUrl = import.meta.env.DEV ? '/expo-push' : '/api/expo-push';
  const sessionToken = (typeof localStorage !== 'undefined'
    ? localStorage.getItem(ADMIN_SESSION_KEY)
    : null) || '';

  try {
    const res = await fetch(pushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(messages),
    });
    if (res.status === 401) {
      throw new Error('غير مصرح — جلسة الإدارة منتهية. الرجاء تسجيل الدخول مرة أخرى.');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const result = await res.json();
    let ok = 0, fail = 0;
    const errs: string[] = [];
    (result.data ?? []).forEach((t: any, i: number) => {
      if (t.status === 'ok') ok++;
      else { fail++; errs.push(`Token ${i}: ${t.message ?? 'error'}`); }
    });
    console.log(`✅ Sent ${ok} notifications`);
    return { successCount: ok, failureCount: fail, errors: errs };
  } catch (error: any) {
    console.error('Push send error:', error);
    return { successCount: 0, failureCount: messages.length, errors: [error.message] };
  }
};

// ==================== الدوال الرئيسية ====================

/**
 * إرسال إشعار push لجميع المستخدمين المستهدفين (يدعم 12 لغة)
 */
export const sendPushNotification = async (
  payload: PushNotificationPayload
): Promise<SendResult> => {
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;
  const perLanguage: { [lang: string]: number } = {};
  
  try {
    // 1. جلب توكنات المستخدمين
    const users = await fetchUserTokens(
      payload.targetAudience,
      payload.targetLanguages,
      payload.targetCountries,
      payload.targetUserId
    );
    
    if (users.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['لا يوجد مستخدمين مطابقين للمعايير المحددة'],
        perLanguage: {},
      };
    }
    
    console.log(`📤 Sending to ${users.length} users...`);
    
    // 2. بناء الرسائل مع الترجمة المناسبة لكل مستخدم
    const messages: ExpoPushMessage[] = users.map(user => {
      const translation = getTranslationForUser(payload.translations, user.language);
      
      // تتبع الإرسال حسب اللغة
      perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;
      
      return {
        to: user.fcmToken,
        title: translation.title,
        body: translation.body,
        sound: 'default',
        priority: 'high',
        channelId: 'general',
        ttl: 86400,
        _displayInForeground: true,
        data: {
          actionType: payload.actionType,
          actionUrl: payload.actionUrl,
          imageUrl: payload.imageUrl,
          language: user.language,
          type: payload.actionType || 'admin',
        },
      };
    });
    
    // 3. Save notification doc FIRST to get its ID for tracking
    const notificationDoc: Record<string, any> = {
      translations: payload.translations,
      targetAudience: payload.targetAudience,
      status: 'sending',
      sentCount: 0,
      failedCount: 0,
      perLanguage: {},
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: serverTimestamp(),
    };
    if (payload.targetLanguages) notificationDoc.targetLanguages = payload.targetLanguages;
    if (payload.targetCountries) notificationDoc.targetCountries = payload.targetCountries;
    if (payload.actionType) notificationDoc.actionType = payload.actionType;
    if (payload.actionUrl) notificationDoc.actionUrl = payload.actionUrl;
    if (payload.imageUrl) notificationDoc.imageUrl = payload.imageUrl;
    const notifDocRef = await addDoc(collection(db, 'notifications'), notificationDoc);

    // 4. Inject the doc ID into each message's data for open tracking
    for (const msg of messages) {
      (msg as any).data = { ...(msg as any).data, notificationDocId: notifDocRef.id };
    }

    // 5. إرسال على دفعات
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch);

      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);

      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 6. Update the doc with final send counts
    const { updateDoc: updateDocFn } = await import('firebase/firestore');
    await updateDocFn(notifDocRef, {
      status: 'sent',
      sentCount,
      failedCount,
      perLanguage,
      deliveredCount: sentCount,
      sentAt: serverTimestamp(),
    });
    
    console.log(`✅ Sent: ${sentCount}, Failed: ${failedCount}`);
    console.log('📊 Per language:', perLanguage);
    
    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors: errors.slice(0, 10),
      perLanguage,
    };
  } catch (error) {
    console.error('Send notification error:', error);
    return {
      success: false,
      sentCount,
      failedCount,
      errors: [(error as Error).message],
      perLanguage,
    };
  }
};

/**
 * إرسال إشعار اختباري
 */
export const sendTestNotification = async (token: string, language: string = 'ar'): Promise<boolean> => {
  const testMessages: { [key: string]: { title: string; body: string } } = {
    ar: { title: 'إشعار اختباري 🔔', body: 'هذا إشعار تجريبي من لوحة التحكم' },
    en: { title: 'Test Notification 🔔', body: 'This is a test notification from admin panel' },
    fr: { title: 'Notification test 🔔', body: 'Ceci est une notification test' },
    de: { title: 'Testbenachrichtigung 🔔', body: 'Dies ist eine Testbenachrichtigung' },
    es: { title: 'Notificación de prueba 🔔', body: 'Esta es una notificación de prueba' },
    tr: { title: 'Test Bildirimi 🔔', body: 'Bu bir test bildirimidir' },
    ur: { title: 'ٹیسٹ نوٹیفیکیشن 🔔', body: 'یہ ایک ٹیسٹ نوٹیفیکیشن ہے' },
    id: { title: 'Notifikasi Uji 🔔', body: 'Ini adalah notifikasi uji coba' },
    ms: { title: 'Pemberitahuan Ujian 🔔', body: 'Ini adalah pemberitahuan ujian' },
    hi: { title: 'टेस्ट नोटिफिकेशन 🔔', body: 'यह एक टेस्ट नोटिफिकेशन है' },
    bn: { title: 'টেস্ট নোটিফিকেশন 🔔', body: 'এটি একটি পরীক্ষামূলক বিজ্ঞপ্তি' },
    ru: { title: 'Тестовое уведомление 🔔', body: 'Это тестовое уведомление' },
  };
  
  const msg = testMessages[language] || testMessages.ar;
  const result = await sendBatch([{
    to: token,
    title: msg.title,
    body: msg.body,
    sound: 'default',
  }]);
  return result.successCount > 0 || result.errors.length === 0;
};

/**
 * التحقق من صلاحية التوكن
 */
export const isValidExpoToken = (token: string): boolean => {
  return token.startsWith('ExponentPushToken[') && token.endsWith(']');
};

/**
 * الحصول على إحصائيات المستخدمين — SSOT: same filter & dedup as all other pages
 */
export const getUserStats = async (): Promise<UserStats> => {
  try {
    const { fetchActiveDevices } = await import('../utils/user-query');
    const { stats } = await fetchActiveDevices();
    return {
      total: stats.total,
      withTokens: stats.withTokens,
      ios: stats.ios,
      android: stats.android,
      active: stats.active,
      byLanguage: stats.byLanguage,
    };
  } catch {
    return { total: 0, withTokens: 0, ios: 0, android: 0, active: 0, byLanguage: {} };
  }
};

// ==================== إعادة التفاعل ====================

/**
 * عدد المستخدمين غير النشطين حسب عتبة الأيام
 */
export const getInactiveUserCount = async (inactiveDays: number): Promise<number> => {
  try {
    const threshold = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
    const STORE_SOURCES = new Set(['play_store', 'app_store']);
    const snapshot = await getDocs(collection(db, 'users'));
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.placeholder) return;
      if (!STORE_SOURCES.has(data.installSource)) return;
      if (!data.fcmToken || !data.fcmToken.startsWith('ExponentPushToken')) return;
      if (!data.lastActive) { count++; return; }
      if (data.lastActive.toDate() <= threshold) count++;
    });
    return count;
  } catch {
    return 0;
  }
};

/**
 * إرسال إشعار إعادة تفاعل للمستخدمين غير النشطين
 */
export const sendReengagementNotification = async (params: {
  translations: NotificationTranslations;
  inactiveDays: number;
  actionUrl?: string;
}): Promise<SendResult> => {
  const { translations, inactiveDays, actionUrl } = params;
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;
  const perLanguage: { [lang: string]: number } = {};

  try {
    // Fetch inactive users with configurable threshold
    const threshold = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
    const STORE_SOURCES = new Set(['play_store', 'app_store']);
    const snapshot = await getDocs(collection(db, 'users'));
    const users: UserToken[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.placeholder) return;
      if (!STORE_SOURCES.has(data.installSource)) return;
      if (!data.fcmToken || !data.fcmToken.startsWith('ExponentPushToken')) return;
      const isInactive = !data.lastActive || data.lastActive.toDate() <= threshold;
      if (isInactive) {
        users.push({
          id: doc.id,
          fcmToken: data.fcmToken,
          platform: data.platform || 'unknown',
          language: data.language || 'ar',
          country: data.country || 'SA',
          lastActive: data.lastActive,
        });
      }
    });

    if (users.length === 0) {
      return { success: false, sentCount: 0, failedCount: 0, errors: ['لا يوجد مستخدمين غير نشطين'], perLanguage: {} };
    }

    const messages: ExpoPushMessage[] = users.map(user => {
      const translation = getTranslationForUser(translations, user.language);
      perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;
      return {
        to: user.fcmToken,
        title: translation.title,
        body: translation.body,
        sound: 'default',
        priority: 'high' as const,
        channelId: 'general',
        data: { actionType: 'screen', actionUrl: actionUrl || '/', type: 'reengagement' },
      };
    });

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch);
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
      if (i + BATCH_SIZE < messages.length) await new Promise(r => setTimeout(r, 100));
    }

    await addDoc(collection(db, 'notifications'), {
      translations,
      targetAudience: 'inactive',
      actionType: 'screen',
      actionUrl: actionUrl || '/',
      status: 'sent',
      type: 'reengagement',
      inactiveDays,
      sentCount,
      failedCount,
      perLanguage,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return { success: sentCount > 0, sentCount, failedCount, errors: errors.slice(0, 10), perLanguage };
  } catch (error) {
    return { success: false, sentCount, failedCount, errors: [(error as Error).message], perLanguage };
  }
};

// ==================== إشعار التحديث ====================

/**
 * ترجمات إشعار تحديث التطبيق (12 لغة)
 */
export const UPDATE_NOTIFICATION_TRANSLATIONS: NotificationTranslations = {
  ar: { title: '🎉 تحديث جديد متاح', body: 'يتوفر إصدار جديد من روح المسلم. حدّث الآن للحصول على أفضل تجربة.' },
  en: { title: '🎉 New Update Available', body: 'A new version of Rooh Al-Muslim is available. Update now for the best experience.' },
  fr: { title: '🎉 Nouvelle mise à jour disponible', body: 'Une nouvelle version de Rooh Al-Muslim est disponible. Mettez à jour maintenant.' },
  de: { title: '🎉 Neues Update verfügbar', body: 'Eine neue Version von Rooh Al-Muslim ist verfügbar. Jetzt aktualisieren.' },
  es: { title: '🎉 Nueva actualización disponible', body: 'Una nueva versión de Rooh Al-Muslim está disponible. Actualiza ahora.' },
  tr: { title: '🎉 Yeni Güncelleme Mevcut', body: 'Rooh Al-Muslim uygulamasının yeni sürümü mevcut. En iyi deneyim için şimdi güncelleyin.' },
  ur: { title: '🎉 نئی اپ ڈیٹ دستیاب ہے', body: 'روح المسلم کا نیا ورژن دستیاب ہے۔ بہتر تجربے کے لیے ابھی اپ ڈیٹ کریں۔' },
  id: { title: '🎉 Pembaruan Baru Tersedia', body: 'Versi baru Rooh Al-Muslim tersedia. Perbarui sekarang untuk pengalaman terbaik.' },
  ms: { title: '🎉 Kemas Kini Baharu Tersedia', body: 'Versi baharu Rooh Al-Muslim tersedia. Kemas kini sekarang untuk pengalaman terbaik.' },
  hi: { title: '🎉 नया अपडेट उपलब्ध', body: 'रूह अल-मुस्लिम का नया संस्करण उपलब्ध है। सर्वोत्तम अनुभव के लिए अभी अपडेट करें।' },
  bn: { title: '🎉 নতুন আপডেট পাওয়া যাচ্ছে', body: 'রূহ আল-মুসলিমের নতুন সংস্করণ পাওয়া যাচ্ছে। সেরা অভিজ্ঞতার জন্য এখনই আপডেট করুন।' },
  ru: { title: '🎉 Доступно новое обновление', body: 'Доступна новая версия Rooh Al-Muslim. Обновите сейчас для лучшего опыта.' },
};

/**
 * إرسال إشعار تحديث التطبيق لجميع المستخدمين
 * يُرسل لينك المتجر المناسب حسب منصة كل مستخدم (iOS → App Store, Android → Play Store)
 */
export const sendUpdatePushNotification = async (
  storeUrlIos: string,
  storeUrlAndroid: string,
): Promise<SendResult> => {
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;
  const perLanguage: { [lang: string]: number } = {};
  const fallbackUrl = storeUrlAndroid || storeUrlIos;

  try {
    const users = await fetchUserTokens('all');
    if (users.length === 0) {
      return { success: false, sentCount: 0, failedCount: 0, errors: ['لا يوجد مستخدمين'], perLanguage: {} };
    }

    const messages: ExpoPushMessage[] = users.map(user => {
      const translation = getTranslationForUser(UPDATE_NOTIFICATION_TRANSLATIONS, user.language);
      perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;

      // إرسال لينك المتجر المناسب حسب المنصة
      const storeUrl = user.platform === 'ios'
        ? (storeUrlIos || fallbackUrl)
        : (storeUrlAndroid || fallbackUrl);

      return {
        to: user.fcmToken,
        title: translation.title,
        body: translation.body,
        sound: 'default' as const,
        priority: 'high' as const,
        channelId: 'general',
        ttl: 86400,
        _displayInForeground: true,
        data: {
          actionType: 'url',
          actionUrl: storeUrl,
          language: user.language,
          type: 'admin',
        },
      };
    });

    const notifDocRef = await addDoc(collection(db, 'notifications'), {
      translations: UPDATE_NOTIFICATION_TRANSLATIONS,
      targetAudience: 'all',
      actionType: 'url',
      actionUrl: fallbackUrl,
      status: 'sending',
      type: 'update',
      sentCount: 0,
      failedCount: 0,
      perLanguage: {},
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: serverTimestamp(),
    });

    for (const msg of messages) {
      (msg as any).data = { ...(msg as any).data, notificationDocId: notifDocRef.id };
    }

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch);
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const { updateDoc: updateDocFn } = await import('firebase/firestore');
    await updateDocFn(notifDocRef, {
      status: 'sent',
      sentCount,
      failedCount,
      perLanguage,
      deliveredCount: sentCount,
      sentAt: serverTimestamp(),
    });

    return { success: sentCount > 0, sentCount, failedCount, errors: errors.slice(0, 10), perLanguage };
  } catch (error) {
    return { success: false, sentCount, failedCount, errors: [(error as Error).message], perLanguage };
  }
};

/**
 * ترجمات إشعار الفوز بالجائزة الشهرية
 */
const PRIZE_NOTIFICATION_TRANSLATIONS: NotificationTranslations = {
  ar: { title: 'مبارك! 🎉', body: 'أنت من أكثر ٣ مستخدمين نشاطاً هذا الشهر. تم تفعيل جميع المميزات المجانية لمدة شهر!' },
  en: { title: 'Congratulations! 🎉', body: 'You are one of the top 3 most active users this month. All premium features have been activated for free for a month!' },
  fr: { title: 'Félicitations ! 🎉', body: "Vous êtes l'un des 3 utilisateurs les plus actifs ce mois-ci. Toutes les fonctionnalités premium ont été activées gratuitement pendant un mois !" },
  de: { title: 'Herzlichen Glückwunsch! 🎉', body: 'Sie gehören zu den 3 aktivsten Nutzern diesen Monat. Alle Premium-Funktionen wurden für einen Monat kostenlos aktiviert!' },
  es: { title: '¡Felicidades! 🎉', body: '¡Eres uno de los 3 usuarios más activos este mes. Todas las funciones premium se han activado gratis por un mes!' },
  tr: { title: 'Tebrikler! 🎉', body: 'Bu ay en aktif 3 kullanıcıdan birisiniz. Tüm premium özellikler bir ay boyunca ücretsiz etkinleştirildi!' },
  ur: { title: 'مبارک ہو! 🎉', body: 'آپ اس مہینے سب سے زیادہ فعال ۳ صارفین میں سے ایک ہیں۔ تمام پریمیم سہولیات ایک ماہ کے لیے مفت فعال کر دی گئی ہیں!' },
  id: { title: 'Selamat! 🎉', body: 'Anda salah satu dari 3 pengguna paling aktif bulan ini. Semua fitur premium telah diaktifkan gratis selama sebulan!' },
  ms: { title: 'Tahniah! 🎉', body: 'Anda antara 3 pengguna paling aktif bulan ini. Semua ciri premium telah diaktifkan secara percuma selama sebulan!' },
  hi: { title: 'बधाई हो! 🎉', body: 'आप इस महीने के शीर्ष 3 सबसे सक्रिय उपयोगकर्ताओं में से एक हैं। सभी प्रीमियम सुविधाएं एक महीने के लिए मुफ्त सक्रिय कर दी गई हैं!' },
  bn: { title: 'অভিনন্দন! 🎉', body: 'আপনি এই মাসের সবচেয়ে সক্রিয় ৩ জন ব্যবহারকারীর একজন। সমস্ত প্রিমিয়াম বৈশিষ্ট্য এক মাসের জন্য বিনামূল্যে সক্রিয় করা হয়েছে!' },
  ru: { title: 'Поздравляем! 🎉', body: 'Вы один из 3 самых активных пользователей в этом месяце. Все премиум-функции активированы бесплатно на месяц!' },
};

/**
 * إرسال إشعار للفائزين بالجائزة الشهرية
 */
export const sendPrizeNotification = async (
  winnerUserIds: string[]
): Promise<SendResult> => {
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;
  const perLanguage: { [lang: string]: number } = {};

  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const winners: UserToken[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!winnerUserIds.includes(docSnap.id)) return;
      if (!data.fcmToken || !data.fcmToken.startsWith('ExponentPushToken')) return;
      winners.push({
        id: docSnap.id,
        fcmToken: data.fcmToken,
        platform: data.platform || 'unknown',
        language: data.language || 'ar',
        country: data.country || 'SA',
        lastActive: data.lastActive,
      });
    });

    if (winners.length === 0) {
      return { success: false, sentCount: 0, failedCount: 0, errors: ['لا يوجد توكنات للفائزين'], perLanguage: {} };
    }

    const messages: ExpoPushMessage[] = winners.map(user => {
      const translation = getTranslationForUser(PRIZE_NOTIFICATION_TRANSLATIONS, user.language);
      perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;
      return {
        to: user.fcmToken,
        title: translation.title,
        body: translation.body,
        sound: 'default',
        priority: 'high' as const,
        channelId: 'general',
        data: { actionType: 'screen', actionUrl: '/honor-board', type: 'prize' },
      };
    });

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch);
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
    }

    await addDoc(collection(db, 'notifications'), {
      translations: PRIZE_NOTIFICATION_TRANSLATIONS,
      targetAudience: 'custom',
      actionType: 'screen',
      actionUrl: '/honor-board',
      status: 'sent',
      type: 'prize',
      winnerUserIds,
      sentCount,
      failedCount,
      perLanguage,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return { success: sentCount > 0, sentCount, failedCount, errors: errors.slice(0, 10), perLanguage };
  } catch (error) {
    return { success: false, sentCount, failedCount, errors: [(error as Error).message], perLanguage };
  }
};
