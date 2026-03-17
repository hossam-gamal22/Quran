// lib/content-api.ts
// Generic Content CMS API — Fetch/cache/subscribe for all CMS content types
// (Hajj, Umrah, Seerah, Companions, Seasonal)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

// Firebase Config (same as app-config-api.ts)
const firebaseConfig = {
  apiKey: 'AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A',
  authDomain: 'rooh-almuslim.firebaseapp.com',
  projectId: 'rooh-almuslim',
  storageBucket: 'rooh-almuslim.firebasestorage.app',
  messagingSenderId: '328160076358',
  appId: '1:328160076358:web:fe5ec8e8b07355f1c06047',
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ========================================
// Types for Hajj & Umrah content
// ========================================

export interface CMSStep {
  text: string;
}

export interface CMSDua {
  arabic: string;
  note?: string;
}

export interface CMSRitualSection {
  title: string;
  icon: string;
  description: string;
  steps: CMSStep[];
  duas: CMSDua[];
  titleTranslations?: Record<string, string>;
  iconUrl?: string;
}

export interface CMSDuaEntry {
  arabic: string;
  reference?: string;
  occasion: string;
}

export interface CMSDuaRitualGroup {
  title: string;
  icon: string;
  duas: CMSDuaEntry[];
}

export interface HajjUmrahContent {
  umrahSections: CMSRitualSection[];
  hajjSections: CMSRitualSection[];
  duasByRitual: CMSDuaRitualGroup[];
  updatedAt?: string;
}

// ========================================
// Types for Seerah content
// ========================================

export interface CMSSeerahSection {
  title: string;
  titleEn: string;
  icon: string;
  paragraphs: string[];
  titleTranslations?: Record<string, string>;
  iconUrl?: string;
}

export interface SeerahContent {
  sections: CMSSeerahSection[];
  updatedAt?: string;
}

// ========================================
// Types for Companions content
// ========================================

export interface CMSCompanion {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  brief: string;
  story: string[];
  virtues: string[];
  icon?: string;
  nameTranslations?: Record<string, string>;
  iconUrl?: string;
}

export interface CMSCategory {
  key: string;
  title: string;
  icon: string;
}

export interface CompanionsContent {
  companions: CMSCompanion[];
  categories: CMSCategory[];
  updatedAt?: string;
}

// ─── Seasonal CMS types ─────────────────────────────────────────────────

export interface CMSSeasonalDua {
  id: string;
  titleKey: string;
  arabic: string;
  translation: string;
}

export interface CMSSeasonalChecklist {
  id: string;
  icon: string;
  labelKey: string;
  color: string;
}

export interface CMSSeasonalContent {
  duas: CMSSeasonalDua[];
  checklist: CMSSeasonalChecklist[];
  updatedAt?: string;
}

export type SeasonalPageType = 'ramadan' | 'hajj' | 'mawlid' | 'ashura';

// ========================================
// Generic fetch + cache + subscribe utility
// ========================================

const CACHE_PREFIX = '@cms_content:';

// In-memory cache for immediate reads
const memoryCache = new Map<string, unknown>();

/**
 * Fetch content from Firestore with AsyncStorage fallback.
 * Pattern: Firestore → cache to memory + AsyncStorage → return.
 * On failure: try AsyncStorage cache → return null.
 */
export async function fetchContent<T>(
  docPath: string,
  cacheKey: string
): Promise<T | null> {
  const fullCacheKey = CACHE_PREFIX + cacheKey;

  try {
    const docRef = doc(db, 'appContent', docPath);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as T;
      memoryCache.set(cacheKey, data);
      await AsyncStorage.setItem(fullCacheKey, JSON.stringify(data)).catch(
        () => {}
      );
      return data;
    }
  } catch {
    // Firestore failed, try cache
  }

  // Fallback: memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) as T;
  }

  // Fallback: AsyncStorage
  try {
    const cached = await AsyncStorage.getItem(fullCacheKey);
    if (cached) {
      const data = JSON.parse(cached) as T;
      memoryCache.set(cacheKey, data);
      return data;
    }
  } catch {
    // Cache read failed
  }

  return null;
}

/**
 * Subscribe to real-time content updates from Firestore.
 * Returns unsubscribe function.
 */
export function subscribeToContent<T>(
  docPath: string,
  cacheKey: string,
  onUpdate: (data: T) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const fullCacheKey = CACHE_PREFIX + cacheKey;
  const docRef = doc(db, 'appContent', docPath);

  return onSnapshot(
    docRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as T;
        memoryCache.set(cacheKey, data);
        await AsyncStorage.setItem(fullCacheKey, JSON.stringify(data)).catch(
          () => {}
        );
        onUpdate(data);
      }
    },
    (error) => {
      onError?.(error);
    }
  );
}

/**
 * Get cached content synchronously from memory.
 */
export function getCachedContent<T>(cacheKey: string): T | null {
  return (memoryCache.get(cacheKey) as T) ?? null;
}

// ========================================
// Specific fetch functions
// ========================================

export const fetchHajjUmrahContent = () =>
  fetchContent<HajjUmrahContent>('hajjUmrahContent', 'hajj_umrah');

export const subscribeToHajjUmrahContent = (
  onUpdate: (data: HajjUmrahContent) => void,
  onError?: (error: Error) => void
) => subscribeToContent<HajjUmrahContent>('hajjUmrahContent', 'hajj_umrah', onUpdate, onError);

export const fetchSeerahContent = () =>
  fetchContent<SeerahContent>('seerahContent', 'seerah');

export const subscribeToSeerahContent = (
  onUpdate: (data: SeerahContent) => void,
  onError?: (error: Error) => void
) => subscribeToContent<SeerahContent>('seerahContent', 'seerah', onUpdate, onError);

export const fetchCompanionsContent = () =>
  fetchContent<CompanionsContent>('companionsContent', 'companions');

export const subscribeToCompanionsContent = (
  onUpdate: (data: CompanionsContent) => void,
  onError?: (error: Error) => void
) => subscribeToContent<CompanionsContent>('companionsContent', 'companions', onUpdate, onError);

// ─── Seasonal content helpers ───────────────────────────────────────────

export const fetchSeasonalContent = (page: SeasonalPageType) =>
  fetchContent<CMSSeasonalContent>(`seasonalContent/${page}`, `seasonal_${page}`);

export const subscribeToSeasonalContent = (
  page: SeasonalPageType,
  onUpdate: (data: CMSSeasonalContent) => void,
  onError?: (error: Error) => void
) => subscribeToContent<CMSSeasonalContent>(`seasonalContent/${page}`, `seasonal_${page}`, onUpdate, onError);

// ========================================
// React Hooks for CMS content
// ========================================

/**
 * Hook: Fetch seerah content from CMS with hardcoded fallback.
 * @param defaultSections Hardcoded sections to use as fallback
 */
export function useSeerahContent<T>(defaultSections: T[]): T[] {
  const [sections, setSections] = useState<T[]>(defaultSections);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const mergeSections = (cmsSections: CMSSeerahSection[]) => {
      return cmsSections.map((cms, i) => {
        const hc = defaultSections[i] as any;
        if (!hc) return cms as unknown as T;
        return { ...hc, ...cms, ...(pickEnFields(hc, cms)) } as unknown as T;
      });
    };

    fetchSeerahContent().then((data) => {
      if (data?.sections?.length) setSections(mergeSections(data.sections));
    });

    unsubscribe = subscribeToSeerahContent((data) => {
      if (data?.sections?.length) setSections(mergeSections(data.sections));
    });

    return () => unsubscribe?.();
  }, []);

  return sections;
}

/**
 * Hook: Fetch companions content from CMS with hardcoded fallback.
 * @param defaultCompanions Hardcoded companions array as fallback
 * @param defaultCategories Hardcoded categories array as fallback
 */
export function useCompanionsContent<C extends { id?: string }, K>(
  defaultCompanions: C[],
  defaultCategories: K[]
): { companions: C[]; categories: K[] } {
  const [companions, setCompanions] = useState<C[]>(defaultCompanions);
  const [categories, setCategories] = useState<K[]>(defaultCategories);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const mergeCompanions = (cmsData: CMSCompanion[]) => {
      // Merge CMS data with hardcoded defaults to preserve English fields
      return cmsData.map((cms) => {
        const hc = defaultCompanions.find((d: any) => d.id === cms.id || d.nameEn === cms.nameEn);
        if (!hc) return cms as unknown as C;
        return { ...hc, ...cms, ...(pickEnFields(hc, cms)) } as unknown as C;
      });
    };

    fetchCompanionsContent().then((data) => {
      if (data?.companions?.length) setCompanions(mergeCompanions(data.companions));
      if (data?.categories?.length) setCategories(data.categories as unknown as K[]);
    });

    unsubscribe = subscribeToCompanionsContent((data) => {
      if (data?.companions?.length) setCompanions(mergeCompanions(data.companions));
      if (data?.categories?.length) setCategories(data.categories as unknown as K[]);
    });

    return () => unsubscribe?.();
  }, []);

  return { companions, categories };
}

/** Pick English fields from hardcoded data that CMS may be missing */
function pickEnFields(hardcoded: any, cms: any): Record<string, any> {
  const enFields: Record<string, any> = {};
  for (const key of Object.keys(hardcoded)) {
    if (key.endsWith('En') && hardcoded[key] != null && cms[key] == null) {
      enFields[key] = hardcoded[key];
    }
  }
  return enFields;
}

/**
 * Hook: Fetch seasonal page content from CMS with hardcoded fallback.
 * @param page Which seasonal page (ramadan, hajj, mawlid, ashura)
 * @param defaultDuas Hardcoded duas array as fallback
 * @param defaultChecklist Hardcoded checklist array as fallback (optional)
 */
export function useSeasonalCMS<D, C = never>(
  page: SeasonalPageType,
  defaultDuas: D[],
  defaultChecklist?: C[]
): { duas: D[]; checklist: C[] } {
  const [duas, setDuas] = useState<D[]>(defaultDuas);
  const [checklist, setChecklist] = useState<C[]>(defaultChecklist || ([] as unknown as C[]));

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    fetchSeasonalContent(page).then((data) => {
      if (data?.duas?.length) setDuas(data.duas as unknown as D[]);
      if (data?.checklist?.length) setChecklist(data.checklist as unknown as C[]);
    });

    unsubscribe = subscribeToSeasonalContent(page, (data) => {
      if (data?.duas?.length) setDuas(data.duas as unknown as D[]);
      if (data?.checklist?.length) setChecklist(data.checklist as unknown as C[]);
    });

    return () => unsubscribe?.();
  }, [page]);

  return { duas, checklist };
}

// ─── Seasons Metadata CMS ───────────────────────────────────────────────

export interface CMSSpecialDay {
  day: number;
  nameAr: string;
  nameEn: string;
  description: string;
  virtues: string[];
  recommendedActions: string[];
}

export interface CMSSeasonMeta {
  type: string;
  nameAr: string;
  nameEn: string;
  description: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
  color: string;
  icon: string;
  specialDays?: CMSSpecialDay[];
  greetings?: string[];
}

export interface SeasonsMetadataContent {
  seasons: Record<string, CMSSeasonMeta>;
  updatedAt?: string;
}

export async function fetchSeasonsMetadata(): Promise<SeasonsMetadataContent | null> {
  return fetchContent<SeasonsMetadataContent>('seasonsMetadata', 'seasons_metadata');
}

export function subscribeToSeasonsMetadata(
  onUpdate: (data: SeasonsMetadataContent) => void
): Unsubscribe {
  return subscribeToContent<SeasonsMetadataContent>('seasonsMetadata', 'seasons_metadata', onUpdate);
}

/**
 * Load seasons metadata from CMS (non-hook version for use outside React components).
 * Returns the CMS data or null if none exists.
 */
export async function loadSeasonsMetadata(): Promise<SeasonsMetadataContent | null> {
  try {
    return await fetchSeasonsMetadata();
  } catch {
    return null;
  }
}
