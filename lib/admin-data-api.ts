// lib/admin-data-api.ts
// Fetches admin-managed data from Firestore with local fallbacks
// جلب البيانات المدارة من الأدمن مع fallback محلي

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function fetchWithCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T | null>,
  fallback: T,
): Promise<T> {
  // Check AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const entry: CacheEntry<T> = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
      }
    }
  } catch { /* skip */ }

  // Fetch from Firestore
  try {
    const data = await fetcher();
    if (data) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    }
  } catch (err) {
    console.log('⚠️ Firestore fetch failed, using fallback:', err);
  }

  return fallback;
}

// ==================== Onboarding Config ====================

export interface OnboardingFeature {
  icon: string;
  label: string;
  color: string;
}

export interface OnboardingConfig {
  appName: string;
  tagline: string;
  description: string;
  features: OnboardingFeature[];
  screens: string[];
}

const DEFAULT_ONBOARDING: OnboardingConfig = {
  appName: 'روح المسلم',
  tagline: 'رفيقك في رحلة الإيمان',
  description: 'تطبيق شامل للأذكار والقرآن الكريم وأوقات الصلاة',
  features: [
    { icon: 'book-open-variant', label: 'القرآن الكريم', color: '#3a7ca5' },
    { icon: 'hands-pray', label: 'الأذكار والأدعية', color: '#2f7659' },
    { icon: 'mosque', label: 'أوقات الصلاة', color: '#c17f59' },
    { icon: 'compass', label: 'اتجاه القبلة', color: '#5d4e8c' },
  ],
  screens: ['welcome', 'language', 'location', 'notifications', 'complete'],
};

export async function fetchOnboardingConfig(): Promise<OnboardingConfig> {
  return fetchWithCache(
    '@admin_onboarding_config',
    async () => {
      const snap = await getDoc(doc(db, 'appConfig', 'onboarding'));
      if (snap.exists()) return snap.data() as OnboardingConfig;
      return null;
    },
    DEFAULT_ONBOARDING,
  );
}

// ==================== Tasbih Presets ====================

export interface TasbihPreset {
  id: number;
  text: string;
  transliteration?: string;
  target: number;
  virtue?: string;
  reference?: string;
  source?: string;
  grade?: string;
}

export async function fetchTasbihPresets(localDefaults: TasbihPreset[]): Promise<TasbihPreset[]> {
  return fetchWithCache(
    '@admin_tasbih_presets',
    async () => {
      const snap = await getDocs(collection(db, 'tasbihPresets'));
      if (snap.empty) return null;
      return snap.docs.map(d => ({ id: Number(d.id) || 0, ...d.data() } as TasbihPreset));
    },
    localDefaults,
  );
}

// ==================== Islamic Events ====================

export interface IslamicEvent {
  id?: string;
  name: string;
  hijriMonth: number;
  hijriDay: number;
  color: string;
  icon?: string;
  description?: string;
}

export async function fetchIslamicEvents(localDefaults: IslamicEvent[]): Promise<IslamicEvent[]> {
  return fetchWithCache(
    '@admin_islamic_events',
    async () => {
      const snap = await getDocs(collection(db, 'islamicEvents'));
      if (snap.empty) return null;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as IslamicEvent));
    },
    localDefaults as IslamicEvent[],
  );
}

// ==================== Quran Themes ====================

export interface QuranThemeOverride {
  primary: string;
  background: string;
  secondary: string;
  highlight: string;
  // Extended fields (optional, backward-compatible)
  id?: string;
  name?: Record<string, string>;
  iconUrl?: string;
  iconStoragePath?: string;
  order?: number;
}

export async function fetchQuranThemes(localDefaults: QuranThemeOverride[]): Promise<QuranThemeOverride[]> {
  return fetchWithCache(
    '@admin_quran_themes',
    async () => {
      const snap = await getDoc(doc(db, 'appConfig', 'quranThemes'));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.themes) && data.themes.length > 0) return data.themes as QuranThemeOverride[];
      }
      return null;
    },
    localDefaults,
  );
}

// ==================== Google Calendar Events ====================

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  startDate: string; // ISO date string
  endDate?: string;
  hijriMonth?: number;
  hijriDay?: number;
  hijriDayEnd?: number;
  type?: string;
  color?: string;
  icon?: string;
  importance?: 'major' | 'minor';
}

interface GoogleCalendarSyncConfig {
  calendarId: string;
  apiKey: string;
  lastSync?: number;
}

const GOOGLE_CALENDAR_CACHE_KEY = '@google_calendar_events';
const GOOGLE_CALENDAR_SYNC_CONFIG_KEY = 'appConfig/googleCalendar';

/**
 * Fetch Islamic events from a Google Calendar managed by the admin.
 * Flow: Admin adds event in Google Calendar → App fetches via API → Maps to display
 * Events are cached locally with a 24-hour TTL for offline support.
 */
export async function fetchGoogleCalendarEvents(): Promise<GoogleCalendarEvent[]> {
  return fetchWithCache<GoogleCalendarEvent[]>(
    GOOGLE_CALENDAR_CACHE_KEY,
    async () => {
      // Step 1: Get Google Calendar config from Firestore
      const configSnap = await getDoc(doc(db, 'appConfig', 'googleCalendar'));
      if (!configSnap.exists()) return null;
      
      const config = configSnap.data() as GoogleCalendarSyncConfig;
      if (!config.calendarId || !config.apiKey) return null;

      // Step 2: Fetch events from Google Calendar API  
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);

      const calendarId = encodeURIComponent(config.calendarId);
      const timeMin = encodeURIComponent(now.toISOString());
      const timeMax = encodeURIComponent(oneYearFromNow.toISOString());

      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${encodeURIComponent(config.apiKey)}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log('⚠️ Google Calendar fetch failed:', response.status);
        return null;
      }

      const data = await response.json();
      if (!data.items || !Array.isArray(data.items)) return null;

      // Step 3: Map Google Calendar events to our format
      const events: GoogleCalendarEvent[] = data.items
        .filter((item: any) => item.start?.date || item.start?.dateTime)
        .map((item: any) => {
          const startDate = item.start.date || item.start.dateTime?.split('T')[0];
          const endDate = item.end?.date || item.end?.dateTime?.split('T')[0];
          
          // Parse custom properties from description (JSON metadata in description)
          let meta: any = {};
          if (item.description) {
            try {
              // Look for JSON block in description: <!-- {"hijriMonth": 1, ...} -->
              const jsonMatch = item.description.match(/<!--\s*(\{[\s\S]*?\})\s*-->/);
              if (jsonMatch) {
                meta = JSON.parse(jsonMatch[1]);
              }
            } catch { /* not JSON metadata */ }
          }

          return {
            id: item.id,
            title: item.summary || '',
            titleAr: meta.titleAr || '',
            description: item.description?.replace(/<!--[\s\S]*?-->/g, '').trim() || '',
            descriptionAr: meta.descriptionAr || '',
            startDate,
            endDate: endDate !== startDate ? endDate : undefined,
            hijriMonth: meta.hijriMonth,
            hijriDay: meta.hijriDay,
            hijriDayEnd: meta.hijriDayEnd,
            type: meta.type || 'observance',
            color: meta.color || '#607D8B',
            icon: meta.icon,
            importance: meta.importance || 'minor',
          };
        });

      return events;
    },
    [],
  );
}

/**
 * Get the last sync time for Google Calendar events
 */
export async function getGoogleCalendarLastSync(): Promise<number | null> {
  try {
    const cached = await AsyncStorage.getItem(GOOGLE_CALENDAR_CACHE_KEY);
    if (cached) {
      const entry: CacheEntry<GoogleCalendarEvent[]> = JSON.parse(cached);
      return entry.timestamp;
    }
  } catch {}
  return null;
}

/**
 * Force refresh Google Calendar events (bypass cache)
 */
export async function refreshGoogleCalendarEvents(): Promise<GoogleCalendarEvent[]> {
  try {
    await AsyncStorage.removeItem(GOOGLE_CALENDAR_CACHE_KEY);
  } catch {}
  return fetchGoogleCalendarEvents();
}
