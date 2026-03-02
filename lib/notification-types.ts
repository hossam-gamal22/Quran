// lib/notification-types.ts
export type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface NotificationSettings {
  enabled: boolean;
  prayers: Record<PrayerKey, boolean>;
  advanceMinutes: number;
  adhanSound: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  prayers: {
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true,
  },
  advanceMinutes: 0,
  adhanSound: false,
};
