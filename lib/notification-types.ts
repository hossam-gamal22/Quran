// lib/notification-types.ts
export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface NotificationSettings {
  enabled: boolean;
  prayers: Record<PrayerKey, boolean>;
  advanceMinutes: number;
  adhanSound: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  prayers: {
    fajr: true,
    sunrise: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  advanceMinutes: 0,
  adhanSound: false,
};
