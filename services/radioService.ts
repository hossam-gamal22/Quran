// services/radioService.ts
// Fetches radio stations from Firestore, caches locally, and provides search/favorites

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import type {
  RadioStation,
  RadioCategory,
  RadioConfig,
  AdminRadioStation,
  RadioFavorite,
} from '@/types/radio';

// ==================== Constants ====================

const CACHE_KEY = '@radio_stations_cache';
const CACHE_TS_KEY = '@radio_stations_cache_ts';
const CONFIG_CACHE_KEY = '@radio_config_cache';
const FAVORITES_KEY = '@radio_favorites';
const DEFAULT_CACHE_TTL = 60; // minutes

// ==================== Helpers ====================

/** Upgrade http:// to https:// — Android 9+ blocks cleartext HTTP by default */
function ensureHttps(url: string): string {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

// ==================== Stream Fallback URLs ====================

const STREAM_FALLBACKS: Record<string, string[]> = {
  // Cairo Quran Radio — LIVE HLS from official ministry site (misrquran.gov.eg)
  'https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8': [
    'https://backup.qurango.net/radio/mahmoud_khalil_alhussary',
    'https://Qurango.net/radio/tarateel',
  ],
  // Saudi Quran Radio — primary is Al-Sudais, fallback to Shuraim
  'https://backup.qurango.net/radio/abdulrahman_alsudaes': [
    'https://backup.qurango.net/radio/saud_alshuraim',
    'https://backup.qurango.net/radio/mix',
  ],
  // Legacy radiojar URLs → redirect to working equivalents
  'https://stream.radiojar.com/8s5u5tpdtwzuv': [
    'https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8',
    'https://backup.qurango.net/radio/mahmoud_khalil_alhussary',
  ],
  'https://stream.radiojar.com/0tpy1h0kxtzuv': [
    'https://backup.qurango.net/radio/abdulrahman_alsudaes',
    'https://backup.qurango.net/radio/saud_alshuraim',
  ],
  // Old qurango Cairo fallback → try live first (only used if Cairo station cached old URL)
  'https://backup.qurango.net/radio/mahmoud_khalil_alhussary': [
    'https://Qurango.net/radio/tarateel',
    'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad',
  ],
};

export async function resolveStreamUrl(
  primaryUrl: string,
  timeoutMs = 5000
): Promise<string> {
  const safeUrl = ensureHttps(primaryUrl);
  const fallbacks = STREAM_FALLBACKS[safeUrl];
  if (!fallbacks || fallbacks.length === 0) return safeUrl;

  const urls = [safeUrl, ...fallbacks];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || res.status === 200) return url;
    } catch {
      continue;
    }
  }
  return safeUrl;
}

// ==================== Arabic Country Name Mapping ====================

const ARABIC_COUNTRY_MAP: Record<string, string> = {
  'القاهرة': 'EG',
  'مصر': 'EG',
  'السعودية': 'SA',
  'الرياض': 'SA',
  'الإمارات': 'AE',
  'دبي': 'AE',
  'الكويت': 'KW',
  'تركيا': 'TR',
  'إندونيسيا': 'ID',
  'ماليزيا': 'MY',
  'باكستان': 'PK',
  'المغرب': 'MA',
};

// ==================== Firestore Fetcher ====================

async function fetchFirestoreStations(): Promise<RadioStation[]> {
  try {
    const q = query(
      collection(db, 'admin_radio_stations'),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);

    const stations = snapshot.docs.map((d) => {
      const data = d.data() as AdminRadioStation;
      return {
        id: `admin_${d.id}`,
        name: data.name,
        nameTranslations: data.nameTranslations,
        streamUrl: ensureHttps(data.streamUrl),
        source: 'admin' as const,
        sourceId: d.id,
        category: data.category,
        country: data.country,
        language: data.language,
        imageUrl: data.imageUrl,
        tags: data.tags,
        order: data.order,
        isHidden: data.isHidden ?? false,
        isFeatured: data.isFeatured,
        isOnline: true,
      };
    });

    // Sort client-side instead of using Firestore orderBy (avoids composite index requirement)
    return stations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.warn('[RadioService] Firestore fetch failed:', error);
    return [];
  }
}

// ==================== Sort ====================

function sortStations(stations: RadioStation[]): RadioStation[] {
  return stations.sort((a, b) => {
    // Featured first
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    // Then by order
    if ((a.order ?? 999) !== (b.order ?? 999)) return (a.order ?? 999) - (b.order ?? 999);
    return 0;
  });
}

// ==================== Cache ====================

async function getCachedStations(): Promise<RadioStation[] | null> {
  try {
    const [cached, tsStr] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY),
      AsyncStorage.getItem(CACHE_TS_KEY),
    ]);
    if (!cached || !tsStr) return null;

    const ts = parseInt(tsStr, 10);
    const config = await getRadioConfig();
    const ttl = (config?.cacheTTLMinutes || DEFAULT_CACHE_TTL) * 60 * 1000;

    if (Date.now() - ts > ttl) return null;
    return JSON.parse(cached) as RadioStation[];
  } catch {
    return null;
  }
}

async function setCachedStations(stations: RadioStation[]): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(stations)),
      AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now())),
    ]);
  } catch {}
}

// ==================== Public API ====================

export async function getRadioConfig(): Promise<RadioConfig | null> {
  try {
    // Try memory cache first
    const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as RadioConfig;
      return parsed;
    }

    const docRef = doc(db, 'appConfig', 'radioConfig');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const config = snap.data() as RadioConfig;
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
      return config;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchAllStations(forceRefresh = false): Promise<RadioStation[]> {
  // Check cache first
  if (!forceRefresh) {
    const cached = await getCachedStations();
    if (cached) return cached;
  }

  const config = await getRadioConfig();

  // Fetch all stations from Firestore
  const stations = await fetchFirestoreStations();

  // Apply admin config: hide stations
  const hiddenIds = new Set(config?.hiddenStationIds || []);
  const filtered = stations.filter((s) => !hiddenIds.has(s.id) && !s.isHidden);

  // Sort
  const sorted = sortStations(filtered);

  // Cache the result
  await setCachedStations(sorted);

  return sorted;
}

export function filterByCategory(stations: RadioStation[], category: RadioCategory): RadioStation[] {
  return stations.filter((s) => s.category === category);
}

export function searchStations(stations: RadioStation[], query: string): RadioStation[] {
  const q = query.toLowerCase().trim();
  if (!q) return stations;

  // Check if query matches an Arabic country name
  const mappedCountry = ARABIC_COUNTRY_MAP[q.trim()];

  return stations.filter((s) => {
    // Match Arabic country name → country code
    if (mappedCountry && s.country === mappedCountry) return true;

    const name = s.name.toLowerCase();
    const tags = (s.tags || []).join(' ').toLowerCase();
    const translations = Object.values(s.nameTranslations || {}).join(' ').toLowerCase();
    const country = (s.country || '').toLowerCase();
    return name.includes(q) || tags.includes(q) || translations.includes(q) || country.includes(q);
  });
}

// ==================== Favorites ====================

export async function getRadioFavorites(): Promise<RadioFavorite[]> {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function toggleRadioFavorite(stationId: string): Promise<boolean> {
  const favorites = await getRadioFavorites();
  const idx = favorites.findIndex((f) => f.stationId === stationId);

  if (idx >= 0) {
    favorites.splice(idx, 1);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return false; // removed
  } else {
    favorites.push({ stationId, addedAt: new Date().toISOString() });
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return true; // added
  }
}

export async function isRadioFavorite(stationId: string): Promise<boolean> {
  const favorites = await getRadioFavorites();
  return favorites.some((f) => f.stationId === stationId);
}

export async function clearRadioCache(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(CACHE_KEY),
    AsyncStorage.removeItem(CACHE_TS_KEY),
    AsyncStorage.removeItem(CONFIG_CACHE_KEY),
  ]);
}
