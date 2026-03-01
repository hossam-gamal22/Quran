/**
 * Khatm (Quran Completion) Storage & Logic
 * تسجيل ختمات القرآن وتتبع التقدم
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@quran_khatm';

export interface KhatmRecord {
  id: string;
  name: string;           // "ختمة رمضان 2025"
  startDate: number;      // timestamp
  endDate?: number;       // timestamp لما تكتمل
  completedSurahs: number[]; // أرقام السور المقروءة
  totalAyahsRead: number;
  isCompleted: boolean;
  notes?: string;
}

export interface KhatmStats {
  totalCompleted: number;
  currentKhatm: KhatmRecord | null;
  progressPercent: number;
  completedSurahs: number;
  remainingSurahs: number;
}

const TOTAL_SURAHS = 114;

export async function getAllKhatm(): Promise<KhatmRecord[]> {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveKhatm(records: KhatmRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(records));
}

export async function startNewKhatm(name: string): Promise<KhatmRecord> {
  const records = await getAllKhatm();
  const newKhatm: KhatmRecord = {
    id: Date.now().toString(),
    name: name.trim() || `ختمة ${new Date().toLocaleDateString('ar-EG')}`,
    startDate: Date.now(),
    completedSurahs: [],
    totalAyahsRead: 0,
    isCompleted: false,
  };
  await saveKhatm([newKhatm, ...records]);
  return newKhatm;
}

export async function getCurrentKhatm(): Promise<KhatmRecord | null> {
  const records = await getAllKhatm();
  return records.find(r => !r.isCompleted) || null;
}

export async function markSurahComplete(
  khatmId: string,
  surahNumber: number,
  ayahCount: number
): Promise<KhatmRecord | null> {
  const records = await getAllKhatm();
  const idx = records.findIndex(r => r.id === khatmId);
  if (idx === -1) return null;

  const khatm = { ...records[idx] };
  if (!khatm.completedSurahs.includes(surahNumber)) {
    khatm.completedSurahs = [...khatm.completedSurahs, surahNumber];
    khatm.totalAyahsRead += ayahCount;
  }

  // تحقق من الاكتمال
  if (khatm.completedSurahs.length >= TOTAL_SURAHS) {
    khatm.isCompleted = true;
    khatm.endDate = Date.now();
  }

  records[idx] = khatm;
  await saveKhatm(records);
  return khatm;
}

export async function unmarkSurahComplete(
  khatmId: string,
  surahNumber: number,
  ayahCount: number
): Promise<void> {
  const records = await getAllKhatm();
  const idx = records.findIndex(r => r.id === khatmId);
  if (idx === -1) return;

  const khatm = { ...records[idx] };
  khatm.completedSurahs = khatm.completedSurahs.filter(s => s !== surahNumber);
  khatm.totalAyahsRead = Math.max(0, khatm.totalAyahsRead - ayahCount);
  khatm.isCompleted = false;
  khatm.endDate = undefined;

  records[idx] = khatm;
  await saveKhatm(records);
}

export async function deleteKhatm(khatmId: string): Promise<void> {
  const records = await getAllKhatm();
  await saveKhatm(records.filter(r => r.id !== khatmId));
}

export async function getKhatmStats(): Promise<KhatmStats> {
  const records = await getAllKhatm();
  const completed = records.filter(r => r.isCompleted).length;
  const current = records.find(r => !r.isCompleted) || null;
  const progressPercent = current
    ? Math.round((current.completedSurahs.length / TOTAL_SURAHS) * 100)
    : 0;
  return {
    totalCompleted: completed,
    currentKhatm: current,
    progressPercent,
    completedSurahs: current?.completedSurahs.length || 0,
    remainingSurahs: current ? TOTAL_SURAHS - current.completedSurahs.length : 0,
  };
}

export function getDurationText(startDate: number, endDate?: number): string {
  const end = endDate || Date.now();
  const diffMs = end - startDate;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'اليوم';
  if (days === 1) return 'يوم واحد';
  if (days < 10) return `${days} أيام`;
  return `${days} يوماً`;
}
