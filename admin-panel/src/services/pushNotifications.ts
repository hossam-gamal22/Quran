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
}

export interface PushNotificationPayload {
  // الترجمات لكل اللغات
  translations: NotificationTranslations;
  // الاستهداف
  targetAudience: 'all' | 'ios' | 'android' | 'active' | 'inactive' | 'custom';
  targetLanguages?: string[];
  targetCountries?: string[];
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

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

// ==================== دوال مساعدة ====================

/**
 * جلب توكنات المستخدمين من Firebase
 */
const fetchUserTokens = async (
  targetAudience: string,
  targetLanguages?: string[],
  targetCountries?: string[]
): Promise<UserToken[]> => {
  try {
    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef);
    
    // تصفية حسب المنصة
    if (targetAudience === 'ios') {
      usersQuery = query(usersRef, where('platform', '==', 'ios'));
    } else if (targetAudience === 'android') {
      usersQuery = query(usersRef, where('platform', '==', 'android'));
    }
    
    const snapshot = await getDocs(usersQuery);
    let users: UserToken[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
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
 * إرسال دفعة من الإشعارات
 */
const sendBatch = async (messages: ExpoPushMessage[]): Promise<BatchResult> => {
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];
    
    if (result.data) {
      result.data.forEach((item: any, index: number) => {
        if (item.status === 'ok') {
          successCount++;
        } else {
          failureCount++;
          errors.push(`Token ${index}: ${item.message || 'Unknown error'}`);
        }
      });
    }
    
    return { successCount, failureCount, errors };
  } catch (error) {
    console.error('Batch send error:', error);
    return {
      successCount: 0,
      failureCount: messages.length,
      errors: [(error as Error).message],
    };
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
      payload.targetCountries
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
        data: {
          actionType: payload.actionType,
          actionUrl: payload.actionUrl,
          imageUrl: payload.imageUrl,
          language: user.language,
        },
      };
    });
    
    // 3. إرسال على دفعات
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch);
      
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
      
      // تأخير بين الدفعات
      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 4. تسجيل الإشعار في Firebase
    await addDoc(collection(db, 'notifications'), {
      translations: payload.translations,
      targetAudience: payload.targetAudience,
      targetLanguages: payload.targetLanguages,
      targetCountries: payload.targetCountries,
      actionType: payload.actionType,
      actionUrl: payload.actionUrl,
      imageUrl: payload.imageUrl,
      status: 'sent',
      sentCount,
      failedCount,
      perLanguage,
      deliveredCount: sentCount,
      openedCount: 0,
      clickedCount: 0,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
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
  
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        to: token,
        title: msg.title,
        body: msg.body,
        sound: 'default',
      }]),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Test notification error:', error);
    return false;
  }
};

/**
 * التحقق من صلاحية التوكن
 */
export const isValidExpoToken = (token: string): boolean => {
  return token.startsWith('ExponentPushToken[') && token.endsWith(']');
};

/**
 * الحصول على إحصائيات المستخدمين
 */
export const getUserStats = async (): Promise<UserStats> => {
  try {
    const users = await fetchUserTokens('all');
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // حساب التوزيع حسب اللغة
    const byLanguage: { [lang: string]: number } = {};
    users.forEach(u => {
      byLanguage[u.language] = (byLanguage[u.language] || 0) + 1;
    });
    
    return {
      total: users.length,
      withTokens: users.filter(u => u.fcmToken).length,
      ios: users.filter(u => u.platform === 'ios').length,
      android: users.filter(u => u.platform === 'android').length,
      active: users.filter(u => {
        if (!u.lastActive) return false;
        return u.lastActive.toDate() > weekAgo;
      }).length,
      byLanguage,
    };
  } catch (error) {
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
    const snapshot = await getDocs(collection(db, 'users'));
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
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
    const snapshot = await getDocs(collection(db, 'users'));
    const users: UserToken[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
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
