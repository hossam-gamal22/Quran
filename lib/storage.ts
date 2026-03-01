import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './prayer-notifications';

export interface Bookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText: string;
  note?: string;
  createdAt: number;
}

export interface LastRead {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  timestamp: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  translationEdition: string;
  reciter: string;
  showTranslation: boolean;
  calculationMethod: number;
  language: 'ar' | 'en';
  showAyahNumbers: boolean;
  continuousPlay: boolean;
}

const KEYS = {
  BOOKMARKS: '@quran_bookmarks',
  LAST_READ: '@quran_last_read',
  SETTINGS: '@quran_settings',
  LAST_PRAYER_LOCATION: '@quran_prayer_location',
  NOTIFICATION_SETTINGS: '@quran_notification_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  fontSize: 24,
  translationEdition: 'en.sahih',
  reciter: 'ar.alafasy',
  showTranslation: true,
  calculationMethod: 4,
  language: 'ar',
  showAyahNumbers: true,
  continuousPlay: false,
};

// ─── Bookmarks ────────────────────────────────────────────────────────────────
export async function getBookmarks(): Promise<Bookmark[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.BOOKMARKS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<void> {
  const bookmarks = await getBookmarks();
  const newBookmark: Bookmark = {
    ...bookmark,
    id: `${bookmark.surahNumber}_${bookmark.ayahNumber}`,
    createdAt: Date.now(),
  };
  const filtered = bookmarks.filter(b => b.id !== newBookmark.id);
  await AsyncStorage.setItem(KEYS.BOOKMARKS, JSON.stringify([newBookmark, ...filtered]));
}

export async function removeBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  const filtered = bookmarks.filter(b => b.id !== id);
  await AsyncStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(filtered));
}

export async function isBookmarked(surahNumber: number, ayahNumber: number): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);
}

// ─── Last Read ────────────────────────────────────────────────────────────────
export async function getLastRead(): Promise<LastRead | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.LAST_READ);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setLastRead(lastRead: Omit<LastRead, 'timestamp'>): Promise<void> {
  const data: LastRead = { ...lastRead, timestamp: Date.now() };
  await AsyncStorage.setItem(KEYS.LAST_READ, JSON.stringify(data));
}

// ─── App Settings ─────────────────────────────────────────────────────────────
export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
}

// ─── Prayer Location ──────────────────────────────────────────────────────────
export async function savePrayerLocation(location: {
  latitude: number;
  longitude: number;
  city?: string;
}): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_PRAYER_LOCATION, JSON.stringify(location));
}

export async function getPrayerLocation(): Promise<{
  latitude: number;
  longitude: number;
  city?: string;
} | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.LAST_PRAYER_LOCATION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ─── Notification Settings ────────────────────────────────────────────────────
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATION_SETTINGS);
    return data ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(data) } : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<void> {
  const current = await getNotificationSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(KEYS.NOTIFICATION_SETTINGS, JSON.stringify(updated));
}
