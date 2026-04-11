/**
 * Notification ID Storage — تخزين معرّفات الإشعارات
 *
 * Persists scheduled notification identifiers to AsyncStorage so we can
 * cancel the 15-min fallback when the user finishes prayer in Smart Tracker.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  adhanId: (prayer: string) => `@notif_adhan_${prayer}`,
  fallbackId: (prayer: string) => `@notif_fallback_${prayer}`,
  adhanFiredAt: (prayer: string) => `@notif_adhan_time_${prayer}`,
};

export const NotifIds = {
  saveAdhanId: (prayer: string, id: string) =>
    AsyncStorage.setItem(KEYS.adhanId(prayer), id),

  saveFallbackId: (prayer: string, id: string) =>
    AsyncStorage.setItem(KEYS.fallbackId(prayer), id),

  saveAdhanFiredAt: (prayer: string, timestamp: number) =>
    AsyncStorage.setItem(KEYS.adhanFiredAt(prayer), String(timestamp)),

  getFallbackId: (prayer: string): Promise<string | null> =>
    AsyncStorage.getItem(KEYS.fallbackId(prayer)),

  getAdhanFiredAt: async (prayer: string): Promise<number | null> => {
    const v = await AsyncStorage.getItem(KEYS.adhanFiredAt(prayer));
    return v ? Number(v) : null;
  },

  clearAll: (prayer: string) =>
    AsyncStorage.multiRemove([
      KEYS.adhanId(prayer),
      KEYS.fallbackId(prayer),
      KEYS.adhanFiredAt(prayer),
    ]),
};
