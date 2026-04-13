// lib/photo-backgrounds-api.ts
// Fetches photo backgrounds from Firestore (admin-managed) with fallback to hardcoded list

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  FREE_PEXELS_BACKGROUNDS,
  PREMIUM_PEXELS_BACKGROUNDS,
  type PexelsBackground,
} from '@/constants/pexels-backgrounds';

const CACHE_KEY = '@photo_backgrounds_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface CachedData {
  free: PexelsBackground[];
  premium: PexelsBackground[];
  timestamp: number;
}

// Build Pexels image URLs from an ID
function pexelsUrls(id: number) {
  const base = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
  return {
    large2x: `${base}?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940`,
    small: `${base}?auto=compress&cs=tinysrgb&h=130`,
    portrait: `${base}?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`,
  };
}

// Convert Firestore doc to PexelsBackground
function docToBackground(doc: any): PexelsBackground {
  const d = doc;
  return {
    id: d.pexels_id,
    src: d.full_url?.startsWith('https://images.pexels.com')
      ? pexelsUrls(d.pexels_id)
      : { large2x: d.full_url || d.large2x_url, small: d.thumbnail_url, portrait: d.full_url || d.large2x_url },
    photographer: d.photographer || '',
    avgColor: '#888888',
    alt: '',
    isPremium: !d.is_free,
    category: d.category || 'nature',
  };
}

/**
 * Fetch active photo backgrounds from Firestore.
 * Falls back to hardcoded curated list on error or empty Firestore.
 */
export async function fetchPhotoBackgrounds(): Promise<{ free: PexelsBackground[]; premium: PexelsBackground[] }> {
  // 1. Check local cache
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CachedData = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return { free: entry.free, premium: entry.premium };
      }
    }
  } catch { /* skip corrupted cache */ }

  // 2. Fetch from Firestore
  try {
    const q = query(
      collection(db, 'photoBackgrounds'),
      where('is_active', '==', true),
      orderBy('order_index', 'asc'),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Firestore has no backgrounds yet — use hardcoded
      return { free: FREE_PEXELS_BACKGROUNDS, premium: PREMIUM_PEXELS_BACKGROUNDS };
    }

    const all = snap.docs.map(d => docToBackground(d.data()));
    const free = all.filter(b => !b.isPremium);
    const premium = all.filter(b => b.isPremium);

    // Cache results
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ free, premium, timestamp: Date.now() }));
    } catch { /* cache write failure is non-critical */ }

    return { free, premium };
  } catch (error) {
    console.warn('⚠️ Failed to fetch photo backgrounds from Firestore:', error);
    // Fallback to hardcoded
    return { free: FREE_PEXELS_BACKGROUNDS, premium: PREMIUM_PEXELS_BACKGROUNDS };
  }
}
