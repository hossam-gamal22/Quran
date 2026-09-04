// Smart Fajr Alarm — types
// Phase 2: mutex with regular Fajr, multi-notification cascade, multiple challenges

export type SmartAlarmKind = 'fajr' | 'suhoor';

/**
 * Challenge types:
 * - none: regular alarm — single tap dismisses
 * - math: 3 math problems (count depends on difficulty)
 * - shake: shake the device N times
 * - questions: religious Q (1/2/3 by difficulty)
 * - memory: 6 icons memory match (3 pairs)
 * - random: system picks one each fire
 */
export type ChallengeType = 'none' | 'math' | 'shake' | 'questions' | 'memory' | 'random';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type SnoozeDuration = 0 | 3 | 5 | 7 | 10;

/**
 * Alarm ringtone — separate from the in-app full-adhan that plays during
 * the challenge. These are short, attention-grabbing tones meant to wake
 * the user via lockscreen notifications. Files live in
 * assets/sounds/alarms/ and are fetched by scripts/fetch-alarm-sounds.sh.
 */
export type AlarmRingtoneKey =
  | 'alarm_classic'
  | 'alarm_digital'
  | 'alarm_buzzer'
  | 'alarm_radar'
  | 'alarm_chime';

export interface FajrAlarmConfig {
  enabled: boolean;
  /** Minutes before Fajr (positive = before, negative = after). Range: -15..+30 */
  offsetMinutes: number;
  /** Short ringtone the lockscreen notifications play */
  ringtoneKey: AlarmRingtoneKey;
  /** Adhan voice played in-app while the challenge runs */
  adhanVoice: string;
  challenge: ChallengeType;
  difficulty: Difficulty;
  /** Minutes added per snooze press; 0 disables snooze. Disabled when a challenge is required. */
  snoozeMinutes: SnoozeDuration;
}

export interface SuhoorAlarmConfig {
  enabled: boolean;
  /** Minutes before Fajr — Range: 10..120 */
  offsetMinutes: number;
  /** Uses the same alarm ringtone catalog as the Fajr alarm */
  ringtoneKey: AlarmRingtoneKey;
  /**
   * When true, dismissing the Suhoor alarm automatically logs fasting for
   * today in the worship tracker (so it shows in stats, honor board, etc).
   */
  logFastingOnDismiss: boolean;
  /**
   * Specific calendar dates (YYYY-MM-DD) the user picked to fast. The Suhoor
   * alarm only fires on these dates. Empty array → no alarm scheduled
   * (the user must pick days). Past dates are ignored at schedule time.
   */
  selectedDates: string[];
}

export interface SmartAlarmConfig {
  fajr: FajrAlarmConfig;
  suhoor: SuhoorAlarmConfig;
  /** Persisted version for future migrations */
  version: number;
}

export interface AlarmHistoryEntry {
  kind: SmartAlarmKind;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** When the alarm was scheduled to fire (ISO) */
  scheduledAt: string;
  /** When the user dismissed it (ISO). Null if not yet dismissed. */
  dismissedAt: string | null;
  /** True if user successfully completed any required challenge */
  challengePassed: boolean;
  /** Number of snoozes used before final dismiss */
  snoozeCount: number;
}

export const DEFAULT_SMART_ALARM_CONFIG: SmartAlarmConfig = {
  fajr: {
    enabled: false,
    offsetMinutes: 0,
    ringtoneKey: 'alarm_classic',
    adhanVoice: 'makkah',
    challenge: 'math',
    difficulty: 'medium',
    snoozeMinutes: 0,
  },
  suhoor: {
    enabled: false,
    offsetMinutes: 30,
    ringtoneKey: 'alarm_classic',
    logFastingOnDismiss: true,
    selectedDates: [],
  },
  version: 2,
};

export interface SmartAlarmPayload {
  type: 'smart_alarm';
  kind: SmartAlarmKind;
  scheduledAt: string;
  /** Index in the cascade (0 = first) — useful for telemetry */
  cascadeIndex?: number;
}

// ─── Cascade configuration ─────────────────────────────────────────────────
/** Number of lockscreen notifications fired in rapid succession */
export const CASCADE_COUNT = 6;
/** Seconds between cascade notifications */
export const CASCADE_INTERVAL_SEC = 10;

// ─── Ringtone catalog (assets/sounds/alarms/*.mp3) ─────────────────────────
export const ALARM_RINGTONES: { key: AlarmRingtoneKey; ar: string; en: string }[] = [
  { key: 'alarm_classic', ar: 'منبه كلاسيكي', en: 'Classic Alarm' },
  { key: 'alarm_digital', ar: 'منبه رقمي', en: 'Digital Alarm' },
  { key: 'alarm_buzzer', ar: 'صفّارة منبه', en: 'Buzzer' },
  { key: 'alarm_radar', ar: 'منبه رادار', en: 'Radar' },
  { key: 'alarm_chime', ar: 'جرس منبه', en: 'Chime' },
];

// ─── Adhan voices (full adhan for in-app playback) ─────────────────────────
export const ADHAN_VOICES: { key: string; ar: string; en: string }[] = [
  { key: 'makkah', ar: 'مكة', en: 'Makkah' },
  { key: 'madinah', ar: 'المدينة', en: 'Madinah' },
  { key: 'alaqsa', ar: 'الأقصى', en: 'Al-Aqsa' },
  { key: 'mishary', ar: 'المشاري', en: 'Mishary' },
  { key: 'abdulbasit', ar: 'عبد الباسط', en: 'Abdulbasit' },
];

// ─── Difficulty helpers ────────────────────────────────────────────────────
export function problemCountFor(challenge: ChallengeType, difficulty: Difficulty): number {
  if (challenge === 'none') return 0;
  switch (difficulty) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
  }
}
