// services/radioService.ts
// Fetches radio stations from multiple sources, merges, deduplicates, and caches

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import type {
  RadioStation,
  RadioCategory,
  RadioConfig,
  Mp3QuranRadiosResponse,
  Mp3QuranRadio,
  RadioBrowserStation,
  AdminRadioStation,
  RadioFavorite,
} from '@/types/radio';

// ==================== Constants ====================

const CACHE_KEY = '@radio_stations_cache';
const CACHE_TS_KEY = '@radio_stations_cache_ts';
const CONFIG_CACHE_KEY = '@radio_config_cache';
const FAVORITES_KEY = '@radio_favorites';
const DEFAULT_CACHE_TTL = 60; // minutes

const MP3QURAN_API = 'https://www.mp3quran.net/api/v3/radios?language=ar';
const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json/stations/bytag/quran?limit=100&order=votes&reverse=true&hidebroken=true';
const RADIO_BROWSER_ISLAMIC_API = 'https://de1.api.radio-browser.info/json/stations/bytag/islamic?limit=50&order=votes&reverse=true&hidebroken=true';

// ==================== Stream Fallback URLs ====================

const STREAM_FALLBACKS: Record<string, string[]> = {
  'https://stream.radiojar.com/8s5u5tpdtwzuv': [
    'https://n03.radiojar.com/8s5u5tpdtwzuv',
    'https://n12.radiojar.com/0tpy1h0kxtzuv',
  ],
};

export async function resolveStreamUrl(
  primaryUrl: string,
  timeoutMs = 5000
): Promise<string> {
  const fallbacks = STREAM_FALLBACKS[primaryUrl];
  if (!fallbacks || fallbacks.length === 0) return primaryUrl;

  const urls = [primaryUrl, ...fallbacks];
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
  return primaryUrl;
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

// ==================== Curated Stations ====================

const CURATED_STATIONS: RadioStation[] = [
  {
    id: 'curated_eg_cairo_quran',
    name: 'إذاعة القرآن الكريم من القاهرة',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم من القاهرة',
      en: 'Holy Quran Radio Cairo — FM 98.2',
      fr: 'Radio Sainte Coran du Caire — FM 98.2',
      tr: 'Kahire Kutsal Kuran Radyosu — FM 98.2',
      id: 'Radio Quran Suci Kairo — FM 98.2',
      ms: 'Radio Al-Quran Kaherah — FM 98.2',
      ur: 'قاہرہ قرآن کریم ریڈیو — ایف ایم 98.2',
      bn: 'কায়রো পবিত্র কুরআন রেডিও — এফএম 98.2',
      ru: 'Радио Корана Каир — FM 98.2',
      es: 'Radio Sagrado Corán de El Cairo — FM 98.2',
    },
    streamUrl: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
    source: 'curated',
    sourceId: 'eg_cairo_quran',
    category: 'quran',
    country: 'EG',
    language: 'ar',
    isFeatured: true,
    isOnline: true,
    order: -1,
  },
  {
    id: 'curated_saudi_quran',
    name: 'إذاعة القرآن الكريم - السعودية',
    nameTranslations: { en: 'Saudi Quran Radio', fr: 'Radio Coran Saoudienne', tr: 'Suudi Kuran Radyosu' },
    streamUrl: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
    source: 'curated',
    sourceId: 'saudi_quran',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isFeatured: true,
    isOnline: true,
    order: 0,
  },
  {
    id: 'curated_makkah_live',
    name: 'إذاعة الحرم المكي',
    nameTranslations: { en: 'Makkah Live', fr: 'La Mecque en direct', tr: 'Mekke Canlı' },
    streamUrl: 'https://backup.qurango.net/radio/mix',
    source: 'curated',
    sourceId: 'makkah_live',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isFeatured: true,
    isOnline: true,
    order: 1,
  },
];

// ==================== Category Mapping ====================

function inferCategory(station: { name: string; tags?: string }): RadioCategory {
  const name = station.name.toLowerCase();
  const tags = (station.tags || '').toLowerCase();
  const combined = `${name} ${tags}`;

  if (combined.includes('تفسير') || combined.includes('tafsir') || combined.includes('tafseer')) return 'tafsir';
  if (combined.includes('ترجمة') || combined.includes('translation')) return 'translation';
  if (combined.includes('أذكار') || combined.includes('athkar') || combined.includes('adhkar')) return 'adhkar';
  if (combined.includes('سيرة') || combined.includes('seerah') || combined.includes('siyra')) return 'seerah';
  if (combined.includes('صحيح') || combined.includes('حديث') || combined.includes('hadith') || combined.includes('riyad')) return 'hadith';
  if (combined.includes('رقية') || combined.includes('ruqyah') || combined.includes('roqiah')) return 'ruqyah';
  if (combined.includes('أطفال') || combined.includes('kids') || combined.includes('children')) return 'kids';
  if (combined.includes('قرآن') || combined.includes('quran') || combined.includes('إذاعة')) return 'reciter';

  return 'islamic';
}

// ==================== Source Fetchers ====================

async function fetchMp3Quran(): Promise<RadioStation[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(MP3QURAN_API, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data: Mp3QuranRadiosResponse = await res.json();

    return (data.radios || []).map((r: Mp3QuranRadio) => ({
      id: `mp3quran_${r.id}`,
      name: r.name.trim(),
      streamUrl: r.url,
      source: 'mp3quran' as const,
      sourceId: String(r.id),
      category: inferCategory({ name: r.name }),
      language: 'ar',
      isOnline: true,
      lastChecked: r.recent_date,
    }));
  } catch (error) {
    console.warn('[RadioService] mp3quran fetch failed:', error);
    return [];
  }
}

async function fetchRadioBrowser(): Promise<RadioStation[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const [quranRes, islamicRes] = await Promise.all([
      fetch(RADIO_BROWSER_API, { signal: controller.signal }),
      fetch(RADIO_BROWSER_ISLAMIC_API, { signal: controller.signal }),
    ]);
    clearTimeout(timeout);

    const quranData: RadioBrowserStation[] = quranRes.ok ? await quranRes.json() : [];
    const islamicData: RadioBrowserStation[] = islamicRes.ok ? await islamicRes.json() : [];

    // Deduplicate by stationuuid
    const seen = new Set<string>();
    const allStations = [...quranData, ...islamicData].filter((s) => {
      if (seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return s.lastcheckok === 1;
    });

    return allStations.map((s) => ({
      id: `rb_${s.stationuuid}`,
      name: s.name.trim(),
      streamUrl: s.url_resolved || s.url,
      streamUrlResolved: s.url_resolved,
      source: 'radio_browser' as const,
      sourceId: s.stationuuid,
      category: inferCategory({ name: s.name, tags: s.tags }),
      country: s.countrycode || undefined,
      language: s.language || undefined,
      imageUrl: s.favicon || undefined,
      codec: s.codec || undefined,
      bitrate: s.bitrate || undefined,
      tags: s.tags ? s.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      isOnline: s.lastcheckok === 1,
      votes: s.votes,
    }));
  } catch (error) {
    console.warn('[RadioService] radio-browser fetch failed:', error);
    return [];
  }
}

async function fetchAdminStations(): Promise<RadioStation[]> {
  try {
    const q = query(
      collection(db, 'admin_radio_stations'),
      where('isHidden', '==', false),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data() as AdminRadioStation;
      return {
        id: `admin_${d.id}`,
        name: data.name,
        nameTranslations: data.nameTranslations,
        streamUrl: data.streamUrl,
        source: 'admin' as const,
        sourceId: d.id,
        category: data.category,
        country: data.country,
        language: data.language,
        imageUrl: data.imageUrl,
        tags: data.tags,
        order: data.order,
        isHidden: false,
        isFeatured: data.isFeatured,
        isOnline: true,
      };
    });
  } catch (error) {
    console.warn('[RadioService] Firestore fetch failed:', error);
    return [];
  }
}

// ==================== Merge & Deduplicate ====================

function deduplicateStations(stations: RadioStation[]): RadioStation[] {
  const seen = new Map<string, RadioStation>();

  for (const station of stations) {
    // Normalize URL for dedup
    const urlKey = station.streamUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toLowerCase();

    const nameKey = station.name.trim().toLowerCase();
    const key = `${urlKey}__${nameKey}`;

    if (!seen.has(key)) {
      seen.set(key, station);
    } else {
      // Prefer admin > curated > mp3quran > radio_browser
      const existing = seen.get(key)!;
      const priority: Record<string, number> = { admin: 4, curated: 3, mp3quran: 2, radio_browser: 1 };
      if ((priority[station.source] || 0) > (priority[existing.source] || 0)) {
        seen.set(key, { ...station, imageUrl: station.imageUrl || existing.imageUrl });
      }
    }
  }

  return Array.from(seen.values());
}

function sortStations(stations: RadioStation[]): RadioStation[] {
  return stations.sort((a, b) => {
    // Featured first
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    // Then by order
    if ((a.order ?? 999) !== (b.order ?? 999)) return (a.order ?? 999) - (b.order ?? 999);
    // Then by source priority
    const pr: Record<string, number> = { admin: 0, curated: 1, mp3quran: 2, radio_browser: 3 };
    return (pr[a.source] ?? 9) - (pr[b.source] ?? 9);
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

    const docRef = doc(db, 'admin_settings', 'radio_config');
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

  // Fetch from all sources in parallel
  const [mp3quranStations, radioBrowserStations, adminStations] = await Promise.all([
    config?.showMp3Quran !== false ? fetchMp3Quran() : Promise.resolve([]),
    config?.showRadioBrowser !== false ? fetchRadioBrowser() : Promise.resolve([]),
    fetchAdminStations(),
  ]);

  // Merge: admin first, then curated, then external
  const allStations = [
    ...adminStations,
    ...CURATED_STATIONS,
    ...mp3quranStations,
    ...radioBrowserStations,
  ];

  // Apply admin config: hide stations
  const hiddenIds = new Set(config?.hiddenStationIds || []);
  const filtered = allStations.filter((s) => !hiddenIds.has(s.id) && !s.isHidden);

  // Deduplicate and sort
  const merged = sortStations(deduplicateStations(filtered));

  // Cache the result
  await setCachedStations(merged);

  return merged;
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
