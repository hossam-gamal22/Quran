// data/daily-ayahs.ts
// 7 آيات تتناوب يومياً (دورة أسبوعية)
// Deterministically picked based on day of week

export interface DailyAyah {
  arabic: string;
  ref: string;
  trans: string;
  surah: number;
  ayah: number;
}

export const DAILY_AYAHS: DailyAyah[] = [
  { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', ref: 'الشرح ٥', trans: 'For indeed, with hardship will be ease.', surah: 94, ayah: 5 },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', ref: 'الطلاق ٣', trans: 'And whoever relies upon Allah - then He is sufficient for him.', surah: 65, ayah: 3 },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', ref: 'البقرة ١٥٣', trans: 'Indeed, Allah is with the patient.', surah: 2, ayah: 153 },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', ref: 'الحديد ٤', trans: 'And He is with you wherever you are.', surah: 57, ayah: 4 },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', ref: 'البقرة ١٥٢', trans: 'So remember Me; I will remember you.', surah: 2, ayah: 152 },
  { arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ', ref: 'آل عمران ١٣٤', trans: 'And Allah loves the doers of good.', surah: 3, ayah: 134 },
  { arabic: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', ref: 'التوبة ١٢٠', trans: 'Indeed, Allah does not allow to be lost the reward of the doers of good.', surah: 9, ayah: 120 },
];

/**
 * Get the ayah of the day based on the day of the week (deterministic).
 * Returns the same ayah for the same weekday.
 */
export function getAyahOfTheDay(): DailyAyah {
  const dayIndex = new Date().getDay(); // 0-6
  return DAILY_AYAHS[dayIndex % DAILY_AYAHS.length];
}
