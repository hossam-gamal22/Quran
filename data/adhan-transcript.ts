// data/adhan-transcript.ts
// Canonical adhan phrases displayed on the Full Adhan Player screen.
// Hand-transcribed from the standard Sunni adhan text. Do NOT modify without
// scholarly review. Used by app/full-adhan.tsx.
//
// v1 design: the FULL transcript is rendered statically on screen while audio
// plays. There is no phrase-by-phrase sync — that would require manually-
// calibrated per-voice timings (Option A, future work). Showing the sacred
// text out of sync with the muezzin is worse than showing it all at once.

export type CompleteAdhanVoiceKey =
  | 'makkah'
  | 'madinah'
  | 'al_aqsa'
  | 'mishary'
  | 'abdulbasit';

export interface AdhanTranscriptRow {
  left?: string;
  right?: string;
  center?: string;
}

const ALLAHU_AKBAR = 'اللَّهُ أَكْبَرُ';
const SHAHADA_TAWHEED = 'أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ';
const SHAHADA_RISALA = 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ';
const HAYYA_SALAH = 'حَيَّ عَلَى الصَّلَاةِ';
const HAYYA_FALAH = 'حَيَّ عَلَى الْفَلَاحِ';
const FAJR_EXTRA = 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ';
const TAWHID_FINAL = 'لاَ إِلَهَ إِلاَّ اللَّهُ';

/**
 * Canonical adhan transcript — used for non-Fajr prayers (Dhuhr, Asr, Maghrib, Isha).
 * Order is preserved from the standard text; each line is a distinct phrase.
 */
export const ADHAN_PHRASES_NORMAL: readonly string[] = [
  ALLAHU_AKBAR,
  ALLAHU_AKBAR,
  ALLAHU_AKBAR,
  ALLAHU_AKBAR,
  SHAHADA_TAWHEED,
  SHAHADA_TAWHEED,
  SHAHADA_RISALA,
  SHAHADA_RISALA,
  HAYYA_SALAH,
  HAYYA_SALAH,
  HAYYA_FALAH,
  HAYYA_FALAH,
  ALLAHU_AKBAR,
  ALLAHU_AKBAR,
  TAWHID_FINAL,
];

/**
 * Fajr-specific extra phrases — inserted AFTER the two حَيَّ عَلَى الْفَلَاحِ
 * and BEFORE the closing اللَّهُ أَكْبَرُ + لاَ إِلَهَ إِلاَّ اللَّهُ.
 * Only shown when the selected voice's audio actually contains these lines
 * (controlled by VOICE_HAS_FAJR_PHRASE below).
 */
export const FAJR_EXTRA_PHRASES: readonly string[] = [
  FAJR_EXTRA,
  FAJR_EXTRA,
];

/**
 * Per-voice flag: does the recording AUDIBLY contain "الصلاة خير من النوم"?
 *
 * Source of truth: the `Contains "الصلاة خير من النوم"` column in
 * `assets/sounds/adhan_complete/SOURCES.md`. Keep this map in sync with the
 * manifest after you bundle/replace any voice's audio file.
 *
 * Hard rule: never set `true` unless the audio actually says the phrase. If
 * `false`, the page falls back to the normal transcript so the user is never
 * shown words the muezzin is not reciting.
 */
export const VOICE_HAS_FAJR_PHRASE: Record<CompleteAdhanVoiceKey, boolean> = {
  makkah: false,
  madinah: false,
  al_aqsa: false,
  mishary: false,
  abdulbasit: false,
};

export function hasVoiceFajrPhrase(voice: CompleteAdhanVoiceKey): boolean {
  return VOICE_HAS_FAJR_PHRASE[voice] === true;
}

export function getAdhanRows(
  prayerKey: string | undefined,
  voice: CompleteAdhanVoiceKey,
  hasDedicatedFajrRecording = false,
): AdhanTranscriptRow[] {
  const includeFajrPhrase =
    prayerKey === 'fajr' && (hasDedicatedFajrRecording || hasVoiceFajrPhrase(voice));
  const rows: AdhanTranscriptRow[] = [
    { left: ALLAHU_AKBAR, right: ALLAHU_AKBAR },
    { left: ALLAHU_AKBAR, right: ALLAHU_AKBAR },
    { left: SHAHADA_TAWHEED, right: SHAHADA_TAWHEED },
    { left: SHAHADA_RISALA, right: SHAHADA_RISALA },
    { left: HAYYA_SALAH, right: HAYYA_SALAH },
    { left: HAYYA_FALAH, right: HAYYA_FALAH },
  ];

  if (includeFajrPhrase) {
    rows.push({ left: FAJR_EXTRA, right: FAJR_EXTRA });
  }

  rows.push(
    { left: ALLAHU_AKBAR, right: ALLAHU_AKBAR },
    { center: TAWHID_FINAL },
  );

  return rows;
}

export function countAdhanRowPhrases(rows: readonly AdhanTranscriptRow[]): number {
  return rows.reduce((count, row) => {
    if (row.center) return count + 1;
    return count + (row.left ? 1 : 0) + (row.right ? 1 : 0);
  }, 0);
}

/**
 * Returns the phrases to display for a given prayer + voice combination.
 *
 * Critical rule: only injects FAJR_EXTRA_PHRASES when the prayer IS Fajr AND
 * the selected voice's audio actually contains that phrase. Otherwise the
 * normal transcript is used so we never display words the muezzin isn't reciting.
 */
export function getAdhanPhrases(
  prayerKey: string | undefined,
  voice: CompleteAdhanVoiceKey,
  hasDedicatedFajrRecording = false,
): string[] {
  const isFajr = prayerKey === 'fajr';
  const voiceHasFajr = hasDedicatedFajrRecording || hasVoiceFajrPhrase(voice);
  if (isFajr && voiceHasFajr) {
    return [
      ...ADHAN_PHRASES_NORMAL.slice(0, 12),
      ...FAJR_EXTRA_PHRASES,
      ...ADHAN_PHRASES_NORMAL.slice(12),
    ];
  }
  return [...ADHAN_PHRASES_NORMAL];
}
