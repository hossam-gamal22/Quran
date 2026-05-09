/**
 * Phase 2 — FCM Push Fallback
 *
 * يرفع موقع المستخدم وإعدادات الحساب إلى Firestore عشان Cloud Function
 * تقدر تحسب أوقات صلاته وترسل push notification احتياطي.
 *
 * Cloud Function تشتغل كل 30 دقيقة:
 *  - تقرأ كل users لهم fcmToken + prayerLocation
 *  - تحسب الصلاة القادمة محلياً (server-side)
 *  - لو الصلاة خلال 30 دقيقة → ترسل push عبر Expo
 *
 * هذا fallback "حزام أمان" — لا يستبدل local scheduling، لكن ينقذ المستخدم
 * في الحالات الحرجة (force-stop, OEM kill, exact alarm denied).
 */

import { doc, setDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPrayerLocation } from './storage';
import { getEffectivePrayerCalcSettings } from './prayer-settings-source';

const SYNC_KEY = '@last_prayer_sync_to_firestore';
const SYNC_THROTTLE_MS = 60 * 60 * 1000; // ساعة

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

  try {
    const db = getFirestore(getApp());
    const ref = doc(db, 'userPrayerSettings', uid);
    await setDoc(
      ref,
      {
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city ?? null,
        calculationMethod: settings.calculationMethod,
        asrJuristic: settings.asrJuristic,
        adjustments: settings.adjustments ?? {},
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(), // مثلاً +180 لمصر
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
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
    await setDoc(ref, { disabled: true, updatedAt: serverTimestamp() }, { merge: true });
    await AsyncStorage.removeItem(SYNC_KEY);
  } catch (e) {
    console.warn('⚠️ [fcm-sync] فشل المسح:', e);
  }
}
