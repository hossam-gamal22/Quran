import { db } from '@/config/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import qaEn from '@/data/json/qa-translations-en.json';

const QA_CACHE_KEY = '@qa_content_cache';


export interface QAQuestion {
  id: string;
  question: Record<string, string>;
  answer: Record<string, string>;
  internalSourceName?: string;
  internalSourceUrl?: string;
  internalNotes?: string;
  order: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QACategory {
  id: string;
  name: Record<string, string>;
  icon: string;
  order: number;
  isVisible: boolean;
  questions: QAQuestion[];
}

export interface QAContent {
  categories: QACategory[];
  lastUpdated?: string;
  version?: number;
}

export async function fetchQAContent(): Promise<QAContent> {
  // 1. Try cache first (fast startup)
  try {
    const cached = await AsyncStorage.getItem(QA_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as QAContent;
      refreshQAContent();
      return data;
    }
  } catch {}

  // 2. Try Firestore
  try {
    const snap = await getDoc(doc(db, 'qaContent', 'main'));
    if (snap.exists()) {
      const data = snap.data() as QAContent;
      await AsyncStorage.setItem(QA_CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('[QA] Firestore fetch failed:', e);
  }

  // 3. Fallback to bundled JSON converted to QAContent format
  return convertLegacyData();
}

async function refreshQAContent(): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'qaContent', 'main'));
    if (snap.exists()) {
      await AsyncStorage.setItem(QA_CACHE_KEY, JSON.stringify(snap.data()));
    }
  } catch {}
}

export function subscribeToQAContent(
  callback: (data: QAContent) => void
): () => void {
  return onSnapshot(
    doc(db, 'qaContent', 'main'),
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as QAContent;
        try {
          await AsyncStorage.setItem(QA_CACHE_KEY, JSON.stringify(data));
        } catch {}
        callback(data);
      }
    },
    (error) => console.warn('[QA] Snapshot error:', error)
  );
}

interface FilteredCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  isVisible: boolean;
  questions: FilteredQuestion[];
}

interface FilteredQuestion {
  id: string;
  question: string;
  answer: string;
  order: number;
  isVisible: boolean;
}

function resolveLocalizedText(value: string | Record<string, string> | undefined, language: string): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value[language] || value.en || value.ar || '';
}

export function filterVisibleContent(
  content: QAContent,
  language: string
): FilteredCategory[] {
  return content.categories
    .filter(cat => cat.isVisible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(cat => ({
      id: cat.id,
      icon: cat.icon || '',
      order: cat.order ?? 0,
      isVisible: true,
      name: resolveLocalizedText(cat.name, language),
      questions: (cat.questions || [])
        .filter(q => q.isVisible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(q => ({
          id: q.id,
          order: q.order ?? 0,
          isVisible: true,
          question: resolveLocalizedText(q.question, language),
          answer: resolveLocalizedText(q.answer, language),
        })),
    }));
}

function convertLegacyData(): QAContent {
  try {
    const raw = require('@/data/json/qa-data.json');
    const categories: QACategory[] = (raw.categories || []).map((cat: any, idx: number) => ({
      id: cat.id,
      name: { ar: cat.name, en: (qaEn.categories as Record<string,string>)[cat.id] || cat.name },
      icon: cat.image || '',
      order: idx,
      isVisible: true,
      questions: (raw.items?.[cat.id] || []).map((item: any, qIdx: number) => ({
        id: item.id,
        question: { ar: item.question, en: (qaEn.questions as Record<string,string>)[item.id] || item.question },
        answer: { ar: item.answer, en: (qaEn.answers as Record<string,string>)[item.id] || item.answer },
        order: qIdx,
        isVisible: true,
      })),
    }));
    return { categories, version: 0 };
  } catch {
    return { categories: [], version: 0 };
  }
}
