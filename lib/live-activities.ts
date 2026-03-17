// lib/live-activities.ts
// مدير الأنشطة الحالية (Live Activities) — iOS 16.1+

import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LiveActivityModule = NativeModules.LiveActivityModule;

// ===================================================
// Types
// ===================================================

export type LiveActivityStyle =
  | 'prayer_times'
  | 'prayer_times_sunrise'
  | 'prayer_with_dua'
  | 'prayer_with_ayah';

export interface LiveActivitySettings {
  enabled: boolean;
  style: LiveActivityStyle;
}

export interface LiveActivityData {
  nextPrayerName: string;
  nextPrayerNameAr: string;
  nextPrayerTime: string;
  timeRemainingMinutes: number;
  allPrayers: { name: string; nameAr: string; time: string; passed: boolean }[];
  hijriDate: string;
  style: LiveActivityStyle;
  duaText?: string;
  ayahText?: string;
  ayahRef?: string;
  sunriseTime?: string;
}

// ===================================================
// Storage
// ===================================================

const SETTINGS_KEY = '@live_activities_settings';

const DEFAULT_SETTINGS: LiveActivitySettings = {
  enabled: false,
  style: 'prayer_times',
};

export const getLiveActivitySettings = async (): Promise<LiveActivitySettings> => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* default */ }
  return DEFAULT_SETTINGS;
};

export const saveLiveActivitySettings = async (settings: LiveActivitySettings): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// ===================================================
// Native Bridge (stub — requires native module)
// ===================================================

/**
 * Start a Live Activity with initial data.
 */
export const startLiveActivity = async (data: LiveActivityData): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return false;
  try {
    return await LiveActivityModule.startPrayerLiveActivity(data);
  } catch (e) {
    console.log('📍 Live Activity start failed:', e);
    return false;
  }
};

/**
 * Update running Live Activity with new data.
 */
export const updateLiveActivity = async (data: LiveActivityData): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return false;
  try {
    return await LiveActivityModule.updatePrayerLiveActivity(data);
  } catch (e) {
    console.warn('📍 Live Activity update failed:', e);
    return false;
  }
};

/**
 * End the running Live Activity.
 */
export const endLiveActivity = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return false;
  try {
    return await LiveActivityModule.endPrayerLiveActivity();
  } catch (e) {
    console.warn('📍 Live Activity end failed:', e);
    return false;
  }
};

/**
 * Check if a Live Activity is currently running.
 */
export const isLiveActivityActive = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return false;
  try {
    return await LiveActivityModule.isActivityActive();
  } catch (e) {
    console.warn('📍 Live Activity isActive check failed:', e);
    return false;
  }
};

/**
 * Check if Live Activities are supported and enabled on this device.
 */
export const areActivitiesEnabled = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return false;
  try {
    return await LiveActivityModule.areActivitiesEnabled();
  } catch (e) {
    console.warn('📍 Live Activities areEnabled check failed:', e);
    return false;
  }
};

export const LIVE_ACTIVITY_STYLES: {
  id: LiveActivityStyle;
  nameAr: string;
  nameEn: string;
  descAr: string;
}[] = [
  {
    id: 'prayer_times',
    nameAr: 'أوقات الصلاة',
    nameEn: 'Prayer Times',
    descAr: 'عرض جميع أوقات الصلاة مع العد التنازلي',
  },
  {
    id: 'prayer_times_sunrise',
    nameAr: 'أوقات الصلاة مع الشروق',
    nameEn: 'Prayer Times with Sunrise',
    descAr: 'مع إضافة وقت الشروق',
  },
  {
    id: 'prayer_with_dua',
    nameAr: 'مع دعاء',
    nameEn: 'With Dua',
    descAr: 'الصلاة القادمة مع دعاء متجدد',
  },
  {
    id: 'prayer_with_ayah',
    nameAr: 'مع آية',
    nameEn: 'With Verse',
    descAr: 'الصلاة القادمة مع آية قرآنية',
  },
];
