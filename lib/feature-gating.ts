// lib/feature-gating.ts
// نظام بوابة الميزات — يحدد أي ميزة للبريميوم فقط

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { shouldRefetchContent, markContentFetched } from './content-manifest';
import { db } from '@/config/firebase';
import type { FeatureGatingConfig, PremiumFeatureKey } from '@/types/premium';

const CACHE_KEY = '@feature_gating_cache';

/** الإعدادات الافتراضية — كل الميزات premium-only (آمن) */
export const DEFAULT_FEATURE_GATING: FeatureGatingConfig = {
  ad_removal: { premiumOnly: true },
  exclusive_themes: { premiumOnly: true },
  sound_downloads: { premiumOnly: true },
  cloud_backup: { premiumOnly: true },
  advanced_stats: { premiumOnly: true },
  custom_backgrounds: { premiumOnly: true },
  multiple_khatma: { premiumOnly: true },
  premium_widgets: { premiumOnly: true },
  widget_themes: { premiumOnly: true },
};

let memoryCache: FeatureGatingConfig | null = null;

/** Synchronous access to the in-memory feature config (for guards) */
export function getFeatureGatingMemoryCache(): FeatureGatingConfig {
  return memoryCache ?? DEFAULT_FEATURE_GATING;
}

/**
 * جلب إعدادات بوابة الميزات من Firestore مع caching ثلاثي
 * (ذاكرة → AsyncStorage → Firestore)
 */
export async function fetchFeatureGatingConfig(): Promise<FeatureGatingConfig> {
  // 1. Memory cache
  if (memoryCache) return memoryCache;

  // 2. AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        memoryCache = JSON.parse(cached);
      } catch {
        memoryCache = null;
      }
      if (memoryCache) {
        // Background refresh from Firestore
        refreshFromFirestore().catch(() => {});
        return memoryCache;
      }
    }
  } catch {}

  // 3. Firestore
  return refreshFromFirestore();
}

async function refreshFromFirestore(): Promise<FeatureGatingConfig> {
  try {
    const snap = await getDoc(doc(db, 'config', 'feature-gating'));
    if (snap.exists()) {
      const data = snap.data() as FeatureGatingConfig;
      // Merge with defaults to ensure all keys exist
      const merged = { ...DEFAULT_FEATURE_GATING, ...data };
      memoryCache = merged;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {}

  memoryCache = DEFAULT_FEATURE_GATING;
  return DEFAULT_FEATURE_GATING;
}

/** هل الميزة محجوزة للبريميوم فقط؟ */
export function isFeaturePremium(
  key: PremiumFeatureKey,
  config: FeatureGatingConfig = DEFAULT_FEATURE_GATING
): boolean {
  return config[key]?.premiumOnly ?? true;
}

/**
 * Manifest-gated one-shot read of feature gating config (replaces a live
 * single-doc listener). The admin bumps the 'featureGating' manifest key on
 * save; the 24h safety TTL is the backstop. Returns a no-op unsubscribe.
 */
export function subscribeToFeatureGating(
  onChange: (config: FeatureGatingConfig) => void
): () => void {
  (async () => {
    try {
      if (!(await shouldRefetchContent('featureGating'))) return;
      const snap = await getDoc(doc(db, 'config', 'feature-gating'));
      await markContentFetched('featureGating');
      if (!snap.exists()) return;
      const data = snap.data() as FeatureGatingConfig;
      const merged = { ...DEFAULT_FEATURE_GATING, ...data };
      memoryCache = merged;
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged)).catch(() => {});
      onChange(merged);
    } catch (e) {
      console.log('⚠️ Feature gating fetch error:', e);
    }
  })();
  return () => {};
}
