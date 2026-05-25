/**
 * Phase 2 — FCM Push Fallback
 *
 * يرفع موقع المستخدم وإعدادات الحساب إلى Firestore عشان Cloud Function
 * تقدر تحسب أوقات صلاته وترسل push notification احتياطي.
 *
 * Cloud Function تشتغل كل 5 دقائق على queue مفهرسة:
 *  - تنبه المستخدم قبل انتهاء الجدولة المحلية
 *  - تفعّل fallback بعد انتهاء نافذة الإشعارات المحلية
 *  - ترسل فقط للمستخدمين الذين nextPrayerAt لديهم داخل نافذة الأذان
 *
 * هذا fallback "حزام أمان" — لا يستبدل local scheduling، لكن ينقذ المستخدم
 * في الحالات الحرجة (force-stop, OEM kill, exact alarm denied).
 */

import { doc, setDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPrayerLocation } from './storage';
import { getEffectivePrayerCalcSettings } from './prayer-settings-source';
import { computePrayerTimesForDay, type PrayerKey, type PrayerWidgetInputs } from './widget-prayer-calculator';

const SYNC_KEY = '@last_prayer_sync_to_firestore';
const SYNC_THROTTLE_MS = 60 * 60 * 1000; // ساعة
const FALLBACK_SCHEMA_VERSION = 2;
const IOS_LOCAL_PRAYER_SCHEDULE_DAYS = 3;
const ANDROID_LOCAL_PRAYER_SCHEDULE_DAYS = 7;
const REFRESH_REMINDER_LEAD_MS = 12 * 60 * 60 * 1000;
const FALLBACK_PRAYER_ORDER: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

type FallbackSoundSettings = {
  adhanSound: boolean;
  adhanSoundType: string;
  fullAdhanSoundType: string;
  useFullAdhan: boolean;
};

function getLocalPrayerScheduleDays(): number {
  return Platform.OS === 'ios'
    ? IOS_LOCAL_PRAYER_SCHEDULE_DAYS
    : ANDROID_LOCAL_PRAYER_SCHEDULE_DAYS;
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function buildPrayerInputs(
  location: Awaited<ReturnType<typeof getPrayerLocation>>,
  settings: Awaited<ReturnType<typeof getEffectivePrayerCalcSettings>>,
): PrayerWidgetInputs | null {
  if (!location) return null;
  return {
    version: 1,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: getTimezone(),
    calculationMethod: settings.calculationMethod as PrayerWidgetInputs['calculationMethod'],
    madhab: settings.asrJuristic === 1 ? 'hanafi' : 'shafi',
    timeFormat: '24h',
    numerals: 'western',
    adjustments: settings.adjustments ?? {},
    writtenAt: new Date().toISOString(),
  };
}

function computeNextAdhanPrayer(inputs: PrayerWidgetInputs, from = new Date()): { key: PrayerKey; at: Date } | null {
  const today = computePrayerTimesForDay(inputs, from);
  const tomorrow = computePrayerTimesForDay(inputs, new Date(from.getTime() + 24 * 60 * 60 * 1000));
  const candidates = [
    ...FALLBACK_PRAYER_ORDER.map((key) => ({ key, at: today[key] })),
    ...FALLBACK_PRAYER_ORDER.map((key) => ({ key, at: tomorrow[key] })),
  ].filter((item) => item.at > from);
  candidates.sort((a, b) => a.at.getTime() - b.at.getTime());
  return candidates[0] ?? null;
}

async function getFallbackSoundSettings(): Promise<FallbackSoundSettings> {
  try {
    const raw = await AsyncStorage.getItem('app_settings');
    const parsed = raw ? JSON.parse(raw) : {};
    const n = parsed?.notifications ?? {};
    return {
      adhanSound: n.sound !== false,
      adhanSoundType: n.adhanSoundType || 'makkah',
      fullAdhanSoundType: n.fullAdhanSoundType || n.adhanSoundType || 'makkah',
      useFullAdhan: n.useFullAdhan === true,
    };
  } catch {
    return {
      adhanSound: true,
      adhanSoundType: 'makkah',
      fullAdhanSoundType: 'makkah',
      useFullAdhan: false,
    };
  }
}

/**
 * يرفع بيانات الصلاة الحالية للمستخدم إلى Firestore.
 * يُستدعى عند: تغيير الموقع، تغيير طريقة الحساب، أو دورياً عند فتح التطبيق.
 *
 * @param uid Firebase Auth UID
 * @param force تجاهل الـ throttle
 */
export async function syncPrayerDataToFirestore(uid: string, force = false): Promise<void> {
  if (!uid) return;

  // Throttle: لا ترسل أكثر من مرة كل ساعة
  if (!force) {
    try {
      const last = await AsyncStorage.getItem(SYNC_KEY);
      if (last && Date.now() - Number(last) < SYNC_THROTTLE_MS) return;
    } catch {}
  }

  const location = await getPrayerLocation();
  if (!location) {
    console.log('[fcm-sync] لا يوجد موقع محفوظ، تخطي');
    return;
  }

  const settings = await getEffectivePrayerCalcSettings();
  const prayerInputs = buildPrayerInputs(location, settings);
  const soundSettings = await getFallbackSoundSettings();
  const nextPrayer = prayerInputs ? computeNextAdhanPrayer(prayerInputs) : null;
  const localScheduleDays = getLocalPrayerScheduleDays();
  const now = new Date();
  const localScheduleExpiresAt = new Date(now.getTime() + localScheduleDays * 24 * 60 * 60 * 1000);
  const refreshReminderAt = new Date(Math.max(
    now.getTime() + 60 * 60 * 1000,
    localScheduleExpiresAt.getTime() - REFRESH_REMINDER_LEAD_MS,
  ));

  try {
    const db = getFirestore(getApp());
    const prayerSettingsRef = doc(db, 'userPrayerSettings', uid);
    const userRef = doc(db, 'users', uid);
    const prayerLocationPatch = {
      ...(typeof location.latitude === 'number' ? { locationLatitude: location.latitude } : {}),
      ...(typeof location.longitude === 'number' ? { locationLongitude: location.longitude } : {}),
      ...(location.city ? { locationCity: location.city } : {}),
      locationUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await Promise.all([
      setDoc(
        prayerSettingsRef,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city ?? null,
          calculationMethod: settings.calculationMethod,
          asrJuristic: settings.asrJuristic,
          adjustments: settings.adjustments ?? {},
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(), // مثلاً +180 لمصر
          timezone: getTimezone(),
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
          // Marks that the app was opened and local notifications are active.
          localNotificationsActiveAt: serverTimestamp(),
          localScheduleDays,
          localScheduleExpiresAt,
          refreshReminderAt,
          adhanSound: soundSettings.adhanSound,
          adhanSoundType: soundSettings.adhanSoundType,
          fullAdhanSoundType: soundSettings.fullAdhanSoundType,
          useFullAdhan: soundSettings.useFullAdhan,
          fallbackEnabled: false,
          fallbackSchemaVersion: FALLBACK_SCHEMA_VERSION,
          fallbackUpdatedAt: serverTimestamp(),
          ...(nextPrayer && {
            nextPrayerAt: nextPrayer.at,
            nextPrayerKey: nextPrayer.key,
          }),
        },
        { merge: true },
      ),
      setDoc(userRef, prayerLocationPatch, { merge: true }),
    ]);
    await AsyncStorage.setItem(SYNC_KEY, String(Date.now()));
    console.log('✅ [fcm-sync] تم رفع بيانات الصلاة لـ Firestore');
  } catch (e) {
    console.warn('⚠️ [fcm-sync] فشل الرفع:', e);
  }
}

/**
 * يحذف بيانات الصلاة من Firestore (عند logout أو تعطيل الإشعارات).
 */
export async function clearPrayerDataFromFirestore(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const db = getFirestore(getApp());
    const ref = doc(db, 'userPrayerSettings', uid);
    await setDoc(ref, {
      disabled: true,
      fallbackEnabled: false,
      updatedAt: serverTimestamp(),
      fallbackUpdatedAt: serverTimestamp(),
    }, { merge: true });
    await AsyncStorage.removeItem(SYNC_KEY);
  } catch (e) {
    console.warn('⚠️ [fcm-sync] فشل المسح:', e);
  }
}
