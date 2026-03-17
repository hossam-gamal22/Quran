// lib/daily-content-override.ts
// Admin daily content override — checks Firestore before using local/API data

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { DailyHadith } from '@/data/daily-hadiths';
import { IslamicQuote } from '@/data/quotes';

const OVERRIDE_CACHE_KEY = '@daily_override_';

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface OverrideResult<T> {
  data: T | null;
  isOverride: boolean;
}

async function fetchOverride<T>(key: string): Promise<T | null> {
  const today = getTodayStr();
  const cacheKey = `${OVERRIDE_CACHE_KEY}${key}`;

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed._date === today && parsed.data) {
        return parsed.data as T;
      }
    }
  } catch {}

  // Check Firestore
  try {
    const db = getFirestore();
    const snap = await getDoc(doc(db, 'dailyContent', key));
    if (snap.exists()) {
      const docData = snap.data();
      // Only use if override is enabled and date matches (or no date specified = always active)
      if (docData.override && (!docData.date || docData.date === today)) {
        const data = docData as T;
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ _date: today, data }));
        return data;
      }
    }
    // Cache negative result to avoid repeated Firestore calls
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ _date: today, data: null }));
  } catch {
    // Firestore offline — no override
  }

  return null;
}

export interface AyahOverride {
  override: boolean;
  date?: string;
  surah: number;
  ayah: number;
  text: string;
  surahName?: string;
}

export interface HadithOverride extends DailyHadith {
  override: boolean;
  date?: string;
}

export interface QuoteOverride extends IslamicQuote {
  override: boolean;
  date?: string;
}

export interface StoryOverride {
  override: boolean;
  date?: string;
  ayahText?: string;
  surahName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrls?: string[];
}

export async function getDailyAyahOverride(): Promise<OverrideResult<AyahOverride>> {
  const data = await fetchOverride<AyahOverride>('ayah');
  return { data, isOverride: !!data };
}

export async function getDailyHadithOverride(): Promise<OverrideResult<HadithOverride>> {
  const data = await fetchOverride<HadithOverride>('hadith');
  return { data, isOverride: !!data };
}

export async function getDailyQuoteOverride(): Promise<OverrideResult<QuoteOverride>> {
  const data = await fetchOverride<QuoteOverride>('quote');
  return { data, isOverride: !!data };
}

export async function getDailyStoryOverride(): Promise<OverrideResult<StoryOverride>> {
  const data = await fetchOverride<StoryOverride>('story');
  return { data, isOverride: !!data };
}

export interface DuaOverride {
  override: boolean;
  date?: string;
  arabic: string;
  translation: string;
  reference: string;
}

export async function getDailyDuaOverride(): Promise<OverrideResult<DuaOverride>> {
  const data = await fetchOverride<DuaOverride>('dua');
  return { data, isOverride: !!data };
}
