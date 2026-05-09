// lib/memorization-achievements.ts
// إنجازات الحفظ — قائمة معالم وفحص فك القفل بناءً على الإحصائيات.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MemorizationStats, MemorizationStreak } from '@/types/memorization';

export interface Achievement {
  id: string;
  titleAr: string;
  descAr: string;
  icon: string; // MaterialCommunityIcons name
  check: (s: MemorizationStats, st: MemorizationStreak) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_ayah',
    titleAr: 'البداية المباركة',
    descAr: 'أول آية محفوظة',
    icon: 'star-four-points',
    check: (s) => s.totalMemorized >= 1,
  },
  {
    id: 'ten_ayahs',
    titleAr: 'عشر آيات',
    descAr: 'حفظ 10 آيات',
    icon: 'numeric-1-box',
    check: (s) => s.totalMemorized >= 10,
  },
  {
    id: 'fifty_ayahs',
    titleAr: 'خمسون آية',
    descAr: 'حفظ 50 آية',
    icon: 'numeric-5-box',
    check: (s) => s.totalMemorized >= 50,
  },
  {
    id: 'hundred_ayahs',
    titleAr: 'مئة آية',
    descAr: 'حفظ 100 آية',
    icon: 'numeric-9-plus-box',
    check: (s) => s.totalMemorized >= 100,
  },
  {
    id: 'first_surah',
    titleAr: 'أول سورة',
    descAr: 'أول سورة مكتملة',
    icon: 'book-check',
    check: (s) => s.totalSurahsCompleted >= 1,
  },
  {
    id: 'five_surahs',
    titleAr: 'خمس سور',
    descAr: '5 سور مكتملة',
    icon: 'book-multiple',
    check: (s) => s.totalSurahsCompleted >= 5,
  },
  {
    id: 'juz_amma',
    titleAr: 'جزء عمّ',
    descAr: 'حفظ جزء عمّ كاملًا',
    icon: 'medal',
    check: (s) => {
      // Surahs 78-114 (37 surahs)
      let done = 0;
      for (let n = 78; n <= 114; n++) {
        const v = s.perSurahProgress[n];
        if (v && v.total > 0 && v.memorized === v.total) done++;
      }
      return done >= 37;
    },
  },
  {
    id: 'streak_3',
    titleAr: 'ثلاثة أيام',
    descAr: 'سلسلة 3 أيام متتالية',
    icon: 'fire',
    check: (_s, st) => st.current >= 3 || st.best >= 3,
  },
  {
    id: 'streak_7',
    titleAr: 'أسبوع كامل',
    descAr: 'سلسلة 7 أيام متتالية',
    icon: 'fire',
    check: (_s, st) => st.current >= 7 || st.best >= 7,
  },
  {
    id: 'streak_30',
    titleAr: 'شهر كامل',
    descAr: 'سلسلة 30 يومًا',
    icon: 'trophy',
    check: (_s, st) => st.current >= 30 || st.best >= 30,
  },
  {
    id: 'streak_100',
    titleAr: 'مئة يوم',
    descAr: 'سلسلة 100 يوم',
    icon: 'crown',
    check: (_s, st) => st.current >= 100 || st.best >= 100,
  },
];

const STORAGE_KEY = '@rooh_memorization_unlocked_achievements';

export async function getUnlockedAchievements(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setUnlockedAchievements(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

/**
 * Check stats against achievements; return list of newly unlocked achievement objects.
 * Persists the updated unlocked list.
 */
export async function checkAndUnlockAchievements(
  stats: MemorizationStats,
  streak: MemorizationStreak,
): Promise<Achievement[]> {
  const unlocked = await getUnlockedAchievements();
  const newly: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked.includes(a.id)) continue;
    if (a.check(stats, streak)) {
      newly.push(a);
      unlocked.push(a.id);
    }
  }
  if (newly.length > 0) {
    await setUnlockedAchievements(unlocked);
  }
  return newly;
}
