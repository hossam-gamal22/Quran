// lib/memorization-presets.ts
// خطط حفظ جاهزة (Phase 2 hardcoded — تُستبدل من Firestore في Phase 5)

import type { MemorizationLevel, MemorizationMethod } from '@/types/memorization';

export interface MemorizationPreset {
  id: string;
  nameKey: string; // مفتاح في memorization-i18n
  description?: string;
  surahNumbers: number[];
  recommendedDailyAyahs: number;
  recommendedLevel: MemorizationLevel;
  recommendedMethod: MemorizationMethod;
  totalAyahs: number;
}

export const MEMORIZATION_PRESETS: MemorizationPreset[] = [
  {
    id: 'juzAmma',
    nameKey: 'preset_juzAmma',
    surahNumbers: [
      78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
      96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
      111, 112, 113, 114,
    ],
    recommendedDailyAyahs: 5,
    recommendedLevel: 'beginner',
    recommendedMethod: 'ayah_by_ayah',
    totalAyahs: 564,
  },
  {
    id: 'baqarah',
    nameKey: 'preset_baqarah',
    surahNumbers: [2],
    recommendedDailyAyahs: 3,
    recommendedLevel: 'intermediate',
    recommendedMethod: 'ayah_by_ayah',
    totalAyahs: 286,
  },
  {
    id: 'last10',
    nameKey: 'preset_last10',
    surahNumbers: [105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
    recommendedDailyAyahs: 3,
    recommendedLevel: 'beginner',
    recommendedMethod: 'ayah_by_ayah',
    totalAyahs: 48,
  },
  {
    id: 'kahf',
    nameKey: 'preset_kahf',
    surahNumbers: [18],
    recommendedDailyAyahs: 5,
    recommendedLevel: 'intermediate',
    recommendedMethod: 'group_3',
    totalAyahs: 110,
  },
  {
    id: 'mulk',
    nameKey: 'preset_mulk',
    surahNumbers: [67],
    recommendedDailyAyahs: 3,
    recommendedLevel: 'beginner',
    recommendedMethod: 'ayah_by_ayah',
    totalAyahs: 30,
  },
];

export function getPresetById(id: string): MemorizationPreset | undefined {
  return MEMORIZATION_PRESETS.find((p) => p.id === id);
}
