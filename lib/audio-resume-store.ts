// lib/audio-resume-store.ts
// Durable resume-position repository for long-form audio (Seerah, stories…).
//
// Each audio content gets an independent entry keyed by its stable track id,
// so positions never bleed between different contents. Entries survive app
// restarts (AsyncStorage) and are pruned by age/count so the map stays small.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = '@audio_resume_positions_v1';
const MAX_ENTRIES = 100;
// Resume positions must survive long inactivity — a listener returning after a
// year still expects to continue where they left off. Storage stays bounded by
// MAX_ENTRIES (least-recently-updated entries are evicted first), so the age cap
// only exists to eventually GC content the user truly abandoned. Keep it well
// past a year so "open the same story a year later" still offers resume.
const MAX_AGE_MS = 5 * 365 * 24 * 60 * 60 * 1000; // ~5 years

/** Below this position the listener barely started — restart silently. */
export const MIN_RESUME_POSITION_MS = 30_000;
/** Within this distance from the end the content counts as finished. */
export const NEAR_END_REMAINING_MS = 60_000;
/** …or past this fraction of the total duration. */
export const NEAR_END_PROGRESS_RATIO = 0.97;

export interface AudioResumeEntry {
  positionMs: number;
  durationMs: number;
  updatedAt: number;
}

let _map: Record<string, AudioResumeEntry> | null = null;
let _loadPromise: Promise<Record<string, AudioResumeEntry>> | null = null;

function pruneMap(map: Record<string, AudioResumeEntry>): Record<string, AudioResumeEntry> {
  const now = Date.now();
  let entries = Object.entries(map).filter(
    ([, entry]) => entry && now - entry.updatedAt <= MAX_AGE_MS,
  );
  if (entries.length > MAX_ENTRIES) {
    entries = entries
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ENTRIES);
  }
  return Object.fromEntries(entries);
}

async function loadMap(): Promise<Record<string, AudioResumeEntry>> {
  if (_map) return _map;
  if (!_loadPromise) {
    _loadPromise = AsyncStorage.getItem(STORE_KEY)
      .then((raw) => {
        _map = pruneMap(raw ? JSON.parse(raw) : {});
        return _map;
      })
      .catch(() => {
        _map = {};
        return _map;
      });
  }
  return _loadPromise;
}

function persist(map: Record<string, AudioResumeEntry>): void {
  AsyncStorage.setItem(STORE_KEY, JSON.stringify(map)).catch(() => {});
}

/** Last saved listening position for this content, or null if none. */
export async function getSavedPlaybackProgress(key: string): Promise<AudioResumeEntry | null> {
  if (!key) return null;
  const map = await loadMap();
  return map[key] ?? null;
}

/** Persist the current listening position for this content. */
export async function savePlaybackProgress(
  key: string,
  positionMs: number,
  durationMs: number,
): Promise<void> {
  if (!key || durationMs <= 0 || positionMs < 1000) return;
  const map = await loadMap();
  const prev = map[key];
  // Skip redundant writes when the position hasn't meaningfully moved.
  if (prev && Math.abs(prev.positionMs - positionMs) < 500 && prev.durationMs === durationMs) return;
  map[key] = {
    positionMs: Math.floor(positionMs),
    durationMs: Math.floor(durationMs),
    updatedAt: Date.now(),
  };
  persist(map);
}

/** Forget the saved position (on completion or explicit "start over"). */
export async function clearPlaybackProgress(key: string): Promise<void> {
  if (!key) return;
  const map = await loadMap();
  if (!(key in map)) return;
  delete map[key];
  persist(map);
}

/** True when the saved position is close enough to the end to count as finished. */
export function isNearCompletion(entry: AudioResumeEntry): boolean {
  if (entry.durationMs <= 0) return false;
  return (
    entry.durationMs - entry.positionMs <= NEAR_END_REMAINING_MS ||
    entry.positionMs / entry.durationMs >= NEAR_END_PROGRESS_RATIO
  );
}

/**
 * Whether returning to this content should ask "continue or start over".
 * Too early → restart silently. Nearly finished → treat as completed.
 */
export function shouldOfferResume(entry: AudioResumeEntry | null): entry is AudioResumeEntry {
  if (!entry) return false;
  if (entry.positionMs < MIN_RESUME_POSITION_MS) return false;
  if (isNearCompletion(entry)) return false;
  return true;
}
