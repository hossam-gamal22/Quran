// admin-panel/src/services/pushNotifications.ts
// خدمة إرسال الإشعارات عبر Expo Push API
// آخر تحديث: 2026-03-04
// محدث لدعم 12 لغة

import { db } from '../firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc as firestoreDoc,
  query,
  where,
  Timestamp,
  addDoc,
  serverTimestamp,
  updateDoc,
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
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  interruptionLevel?: 'active' | 'critical' | 'passive' | 'time-sensitive';
  ttl?: number;
  _contentAvailable?: boolean;
  _displayInForeground?: boolean;
}

interface ExpoPushTicket {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
    [key: string]: unknown;
  };
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

export interface SendResult {
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
  countrySource: string;
  countryVerified: boolean;
  lastActive: Timestamp | null;
}

interface PrayerLocationDoc {
  latitude?: number;
  longitude?: number;
  city?: string;
  updatedAt?: unknown;
}

interface BatchResult {
  successCount: number;
  failureCount: number;
  errors: string[];
  uninstalledCount: number;
}

interface PushTarget {
  id?: string;
  fcmToken: string;
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

const hasPrayerLocation = (data: Record<string, any>, prayerLocation?: PrayerLocationDoc): boolean => (
  typeof data.locationLatitude === 'number' ||
  typeof data.locationLongitude === 'number' ||
  typeof prayerLocation?.latitude === 'number' ||
  typeof prayerLocation?.longitude === 'number'
);

const resolveCountryForTargeting = (
  data: Record<string, any>,
  prayerLocation?: PrayerLocationDoc,
): { country: string; countrySource: string; countryVerified: boolean } => {
  const storedCountry = String(data.country || '').toUpperCase();
  const countrySource = String(data.countrySource || '');
  const locationAvailable = hasPrayerLocation(data, prayerLocation);
  const prayerCountry = String(data.prayerCountryCode || '').toUpperCase();

  // Source of truth = prayer location whenever the user has confirmed one
  // from the prayer screen. This is the ONLY trusted source for country.
  if (prayerCountry) {
    return { country: prayerCountry, countrySource: 'gps', countryVerified: true };
  }
  if (locationAvailable && countrySource === 'gps' && storedCountry) {
    return { country: storedCountry, countrySource: 'gps', countryVerified: true };
  }
  if (countrySource === 'admin' && storedCountry) {
    return { country: storedCountry, countrySource: 'admin', countryVerified: true };
  }

  // No trusted country signal. Device locale and timezone are NOT used as
  // fallbacks — users without GPS-confirmed location cannot be targeted by
  // country. They still receive global / language / platform campaigns.
  return { country: '', countrySource: countrySource || 'unknown', countryVerified: false };
};

const fetchPrayerLocationsByUserId = async (): Promise<Map<string, PrayerLocationDoc>> => {
  const locations = new Map<string, PrayerLocationDoc>();
  try {
    const snapshot = await getDocs(collection(db, 'userPrayerSettings'));
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const latitude = typeof data.latitude === 'number' ? data.latitude : undefined;
      const longitude = typeof data.longitude === 'number' ? data.longitude : undefined;
      if (latitude === undefined && longitude === undefined) return;
      locations.set(docSnap.id, {
        latitude,
        longitude,
        city: typeof data.city === 'string' ? data.city : undefined,
        updatedAt: data.updatedAt,
      });
    });
  } catch (error) {
    console.warn('Could not load prayer locations for notification targeting:', error);
  }
  return locations;
};

const buildUserToken = (
  id: string,
  data: Record<string, any>,
  prayerLocation?: PrayerLocationDoc,
): UserToken | null => {
  if (!data.fcmToken || !data.fcmToken.startsWith('ExponentPushToken')) return null;
  if (data.appStatus === 'uninstalled' || data.pushTokenInvalid === true) return null;
  const countryInfo = resolveCountryForTargeting(data, prayerLocation);
  return {
    id,
    fcmToken: data.fcmToken,
    platform: data.platform || 'unknown',
    language: data.language || 'ar',
    country: countryInfo.country,
    countrySource: countryInfo.countrySource,
    countryVerified: countryInfo.countryVerified,
    lastActive: data.lastActive,
  };
};

const PREMIUM_GRANT_NOTIFICATION_TRANSLATIONS: NotificationTranslations = {
  ar: { title: 'تم تفعيل البريميم 🎉', body: 'تم منحك اشتراكاً مميزاً من الإدارة. استمتع بكل المميزات الآن.' },
  en: { title: 'Premium activated 🎉', body: 'Your premium subscription has been granted by the admin team. Enjoy all premium features now.' },
  fr: { title: 'Premium activé 🎉', body: "Votre abonnement premium a été accordé par l'équipe d'administration. Profitez de toutes les fonctionnalités." },
  de: { title: 'Premium aktiviert 🎉', body: 'Dein Premium-Abo wurde vom Admin-Team aktiviert. Viel Freude mit allen Premium-Funktionen.' },
  es: { title: 'Premium activado 🎉', body: 'El equipo de administración activó tu suscripción premium. Disfruta todas las funciones.' },
  tr: { title: 'Premium etkinleştirildi 🎉', body: 'Premium aboneliğiniz yönetici ekibi tarafından tanımlandı. Tüm premium özelliklerin keyfini çıkarın.' },
  ur: { title: 'پریمیم فعال ہو گیا 🎉', body: 'انتظامیہ نے آپ کے لیے پریمیم سبسکرپشن فعال کر دی ہے۔ تمام پریمیم سہولیات استعمال کریں۔' },
  id: { title: 'Premium aktif 🎉', body: 'Langganan premium Anda telah diberikan oleh admin. Nikmati semua fitur premium sekarang.' },
  ms: { title: 'Premium diaktifkan 🎉', body: 'Langganan premium anda telah diberikan oleh pentadbir. Nikmati semua ciri premium sekarang.' },
  hi: { title: 'प्रीमियम सक्रिय हो गया 🎉', body: 'एडमिन टीम ने आपकी प्रीमियम सदस्यता सक्रिय कर दी है। अब सभी प्रीमियम सुविधाओं का आनंद लें।' },
  bn: { title: 'প্রিমিয়াম চালু হয়েছে 🎉', body: 'অ্যাডমিন টিম আপনার প্রিমিয়াম সাবস্ক্রিপশন চালু করেছে। এখন সব প্রিমিয়াম সুবিধা উপভোগ করুন।' },
  ru: { title: 'Premium активирован 🎉', body: 'Администратор активировал для вас premium-подписку. Все premium-функции уже доступны.' },
};

// ==================== دوال مساعدة ====================

/**
 * جلب توكنات المستخدمين من Firebase
 */
const fetchUserTokens = async (
  targetAudience: string,
  targetLanguages?: string[],
  targetCountries?: string[],
  targetUserId?: string,
  requireVerifiedCountry = true
): Promise<UserToken[]> => {
  try {
    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef);

    // Single user targeting — fetch just that one doc
    if (targetAudience === 'single_user' && targetUserId) {
      const userSnap = await getDoc(firestoreDoc(db, 'users', targetUserId));
      if (!userSnap.exists()) return [];
      const data = userSnap.data();
      const prayerSnap = await getDoc(firestoreDoc(db, 'userPrayerSettings', targetUserId)).catch(() => null);
      const user = buildUserToken(
        userSnap.id,
        data,
        prayerSnap?.exists() ? prayerSnap.data() as PrayerLocationDoc : undefined,
      );
      return user ? [user] : [];
    }

    if (targetAudience === 'single_user') {
      return [];
    }

    // تصفية حسب المنصة
    if (targetAudience === 'ios') {
      usersQuery = query(usersRef, where('platform', '==', 'ios'));
    } else if (targetAudience === 'android') {
      usersQuery = query(usersRef, where('platform', '==', 'android'));
    }
    
    const [snapshot, prayerLocationsByUserId] = await Promise.all([
      getDocs(usersQuery),
      fetchPrayerLocationsByUserId(),
    ]);
    const STORE_SOURCES = new Set(['play_store', 'app_store']);
    let users: UserToken[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // SSOT: skip placeholders and non-store installs
      if (data.placeholder) return;
      if (!STORE_SOURCES.has(data.installSource)) return;
      // تجاهل المستخدمين بدون توكن
      const user = buildUserToken(doc.id, data, prayerLocationsByUserId.get(doc.id));
      if (user) users.push(user);
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
      const countrySet = new Set(targetCountries.map(c => c.toUpperCase()));
      users = users.filter(u =>
        countrySet.has((u.country || '').toUpperCase()) &&
        (!requireVerifiedCountry || u.countryVerified)
      );
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

export interface HijriOverrideSyncPayload {
  countryCode: string;
  countryName: string;
  hijriYear: number;
  hijriMonth: number;
  monthLength: 29 | 30;
  hijriStartGregorian: string;
  source: string;
  sourceUrl?: string;
  isVerified: boolean;
  deleted?: boolean;
}

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
const USE_NETLIFY_API =
  (import.meta.env.VITE_USE_NETLIFY_API as string | undefined) === 'true' ||
  !import.meta.env.DEV;
const USE_DIRECT_NETLIFY_FUNCTIONS =
  import.meta.env.PROD ||
  (import.meta.env.VITE_NETLIFY_FUNCTIONS_DIRECT as string | undefined) === 'true';

const isDeviceNotRegisteredTicket = (ticket: ExpoPushTicket | undefined): boolean => (
  ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
);

const markUninstalledTargets = async (
  targets: PushTarget[],
  tickets: ExpoPushTicket[],
): Promise<number> => {
  const userIds = new Set<string>();
  tickets.forEach((ticket, index) => {
    const target = targets[index];
    if (target?.id && isDeviceNotRegisteredTicket(ticket)) {
      userIds.add(target.id);
    }
  });

  if (userIds.size === 0) return 0;

  await Promise.all(Array.from(userIds).map(async (userId) => {
    try {
      await updateDoc(firestoreDoc(db, 'users', userId), {
        appStatus: 'uninstalled',
        appStatusUpdatedAt: serverTimestamp(),
        uninstalledDetectedAt: serverTimestamp(),
        uninstallDetectionSource: 'expo_push_device_not_registered',
        pushTokenInvalid: true,
        lastPushError: 'DeviceNotRegistered',
        fcmToken: '',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Could not mark user as uninstalled:', userId, error);
    }
  }));
  const { invalidateActiveDevicesCache } = await import('../utils/user-query');
  invalidateActiveDevicesCache();

  return userIds.size;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const fetchExpoReceipts = async (
  pushUrl: string,
  sessionToken: string,
  ticketIds: string[],
): Promise<Record<string, ExpoPushTicket>> => {
  if (ticketIds.length === 0) return {};
  const res = await fetch(pushUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ action: 'receipts', ids: ticketIds }),
  });
  if (!res.ok) return {};
  const result = await res.json();
  return (result.data ?? {}) as Record<string, ExpoPushTicket>;
};

const sendBatch = async (
  messages: ExpoPushMessage[],
  targets: PushTarget[] = [],
): Promise<BatchResult> => {
  // Vite-only dev keeps the lightweight proxy. Netlify dev/prod use the
  // serverless function so auth and Expo token handling match production.
  const pushUrl = USE_DIRECT_NETLIFY_FUNCTIONS
    ? '/.netlify/functions/expo-push'
    : USE_NETLIFY_API ? '/api/expo-push' : '/expo-push';
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
    const tickets = (result.data ?? []) as ExpoPushTicket[];
    tickets.forEach((t, i) => {
      if (t.status === 'ok') ok++;
      else { fail++; errs.push(`Token ${i}: ${t.message ?? 'error'}`); }
    });
    let uninstalledCount = await markUninstalledTargets(targets, tickets);

    const canCheckReceipts = (USE_NETLIFY_API || USE_DIRECT_NETLIFY_FUNCTIONS) && tickets.some(t => t.status === 'ok' && t.id);
    if (canCheckReceipts) {
      await sleep(1000);
      const ticketIndexById = new Map<string, number>();
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok' && ticket.id) ticketIndexById.set(ticket.id, index);
      });
      const receipts = await fetchExpoReceipts(pushUrl, sessionToken, Array.from(ticketIndexById.keys()));
      const receiptTickets: ExpoPushTicket[] = [];
      let receiptFailures = 0;
      Object.entries(receipts).forEach(([ticketId, receipt]) => {
        const index = ticketIndexById.get(ticketId);
        if (index === undefined) return;
        receiptTickets[index] = receipt;
        if (receipt.status === 'error') {
          receiptFailures++;
          errs.push(`Receipt ${index}: ${receipt.message ?? receipt.details?.error ?? 'error'}`);
        }
      });
      const receiptUninstalledCount = await markUninstalledTargets(targets, receiptTickets);
      if (receiptFailures > 0) {
        ok = Math.max(0, ok - receiptFailures);
        fail += receiptFailures;
      }
      uninstalledCount += receiptUninstalledCount;
    }

    console.log(`✅ Sent ${ok} notifications${uninstalledCount ? `, marked ${uninstalledCount} uninstalled` : ''}`);
    return { successCount: ok, failureCount: fail, errors: errs, uninstalledCount };
  } catch (error: any) {
    console.error('Push send error:', error);
    return { successCount: 0, failureCount: messages.length, errors: [error.message], uninstalledCount: 0 };
  }
};

// ==================== الدوال الرئيسية ====================

/**
 * Sends a lightweight data push when an admin updates a country's Hijri date.
 * The mobile app caches this override locally, invalidates its Hijri cache, and
 * refreshes widget shared data. Country verification is intentionally relaxed
 * here so users whose country came from device locale still receive official
 * date corrections for that country.
 */
export const sendHijriOverrideSyncNotification = async (
  payload: HijriOverrideSyncPayload
): Promise<SendResult> => {
  const users = await fetchUserTokens('custom', undefined, [payload.countryCode], undefined, false);
  if (users.length === 0) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: ['لا يوجد مستخدمين لديهم push token لهذه الدولة'],
      perLanguage: {},
    };
  }

  const data = {
    type: 'hijri_override_sync',
    actionType: 'screen',
    actionUrl: '/hijri',
    countryCode: payload.countryCode.toUpperCase(),
    countryName: payload.countryName,
    hijriYear: payload.hijriYear,
    hijriMonth: payload.hijriMonth,
    monthLength: payload.monthLength,
    hijriStartGregorian: payload.hijriStartGregorian,
    source: payload.source,
    sourceUrl: payload.sourceUrl || '',
    isVerified: payload.isVerified,
    deleted: Boolean(payload.deleted),
    updatedAt: new Date().toISOString(),
  };

  const messages: ExpoPushMessage[] = users.map(user => ({
    to: user.fcmToken,
    priority: 'high',
    ttl: 86400,
    _contentAvailable: true,
    _displayInForeground: false,
    sound: null,
    channelId: 'silent',
    data: {
      ...data,
      language: user.language,
    },
  }));

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const perLanguage: Record<string, number> = {};
  for (const user of users) {
    perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;
  }

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const batchTargets = users.slice(i, i + BATCH_SIZE);
    const result = await sendBatch(batch, batchTargets);
    sentCount += result.successCount;
    failedCount += result.failureCount;
    errors.push(...result.errors);
    if (i + BATCH_SIZE < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  await addDoc(collection(db, 'notifications'), {
    type: 'hijri_override_sync',
    targetAudience: 'custom',
    targetCountries: [payload.countryCode.toUpperCase()],
    payload: data,
    status: sentCount > 0 ? 'sent' : 'failed',
    sentCount,
    failedCount,
    perLanguage,
    deliveredCount: sentCount,
    createdAt: serverTimestamp(),
    sentAt: serverTimestamp(),
    ...(sentCount === 0 ? { error: errors[0] || 'No matching users or Expo send failed' } : {}),
  });

  return {
    success: sentCount > 0,
    sentCount,
    failedCount,
    errors,
    perLanguage,
  };
};

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
        interruptionLevel: 'time-sensitive',
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
      const batchTargets = users.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch, batchTargets);

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
      status: sentCount > 0 ? 'sent' : 'failed',
      sentCount,
      failedCount,
      perLanguage,
      deliveredCount: sentCount,
      sentAt: serverTimestamp(),
      ...(sentCount === 0 ? { error: errors[0] || 'No matching users or Expo send failed' } : {}),
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
 * Send a premium-grant push to one user after the admin panel updates
 * users/{userId}.adminPremium.
 */
export const sendPremiumGrantNotification = async (
  userId: string,
  grant: { plan?: string; expiresAt?: string | null; reason?: string } = {}
): Promise<SendResult> => {
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;
  const perLanguage: { [lang: string]: number } = {};

  try {
    const users = await fetchUserTokens('single_user', undefined, undefined, userId);

    if (users.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['لا يوجد Expo Push Token صالح لهذا المستخدم'],
        perLanguage: {},
      };
    }

    const messages: ExpoPushMessage[] = users.map(user => {
      const translation = getTranslationForUser(PREMIUM_GRANT_NOTIFICATION_TRANSLATIONS, user.language);
      perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;

      return {
        to: user.fcmToken,
        title: translation.title,
        body: translation.body,
        sound: 'default',
        priority: 'high',
        channelId: 'general',
        interruptionLevel: 'time-sensitive',
        ttl: 86400,
        _displayInForeground: true,
        data: {
          actionType: 'screen',
          actionUrl: '/subscription',
          type: 'premium_granted',
          grantPlan: grant.plan || '',
          grantExpiresAt: grant.expiresAt || '',
        },
      };
    });

    const notificationDoc: Record<string, any> = {
      translations: PREMIUM_GRANT_NOTIFICATION_TRANSLATIONS,
      targetAudience: 'single_user',
      targetUserId: userId,
      actionType: 'screen',
      actionUrl: '/subscription',
      status: 'sending',
      type: 'premium_grant',
      sentCount: 0,
      failedCount: 0,
      perLanguage: {},
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: serverTimestamp(),
    };
    if (grant.plan) notificationDoc.grantPlan = grant.plan;
    if (grant.expiresAt) notificationDoc.grantExpiresAt = grant.expiresAt;
    if (grant.reason) notificationDoc.grantReason = grant.reason;

    const notifDocRef = await addDoc(collection(db, 'notifications'), notificationDoc);

    for (const msg of messages) {
      (msg as any).data = { ...(msg as any).data, notificationDocId: notifDocRef.id };
    }

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchTargets = users.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch, batchTargets);
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
    }

    const { updateDoc: updateDocFn } = await import('firebase/firestore');
    await updateDocFn(notifDocRef, {
      status: sentCount > 0 ? 'sent' : 'failed',
      sentCount,
      failedCount,
      perLanguage,
      deliveredCount: sentCount,
      sentAt: serverTimestamp(),
      ...(sentCount === 0 ? { error: errors[0] || 'No matching users or Expo send failed' } : {}),
    });

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors: errors.slice(0, 10),
      perLanguage,
    };
  } catch (error) {
    return {
      success: false,
      sentCount,
      failedCount,
      errors: [(error as Error).message],
      perLanguage,
    };
  }
};

const QUESTION_ANSWERED_NOTIFICATION_TRANSLATIONS: NotificationTranslations = {
  ar: { title: 'تم الرد على سؤالك ✅', body: 'اضغط لقراءة الإجابة من فريق روح المسلم.' },
  en: { title: 'Your question has been answered ✅', body: 'Tap to read the reply from the Rooh Al-Muslim team.' },
  fr: { title: 'Réponse à votre question ✅', body: "Appuyez pour lire la réponse de l'équipe Rooh Al-Muslim." },
  de: { title: 'Antwort auf deine Frage ✅', body: 'Tippe, um die Antwort des Ruh-Al-Muslim-Teams zu lesen.' },
  es: { title: 'Respuesta a tu pregunta ✅', body: 'Toca para leer la respuesta del equipo de Rooh Al-Muslim.' },
  tr: { title: 'Sorunuza cevap geldi ✅', body: 'Rooh Al-Muslim ekibinin cevabını okumak için dokunun.' },
  ur: { title: 'آپ کے سوال کا جواب آ گیا ✅', body: 'روح المسلم ٹیم کی طرف سے جواب پڑھنے کے لیے دبائیں۔' },
  id: { title: 'Pertanyaan Anda dijawab ✅', body: 'Ketuk untuk membaca jawaban dari tim Rooh Al-Muslim.' },
  ms: { title: 'Soalan anda telah dijawab ✅', body: 'Ketik untuk membaca jawapan daripada pasukan Rooh Al-Muslim.' },
  hi: { title: 'आपके सवाल का जवाब आ गया ✅', body: 'रूह अल-मुस्लिम टीम का जवाब पढ़ने के लिए टैप करें।' },
  bn: { title: 'আপনার প্রশ্নের উত্তর এসেছে ✅', body: 'রুহ আল-মুসলিম দলের উত্তর পড়তে ট্যাপ করুন।' },
  ru: { title: 'Ответ на ваш вопрос ✅', body: 'Нажмите, чтобы прочитать ответ команды Rooh Al-Muslim.' },
};

/**
 * Send a push to the user who submitted a question once the admin publishes
 * an in-app reply. Targets either the `fcmToken` stored on the question doc
 * (works for anonymous submissions) or — as a fallback — the user's current
 * device token via the `users` collection when only `userId` is known.
 *
 * Tapping the notification deep-links to `/qa-thread/{questionId}` where the
 * app renders the question, the corrected answer, the disclaimer, and sources.
 */
export const sendQuestionAnsweredNotification = async (params: {
  questionId: string;
  userId?: string | null;
  fcmToken?: string | null;
  language?: string;
  questionPreview?: string;
}): Promise<SendResult> => {
  const { questionId, userId, fcmToken, language, questionPreview } = params;
  const perLanguage: { [lang: string]: number } = {};

  const targets: { token: string; language: string; userId?: string }[] = [];
  if (fcmToken && isValidExpoToken(fcmToken)) {
    targets.push({ token: fcmToken, language: language || 'ar', userId: userId || undefined });
  } else if (userId) {
    const users = await fetchUserTokens('single_user', undefined, undefined, userId);
    users.forEach(u => targets.push({ token: u.fcmToken, language: u.language || language || 'ar', userId: u.id }));
  }

  if (targets.length === 0) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: ['لا يوجد توكن لهذا المستخدم — لن يصل الإشعار. يمكنك مراسلته بالبريد.'],
      perLanguage: {},
    };
  }

  const actionUrl = `/qa-thread/${questionId}`;
  const messages: ExpoPushMessage[] = targets.map(t => {
    const translation = getTranslationForUser(QUESTION_ANSWERED_NOTIFICATION_TRANSLATIONS, t.language);
    perLanguage[t.language] = (perLanguage[t.language] || 0) + 1;
    return {
      to: t.token,
      title: translation.title,
      body: translation.body,
      sound: 'default',
      priority: 'high',
      channelId: 'general',
      interruptionLevel: 'time-sensitive',
      ttl: 86400,
      _displayInForeground: true,
      data: {
        type: 'question_answered',
        actionType: 'screen',
        actionUrl,
        questionId,
        questionPreview: questionPreview ? questionPreview.slice(0, 140) : '',
      },
    };
  });

  const notificationDoc: Record<string, any> = {
    translations: QUESTION_ANSWERED_NOTIFICATION_TRANSLATIONS,
    targetAudience: 'single_user',
    actionType: 'screen',
    actionUrl,
    status: 'sending',
    type: 'question_answered',
    questionId,
    sentCount: 0,
    failedCount: 0,
    perLanguage: {},
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    createdAt: serverTimestamp(),
  };
  if (userId) notificationDoc.targetUserId = userId;

  const notifDocRef = await addDoc(collection(db, 'notifications'), notificationDoc);
  for (const msg of messages) {
    (msg as any).data = { ...(msg as any).data, notificationDocId: notifDocRef.id };
  }

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const batchTargets = targets.slice(i, i + BATCH_SIZE).map(t => ({ id: t.userId, fcmToken: t.token }));
    const result = await sendBatch(batch, batchTargets);
    sentCount += result.successCount;
    failedCount += result.failureCount;
    errors.push(...result.errors);
  }

  const { updateDoc: updateDocFn } = await import('firebase/firestore');
  await updateDocFn(notifDocRef, {
    status: sentCount > 0 ? 'sent' : 'failed',
    sentCount,
    failedCount,
    perLanguage,
    deliveredCount: sentCount,
    sentAt: serverTimestamp(),
    ...(sentCount === 0 ? { error: errors[0] || 'No matching users or Expo send failed' } : {}),
  });

  return {
    success: sentCount > 0,
    sentCount,
    failedCount,
    errors: errors.slice(0, 10),
    perLanguage,
  };
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
    priority: 'high',
    channelId: 'general',
    interruptionLevel: 'time-sensitive',
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
      total: stats.storeRegistered,
      withTokens: stats.withTokens,
      ios: stats.storeIos,
      android: stats.storeAndroid,
      active: stats.storeActive,
      byLanguage: stats.storeByLanguage,
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
    const [snapshot, prayerLocationsByUserId] = await Promise.all([
      getDocs(collection(db, 'users')),
      fetchPrayerLocationsByUserId(),
    ]);
    const users: UserToken[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.placeholder) return;
      if (!STORE_SOURCES.has(data.installSource)) return;
      const isInactive = !data.lastActive || data.lastActive.toDate() <= threshold;
      if (isInactive) {
        const user = buildUserToken(doc.id, data, prayerLocationsByUserId.get(doc.id));
        if (user) users.push(user);
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
        interruptionLevel: 'time-sensitive',
        data: { actionType: 'screen', actionUrl: actionUrl || '/', type: 'reengagement' },
      };
    });

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchTargets = users.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch, batchTargets);
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
      status: sentCount > 0 ? 'sent' : 'failed',
      type: 'reengagement',
      inactiveDays,
      sentCount,
      failedCount,
      deliveredCount: sentCount,
      perLanguage,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      ...(sentCount === 0 ? { error: errors[0] || 'No matching users or Expo send failed' } : {}),
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
        interruptionLevel: 'time-sensitive',
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
      const batchTargets = users.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch, batchTargets);
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const { updateDoc: updateDocFn } = await import('firebase/firestore');
    await updateDocFn(notifDocRef, {
      status: sentCount > 0 ? 'sent' : 'failed',
      sentCount,
      failedCount,
      perLanguage,
      deliveredCount: sentCount,
      sentAt: serverTimestamp(),
      ...(sentCount === 0 ? { error: errors[0] || 'No matching users or Expo send failed' } : {}),
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
    const [snapshot, prayerLocationsByUserId] = await Promise.all([
      getDocs(collection(db, 'users')),
      fetchPrayerLocationsByUserId(),
    ]);
    const winners: UserToken[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!winnerUserIds.includes(docSnap.id)) return;
      const user = buildUserToken(docSnap.id, data, prayerLocationsByUserId.get(docSnap.id));
      if (user) winners.push(user);
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
        interruptionLevel: 'time-sensitive',
        data: { actionType: 'screen', actionUrl: '/honor-board', type: 'prize' },
      };
    });

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchTargets = winners.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch, batchTargets);
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
    }

    await addDoc(collection(db, 'notifications'), {
      translations: PRIZE_NOTIFICATION_TRANSLATIONS,
      targetAudience: 'custom',
      actionType: 'screen',
      actionUrl: '/honor-board',
      status: sentCount > 0 ? 'sent' : 'failed',
      type: 'prize',
      winnerUserIds,
      sentCount,
      failedCount,
      deliveredCount: sentCount,
      perLanguage,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      ...(sentCount === 0 ? { error: errors[0] || 'No matching users or Expo send failed' } : {}),
    });

    return { success: sentCount > 0, sentCount, failedCount, errors: errors.slice(0, 10), perLanguage };
  } catch (error) {
    return { success: false, sentCount, failedCount, errors: [(error as Error).message], perLanguage };
  }
};
