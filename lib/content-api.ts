// lib/content-api.ts
// Generic Content CMS API — Fetch/cache/subscribe for all CMS content types
// (Hajj, Umrah, Seerah, Companions, Seasonal)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { EXTRA_RELIGIOUS_STORIES } from '@/data/religious-stories-extra';
import { dedupByName } from '@/lib/dedup-by-name';

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
  videoUrl?: string;
  videoTitle?: string;
  videoStoragePath?: string;
  titleTranslations?: Record<string, string>;
  iconUrl?: string;
}

export interface SeerahContent {
  sections: CMSSeerahSection[];
  audioUrl?: string;
  audioTitle?: string;
  audioStoragePath?: string;
  updatedAt?: string;
}

export interface SeerahContentResult<T> {
  sections: T[];
  audioUrl?: string;
  audioTitle?: string;
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
  videoUrl?: string;
  videoTitle?: string;
  videoStoragePath?: string;
  audioUrl?: string;
  audioTitle?: string;
  audioStoragePath?: string;
  transcript?: string;
  transcriptEn?: string;
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

// ========================================
// Types for Religious Stories content
// ========================================

export interface CMSReligiousStory {
  id: string;
  title: string;
  titleEn?: string;
  brief?: string;
  briefEn?: string;
  icon?: string;
  // Audio is attached later from the admin panel; bundled seeds ship without
  // it. Empty string means "no audio yet — show text/listen-disabled state".
  audioUrl: string;
  audioTitle?: string;
  transcript?: string;
  transcriptEn?: string;
  sourceUrl?: string;
  order?: number;
}

export interface ReligiousStoriesContent {
  stories: CMSReligiousStory[];
  updatedAt?: string;
  contentVersion?: number;
  updateMode?: 'manual' | 'interval';
  refreshIntervalMinutes?: number;
}

// ─── Seasonal CMS types ─────────────────────────────────────────────────

export interface CMSSeasonalDua {
  id: string;
  titleKey: string;
  arabic: string;
  translation: string;
  reference?: string;
  sourceUrl?: string;
  grade?: string;
  note?: string;
}

export interface CMSSeasonalChecklist {
  id: string;
  icon: string;
  labelKey: string;
  color: string;
  reference?: string;
  sourceUrl?: string;
  grade?: string;
  note?: string;
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

export async function getStoredContent<T>(cacheKey: string): Promise<T | null> {
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) as T;
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + cacheKey);
    if (!cached) return null;
    const data = JSON.parse(cached) as T;
    memoryCache.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
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

export const fetchReligiousStoriesContent = () =>
  fetchContent<ReligiousStoriesContent>('religiousStoriesContent', 'religious_stories');

export const subscribeToReligiousStoriesContent = (
  onUpdate: (data: ReligiousStoriesContent) => void,
  onError?: (error: Error) => void
) => subscribeToContent<ReligiousStoriesContent>('religiousStoriesContent', 'religious_stories', onUpdate, onError);

// ─── Seasonal content helpers ───────────────────────────────────────────

export const fetchSeasonalContent = (page: SeasonalPageType) =>
  fetchContent<CMSSeasonalContent>(`seasonalContent_${page}`, `seasonal_${page}`);

export const subscribeToSeasonalContent = (
  page: SeasonalPageType,
  onUpdate: (data: CMSSeasonalContent) => void,
  onError?: (error: Error) => void
) => subscribeToContent<CMSSeasonalContent>(`seasonalContent_${page}`, `seasonal_${page}`, onUpdate, onError);

// ========================================
// React Hooks for CMS content
// ========================================

/**
 * Hook: Fetch seerah content from CMS with hardcoded fallback.
 * Returns merged sections plus the single top-level audio (one audio per
 * Seerah page, not per section).
 * @param defaultSections Hardcoded sections to use as fallback
 */
export function useSeerahContent<T>(defaultSections: T[]): SeerahContentResult<T> {
  const [result, setResult] = useState<SeerahContentResult<T>>({ sections: defaultSections });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const mergeSections = (cmsSections: CMSSeerahSection[]) => {
      return cmsSections.map((cms, i) => {
        const hc = defaultSections[i] as any;
        if (!hc) return cms as unknown as T;
        return { ...hc, ...cms, ...(pickEnFields(hc, cms)) } as unknown as T;
      });
    };

    const apply = (data: SeerahContent | null | undefined) => {
      if (!data) return;
      const sections = data.sections?.length ? mergeSections(data.sections) : defaultSections;
      setResult({
        sections,
        audioUrl: data.audioUrl,
        audioTitle: data.audioTitle,
      });
    };

    fetchSeerahContent().then(apply);
    unsubscribe = subscribeToSeerahContent(apply);

    return () => unsubscribe?.();
  }, []);

  return result;
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
      // Merge CMS + bundled: CMS wins per-id, but bundled-only entries
      // (e.g. new companions added to the JS bundle that the admin has not yet
      // pushed to Firestore) are preserved instead of being dropped. Without
      // this fallback the screen would silently shrink to the Firestore list.
      const cmsById = new Map<string, CMSCompanion>();
      for (const cms of cmsData) {
        if (cms.id) cmsById.set(cms.id, cms);
      }
      const merged: C[] = [];
      const seen = new Set<string>();

      for (const hc of defaultCompanions) {
        const id = (hc as { id?: string }).id;
        if (!id) continue;
        const cms = cmsById.get(id);
        if (cms) {
          merged.push({ ...hc, ...cms, ...pickEnFields(hc, cms) } as unknown as C);
        } else {
          merged.push(hc);
        }
        seen.add(id);
      }
      for (const cms of cmsData) {
        if (cms.id && seen.has(cms.id)) continue;
        merged.push(cms as unknown as C);
      }
      // Dedup by Arabic name (after normalization): keep the entry with
      // audio/video if any, else the longer transcript. Stops the same
      // companion from showing twice when an admin re-imports.
      const { deduped } = dedupByName(
        merged as unknown as Array<CMSCompanion & { id?: string }>,
        (entry) => entry.nameAr
      );
      return deduped as unknown as C[];
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

/**
 * Hook: Fetch religious stories content from CMS.
 */
export function useReligiousStoriesContent(): CMSReligiousStory[] {
  return useReligiousStoriesContentStatus().stories;
}

// Bundled religious-story seed — lifted from data/religious-stories-extra.ts
// into the CMSReligiousStory shape so the merge logic below can treat seed
// and Firestore docs uniformly. Stable order matches the source array.
const BUNDLED_RELIGIOUS_SEED: CMSReligiousStory[] = EXTRA_RELIGIOUS_STORIES.map((story) => ({
  id: story.id,
  title: story.title,
  titleEn: story.titleEn,
  brief: story.brief,
  briefEn: story.briefEn,
  icon: story.icon,
  audioUrl: '',
  audioTitle: '',
  transcript: story.transcript,
  transcriptEn: story.transcriptEn,
  sourceUrl: story.sourceUrl,
  order: story.order,
}));

export function useReligiousStoriesContentStatus(): {
  stories: CMSReligiousStory[];
  isRefreshing: boolean;
  hasCachedStories: boolean;
} {
  // Render with the bundled seed on first paint so users never see an empty
  // list while AsyncStorage/Firestore are still resolving.
  const [stories, setStories] = useState<CMSReligiousStory[]>(() =>
    [...BUNDLED_RELIGIOUS_SEED].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasCachedStories, setHasCachedStories] = useState(BUNDLED_RELIGIOUS_SEED.length > 0);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let currentVersion = '';
    const lastSyncKey = `${CACHE_PREFIX}religious_stories:last_sync_at`;

    const normalizeStories = (items: CMSReligiousStory[]) => {
      // Title is the only hard requirement now. Audio is optional — bundled
      // seeds and freshly-created admin entries ship without it; the player
      // hides itself when audioUrl is empty.
      const firestoreById = new Map<string, CMSReligiousStory>();
      for (const story of items) {
        if (!story?.id || !story.title?.trim()) continue;
        firestoreById.set(story.id, story);
      }
      // Merge: bundled seed first, Firestore wins on collision (per id). Any
      // Firestore-only stories that don't shadow a seed are appended.
      const merged: CMSReligiousStory[] = [];
      const seenIds = new Set<string>();
      for (const seed of BUNDLED_RELIGIOUS_SEED) {
        const fromFirestore = firestoreById.get(seed.id);
        merged.push(fromFirestore || seed);
        seenIds.add(seed.id);
      }
      for (const story of firestoreById.values()) {
        if (seenIds.has(story.id)) continue;
        merged.push(story);
        seenIds.add(story.id);
      }

      // Dedup by normalized title: when two stories share the same title,
      // keep the one with audio (or longer transcript). Shared helper so
      // companions follow the same rule.
      const { deduped } = dedupByName(merged, (story) => story.title);
      return deduped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    };

    const getVersion = (data: ReligiousStoriesContent) =>
      String(data.contentVersion ?? data.updatedAt ?? JSON.stringify(data.stories?.map((story) => [story.id, story.audioUrl, story.transcriptEn])));

    const applyData = (data: ReligiousStoriesContent, options: { showRefresh: boolean }) => {
      if (!mounted) return;
      const normalized = normalizeStories(data.stories || []);
      const nextVersion = getVersion(data);
      const changed = currentVersion && currentVersion !== nextVersion;
      currentVersion = nextVersion;

      if (options.showRefresh || changed) {
        setIsRefreshing(true);
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          if (mounted) setIsRefreshing(false);
        }, 850);
      }

      setStories(normalized);
      setHasCachedStories(normalized.length > 0);
      AsyncStorage.setItem(lastSyncKey, String(Date.now())).catch(() => {});
    };

    getStoredContent<ReligiousStoriesContent>('religious_stories').then(async (cached) => {
      if (!mounted) return;

      if (cached?.stories?.length) {
        currentVersion = getVersion(cached);
        const normalized = normalizeStories(cached.stories);
        setStories(normalized);
        setHasCachedStories(normalized.length > 0);

        if (cached.updateMode === 'interval' && (cached.refreshIntervalMinutes ?? 0) > 0) {
          const lastSync = Number(await AsyncStorage.getItem(lastSyncKey).catch(() => '0')) || 0;
          const intervalMs = (cached.refreshIntervalMinutes || 60) * 60 * 1000;
          if (Date.now() - lastSync > intervalMs) {
            setIsRefreshing(true);
          }
        }
      } else {
        setIsRefreshing(true);
      }

      if (!mounted) return;
      unsubscribe = subscribeToReligiousStoriesContent((data) => {
        applyData(data, { showRefresh: !currentVersion });
      }, () => {
        setIsRefreshing(false);
      });
    });

    return () => {
      mounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubscribe?.();
    };
  }, []);

  return { stories, isRefreshing, hasCachedStories };
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
  reference?: string;
  sourceUrl?: string;
  grade?: string;
  note?: string;
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
