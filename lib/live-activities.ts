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
  | 'prayer_times_sunrise';

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
  accentColor?: string;
  colorScheme?: 'light' | 'dark' | 'auto';
  language?: string;
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
    const result = await LiveActivityModule.startPrayerLiveActivity(data);
    if (result) setLastError(null);
    return result;
  } catch (e) {
    setLastError(e);
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
    const result = await LiveActivityModule.updatePrayerLiveActivity(data);
    if (result) setLastError(null);
    return result;
  } catch (e) {
    setLastError(e);
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

// ===================================================
// Diagnostics — distinguish "bridge missing" from "user disabled"
// ===================================================

export type LiveActivityStatus =
  | 'not_ios'                 // Running on Android/web
  | 'bridge_missing'          // Native module not linked (build issue)
  | 'system_disabled'         // ActivityKit available but user disabled in iOS Settings
  | 'enabled';                // Ready to use

let lastNativeError: string | null = null;

const setLastError = (err: unknown) => {
  if (!err) { lastNativeError = null; return; }
  if (typeof err === 'string') { lastNativeError = err; return; }
  const anyErr = err as { message?: string; code?: string | number };
  lastNativeError = `${anyErr.code ?? ''} ${anyErr.message ?? String(err)}`.trim();
};

export const getLastLiveActivityError = (): string | null => lastNativeError;

export const getLiveActivityStatus = async (): Promise<LiveActivityStatus> => {
  if (Platform.OS !== 'ios') return 'not_ios';
  if (!LiveActivityModule) return 'bridge_missing';
  try {
    const enabled: boolean = await LiveActivityModule.areActivitiesEnabled();
    return enabled ? 'enabled' : 'system_disabled';
  } catch (e) {
    setLastError(e);
    return 'system_disabled';
  }
};

export const isLiveActivityBridgeAvailable = (): boolean =>
  Platform.OS === 'ios' && !!LiveActivityModule;

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
];
