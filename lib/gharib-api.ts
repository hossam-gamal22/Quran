// lib/gharib-api.ts
// طبقة جلب «غريب القرآن» عن بُعد — تدمج الكلمات المبنيّة في التطبيق مع كلمات
// مُدارة من لوحة التحكم في Firestore (collection: gharibWords)، مع تخزين مؤقت
// ثلاثي (ذاكرة → AsyncStorage → Firestore) وعودة آمنة للقائمة المبنيّة دون نت.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  GHARIB_WORDS,
  GharibWord,
  normalizeForSearch,
  setGharibLookupSource,
} from '@/data/gharib-quran';

// وثيقة واحدة تحوي كل الكلمات المُدارة → كل سحبة = قراءة واحدة فقط (تكلفة ≈ صفر)
const DOC_PATH = ['appConfig', 'gharibQuran'] as const;
const CACHE_KEY = '@gharib_words_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 ساعات

interface CachedGharib {
  words: GharibWord[];
  timestamp: number;
}

let _merged: GharibWord[] | null = null;

/** دمج المبنيّة مع البعيدة (البعيدة تَغلِب عند تطابق الموضع والكلمة) */
function mergeWords(remote: GharibWord[]): GharibWord[] {
  const map = new Map<string, GharibWord>();
  const keyOf = (w: GharibWord) =>
    `${w.surah}:${w.ayah}:${normalizeForSearch(w.word)}`;
  for (const w of GHARIB_WORDS) map.set(keyOf(w), w);
  for (const w of remote) {
    if (w && w.word && w.meaning && w.surah && w.ayah) {
      map.set(keyOf(w), { ...w, surahName: w.surahName || '' });
    }
  }
  return Array.from(map.values());
}

function publish(words: GharibWord[]): GharibWord[] {
  _merged = words;
  setGharibLookupSource(words); // يحدّث فهرس النقر في المصحف أيضًا
  return words;
}

/**
 * لقطة فورية (متزامنة) لآخر قائمة محمّلة — للاستخدام في الرندر بدون انتظار.
 * تعود للقائمة المبنيّة لو لسه ما اتحملش شيء.
 */
export function getGharibWordsSync(): GharibWord[] {
  return _merged ?? GHARIB_WORDS;
}

/**
 * جلب الكلمات (مبنيّة + بعيدة مدموجة). ذاكرة → AsyncStorage(TTL) → Firestore.
 * لا ترمي استثناء أبدًا — أسوأ حالة تعود للقائمة المبنيّة.
 */
export async function fetchGharibWords(force = false): Promise<GharibWord[]> {
  if (!force && _merged) return _merged;

  // 1) كاش محلي ضمن المدة
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedGharib = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CACHE_TTL && Array.isArray(cached.words)) {
          return publish(cached.words);
        }
      }
    } catch {
      // تجاهل وكمّل لـ Firestore
    }
  }

  // 2) Firestore — قراءة وثيقة واحدة فقط
  try {
    const snap = await getDoc(doc(db, DOC_PATH[0], DOC_PATH[1]));
    const rawWords = (snap.exists() ? (snap.data() as { words?: unknown }).words : []) || [];
    const remote: GharibWord[] = (Array.isArray(rawWords) ? rawWords : [])
      .map((w) => w as GharibWord & { enabled?: boolean })
      .filter((w) => w && w.enabled !== false)
      .map((w) => ({
        word: String(w.word ?? ''),
        meaning: String(w.meaning ?? ''),
        surah: Number(w.surah),
        ayah: Number(w.ayah),
        surahName: String(w.surahName ?? ''),
      }));
    const merged = mergeWords(remote);
    AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ words: merged, timestamp: Date.now() } as CachedGharib),
    ).catch(() => {});
    return publish(merged);
  } catch (e) {
    if (__DEV__) console.warn('[gharib-api] fetch failed, using bundled:', e);
    return publish(GHARIB_WORDS);
  }
}

/** فرض تحديث من Firestore (مثلًا بعد تعديل في لوحة التحكم) */
export async function refreshGharibWords(): Promise<GharibWord[]> {
  _merged = null;
  await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  return fetchGharibWords(true);
}
