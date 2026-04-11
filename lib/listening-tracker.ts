// lib/listening-tracker.ts
// تتبع وقت سماع القرآن والراديو يومياً

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@quran_listening_today';

interface ListeningData {
  date: string; // YYYY-MM-DD
  seconds: number;
}

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getStoredData(): Promise<ListeningData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: ListeningData = JSON.parse(raw);
      if (data.date === getTodayDate()) {
        return data;
      }
    }
  } catch (e) {
    console.warn('[ListeningTracker] Error reading stored data:', e);
  }
  return { date: getTodayDate(), seconds: 0 };
}

/**
 * أضف وقت سماع (بالثواني) لليوم الحالي
 */
export async function addListeningTime(seconds: number): Promise<void> {
  if (seconds <= 0) return;
  try {
    const data = await getStoredData();
    data.seconds += seconds;
    data.date = getTodayDate();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[ListeningTracker] Error saving listening time:', e);
  }
}

/**
 * جيب عدد دقائق السماع النهاردة
 */
export async function getTodayListeningMinutes(): Promise<number> {
  const data = await getStoredData();
  return Math.floor(data.seconds / 60);
}

/**
 * جيب عدد ثواني السماع النهاردة
 */
export async function getTodayListeningSeconds(): Promise<number> {
  const data = await getStoredData();
  return data.seconds;
}
