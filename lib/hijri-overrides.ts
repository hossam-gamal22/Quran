// lib/hijri-overrides.ts
// Firestore CRUD for Hijri admin overrides (Layer 1)
// Collection: hijri_overrides
// Document ID: {countryCode}_{hijriYear}_{hijriMonth}

import { db } from '@/lib/firebase-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

// ============================================
// Types
// ============================================

export interface HijriOverride {
  countryCode: string;
  countryName: string;
  hijriYear: number;
  hijriMonth: number;
  monthLength: 29 | 30;
  hijriStartGregorian: string; // ISO date string
  source: string;
  sourceUrl?: string;
  announcedAt?: Timestamp;
  updatedBy?: string;
  isVerified: boolean;
}

const CACHE_PREFIX = '@hijri_override_cache_';

const getDocId = (countryCode: string, hijriYear: number, hijriMonth: number) =>
  `${countryCode}_${hijriYear}_${hijriMonth}`;

const getCacheKey = (countryCode: string, hijriYear: number, hijriMonth: number) =>
  `${CACHE_PREFIX}${getDocId(countryCode, hijriYear, hijriMonth)}`;

async function cacheOverride(override: HijriOverride): Promise<void> {
  try {
    await AsyncStorage.setItem(
      getCacheKey(override.countryCode, override.hijriYear, override.hijriMonth),
      JSON.stringify({ ...override, _cachedAt: new Date().toISOString() }),
    );
  } catch {}
}

export async function cacheHijriOverrideFromPush(override: HijriOverride): Promise<void> {
  await cacheOverride(override);
}

export async function removeCachedHijriOverride(
  countryCode: string,
  hijriYear: number,
  hijriMonth: number,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(getCacheKey(countryCode, hijriYear, hijriMonth));
  } catch {}
}

async function getCachedOverride(
  countryCode: string,
  hijriYear: number,
  hijriMonth: number,
): Promise<HijriOverride | null> {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(countryCode, hijriYear, hijriMonth));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HijriOverride;
    return parsed?.isVerified ? parsed : null;
  } catch {
    return null;
  }
}

// ============================================
// Fetch Override from Firestore
// ============================================

export async function getFirestoreOverride(
  countryCode: string,
  hijriYear: number,
  hijriMonth: number,
): Promise<HijriOverride | null> {
  try {
    const docId = getDocId(countryCode, hijriYear, hijriMonth);
    const docRef = doc(db, 'hijri_overrides', docId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      await removeCachedHijriOverride(countryCode, hijriYear, hijriMonth);
      return null;
    }

    const data = snapshot.data() as HijriOverride;
    if (!data.isVerified) return null;

    await cacheOverride(data);
    return data;
  } catch {
    return getCachedOverride(countryCode, hijriYear, hijriMonth);
  }
}

// ============================================
// Check if override exists for a country+month
// ============================================

export async function hasOverride(
  countryCode: string,
  hijriYear: number,
  hijriMonth: number,
): Promise<boolean> {
  try {
    const result = await getFirestoreOverride(countryCode, hijriYear, hijriMonth);
    return result !== null;
  } catch {
    return false;
  }
}
