/**
 * Notification Texts — نصوص الإشعارات
 *
 * Extracted from notifications-manager.ts to break the circular dependency:
 *   notifications-manager  ↔  prayer-notifications
 *
 * Both files now import from here instead of from each other.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_TEXTS_CACHE_KEY = '@notification_texts_v1';
let _notifTextsCache: Record<string, { title: Record<string, string>; body: Record<string, string> }> | null = null;

export async function fetchNotificationTexts(): Promise<typeof _notifTextsCache> {
  // 1. Return memory cache if available
  if (_notifTextsCache) return _notifTextsCache;

  // 2. Try AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(NOTIF_TEXTS_CACHE_KEY);
    if (cached) {
      _notifTextsCache = JSON.parse(cached);
      // Refresh from Firestore in background
      refreshNotifTextsFromFirestore().catch(() => {});
      return _notifTextsCache;
    }
  } catch {}

  // 3. Fetch from Firestore
  await refreshNotifTextsFromFirestore();
  return _notifTextsCache;
}

async function refreshNotifTextsFromFirestore(): Promise<void> {
  try {
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const { getApp } = await import('firebase/app');
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, 'appConfig', 'notificationTexts'));
    if (snap.exists()) {
      _notifTextsCache = snap.data() as typeof _notifTextsCache;
      await AsyncStorage.setItem(NOTIF_TEXTS_CACHE_KEY, JSON.stringify(_notifTextsCache));
    } else {
      _notifTextsCache = {};
    }
  } catch (err) {
    console.warn('[notification-texts] Failed to fetch from Firestore:', err);
    if (!_notifTextsCache) _notifTextsCache = {};
  }
}

/**
 * Real-time listener for notification text overrides from admin panel.
 * Returns an unsubscribe function.
 */
export function subscribeToNotificationTexts(
  onUpdate?: (data: typeof _notifTextsCache) => void,
): () => void {
  let unsubscribe = () => {};
  (async () => {
    try {
      const { getFirestore, doc, onSnapshot } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      const db = getFirestore(getApp());
      unsubscribe = onSnapshot(
        doc(db, 'appConfig', 'notificationTexts'),
        (snap) => {
          const data = snap.exists()
            ? (snap.data() as typeof _notifTextsCache)
            : ({} as typeof _notifTextsCache);
          _notifTextsCache = data;
          AsyncStorage.setItem(NOTIF_TEXTS_CACHE_KEY, JSON.stringify(data)).catch(() => {});
          onUpdate?.(data);
        },
        (err) => {
          if (__DEV__) console.warn('[notification-texts] subscribe error:', err);
        },
      );
    } catch (err) {
      if (__DEV__) console.warn('[notification-texts] failed to subscribe:', err);
    }
  })();
  return () => unsubscribe();
}

/**
 * Get notification title/body for a given type, with admin override → t() fallback.
 * @param typeId  e.g. 'morning', 'prayer_fajr', 'daily_ayah'
 * @param fallbackTitle  The t() translation key result to use as fallback
 * @param fallbackBody   The t() translation key result to use as fallback
 * @param lang           Current app language code (e.g. 'ar', 'en')
 */
export function getNotifText(
  typeId: string,
  fallbackTitle: string,
  fallbackBody: string,
  lang: string = 'ar',
): { title: string; body: string } {
  if (!_notifTextsCache || !_notifTextsCache[typeId]) {
    return { title: fallbackTitle, body: fallbackBody };
  }
  const override = _notifTextsCache[typeId];
  return {
    title: override.title?.[lang] || override.title?.ar || fallbackTitle,
    body: override.body?.[lang] || override.body?.ar || fallbackBody,
  };
}
