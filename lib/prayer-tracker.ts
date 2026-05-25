// lib/prayer-tracker.ts
// Prayer tracking utility for صلاتي (Smart Prayer Tracker)
// Handles rakat counting and prayer completion logic

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SalatiPrayerType = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type TemporaryPrayerPresetKey = 'qiyam' | 'witr' | 'duha' | 'nafl';

export interface PrayerInfo {
  key: SalatiPrayerType;
  nameAr: string;
  nameEn: string;
  rakats: number;
  icon: string;
  iconColor: string;
}

export interface TrackerState {
  prayer: SalatiPrayerType | null;
  currentRakat: number;
  sujoodCount: number;
  totalRakats: number;
  isCompleted: boolean;
}

export interface TemporaryPrayerPreset {
  key: TemporaryPrayerPresetKey;
  nameAr: string;
  nameEn: string;
  rakats: number;
  icon: string;
  iconColor: string;
}

// ---------------------------------------------------------------------------
// Prayer Configuration
// ---------------------------------------------------------------------------

export const PRAYER_CONFIG: Record<SalatiPrayerType, PrayerInfo> = {
  fajr: {
    key: 'fajr',
    nameAr: 'صلاة الفجر',
    nameEn: 'Fajr Prayer',
    rakats: 2,
    icon: 'weather-sunset-up',
    iconColor: '#F5A623', // Amber/orange for dawn
  },
  dhuhr: {
    key: 'dhuhr',
    nameAr: 'صلاة الظهر',
    nameEn: 'Dhuhr Prayer',
    rakats: 4,
    icon: 'white-balance-sunny',
    iconColor: '#FFD93D', // Yellow for noon sun
  },
  asr: {
    key: 'asr',
    nameAr: 'صلاة العصر',
    nameEn: 'Asr Prayer',
    rakats: 4,
    icon: 'weather-sunset-down',
    iconColor: '#E67E22', // Orange for afternoon
  },
  maghrib: {
    key: 'maghrib',
    nameAr: 'صلاة المغرب',
    nameEn: 'Maghrib Prayer',
    rakats: 3,
    icon: 'weather-sunset',
    iconColor: '#D35400', // Deep orange for sunset
  },
  isha: {
    key: 'isha',
    nameAr: 'صلاة العشاء',
    nameEn: 'Isha Prayer',
    rakats: 4,
    icon: 'weather-night',
    iconColor: '#5D6D7E', // Blue-gray for night
  },
};

// Prayer order for display
export const PRAYER_ORDER: SalatiPrayerType[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const TEMPORARY_PRAYER_MIN_RAKATS = 1;
export const TEMPORARY_PRAYER_MAX_RAKATS = 20;

export const TEMPORARY_PRAYER_PRESETS: TemporaryPrayerPreset[] = [
  {
    key: 'qiyam',
    nameAr: 'قيام الليل',
    nameEn: 'Night Prayer',
    rakats: 2,
    icon: 'weather-night',
    iconColor: '#6B7FD7',
  },
  {
    key: 'witr',
    nameAr: 'الوتر',
    nameEn: 'Witr',
    rakats: 1,
    icon: 'moon-waning-crescent',
    iconColor: '#8E7CC3',
  },
  {
    key: 'duha',
    nameAr: 'الشروق',
    nameEn: 'Sunrise',
    rakats: 2,
    icon: 'weather-sunset-up',
    iconColor: '#F5A623',
  },
  {
    key: 'nafl',
    nameAr: 'سنة/نافلة',
    nameEn: 'Sunnah/Nafl',
    rakats: 2,
    icon: 'star-crescent',
    iconColor: '#0d8e62',
  },
];

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Calculate current rakat based on sujood count
 * 1/2 sujood = rakat 1, 3/4 = rakat 2, etc.
 */
export function calculateRakat(sujoodCount: number): number {
  if (sujoodCount <= 0) return 0;
  return Math.ceil(sujoodCount / 2);
}

/**
 * Calculate fully completed rakats based on sujood count.
 * This is intentionally separate from the displayed current rakat.
 */
export function calculateCompletedRakats(sujoodCount: number): number {
  return Math.floor(Math.max(0, sujoodCount) / 2);
}

/**
 * Check if prayer is completed
 */
export function isPrayerCompleted(sujoodCount: number, totalRakats: number): boolean {
  const completedRakats = calculateCompletedRakats(sujoodCount);
  return completedRakats >= totalRakats;
}

/**
 * Get remaining sujood to complete prayer
 */
export function getRemainingSujood(sujoodCount: number, totalRakats: number): number {
  const requiredSujood = totalRakats * 2;
  return Math.max(0, requiredSujood - sujoodCount);
}

/**
 * Get remaining rakats to complete prayer
 */
export function getRemainingRakats(sujoodCount: number, totalRakats: number): number {
  const completedRakats = calculateCompletedRakats(sujoodCount);
  return Math.max(0, totalRakats - completedRakats);
}

/**
 * Get progress percentage (0-100)
 */
export function getProgressPercentage(sujoodCount: number, totalRakats: number): number {
  const requiredSujood = totalRakats * 2;
  return Math.min(100, (sujoodCount / requiredSujood) * 100);
}

/**
 * Create initial tracker state
 */
export function createTrackerState(prayer: SalatiPrayerType | null): TrackerState {
  if (!prayer) {
    return {
      prayer: null,
      currentRakat: 0,
      sujoodCount: 0,
      totalRakats: 0,
      isCompleted: false,
    };
  }
  
  return {
    prayer,
    currentRakat: 0,
    sujoodCount: 0,
    totalRakats: PRAYER_CONFIG[prayer].rakats,
    isCompleted: false,
  };
}

/**
 * Update tracker state with new sujood count
 */
export function updateTrackerState(state: TrackerState, sujoodCount: number): TrackerState {
  if (!state.prayer) return state;
  
  const currentRakat = calculateRakat(sujoodCount);
  const isCompleted = isPrayerCompleted(sujoodCount, state.totalRakats);
  
  return {
    ...state,
    sujoodCount,
    currentRakat,
    isCompleted,
  };
}

/**
 * Get prayer info by key
 */
export function getPrayerInfo(prayer: SalatiPrayerType): PrayerInfo {
  return PRAYER_CONFIG[prayer];
}

/**
 * Get translated prayer name
 */
export function getPrayerName(prayer: SalatiPrayerType, language: string = 'ar'): string {
  const info = PRAYER_CONFIG[prayer];
  if (prayer === 'dhuhr' && new Date().getDay() === 5) {
    return language === 'ar' ? 'صلاة الجمعة' : 'Jumuah Prayer';
  }
  return language === 'ar' ? info.nameAr : info.nameEn;
}
