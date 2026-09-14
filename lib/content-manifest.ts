// Content version manifest (change-driven revalidation).
//
// Instead of re-reading whole content collections on every app open, the app
// reads ONE tiny doc — `appConfig/contentManifest` — that holds a version
// number per content type. A content fetcher only hits Firestore for its full
// collection when the manifest version for its key differs from what was last
// fetched (i.e. the admin actually changed something).
//
// Safety net: if a version bump is ever missed (or the admin panel predates
// this feature), `safetyTtlMs` forces a full refetch anyway after that window,
// so content can never get stuck stale forever.
//
// The manifest doc itself is read at most once per `MANIFEST_SESSION_TTL_MS`
// and shared in memory across all content types, so the per-open cost for the
// entire config/content layer collapses to a single document read.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const MANIFEST_DOC_ID = 'contentManifest';
const MANIFEST_SESSION_TTL_MS = 30 * 60 * 1000; // re-read the manifest at most every 30 min
const DEFAULT_SAFETY_TTL_MS = 24 * 60 * 60 * 1000; // self-heal even if a bump is missed
const FETCH_STATE_PREFIX = '@content_version:'; // per-key { v, ts }

type Manifest = Record<string, number>;

let _manifest: Manifest | null = null;
let _manifestFetchedAt = 0;
let _manifestInflight: Promise<Manifest | null> | null = null;

/** Reads the shared manifest doc, memoized for the session window. 1 read. */
async function loadManifest(): Promise<Manifest | null> {
  if (_manifest && Date.now() - _manifestFetchedAt < MANIFEST_SESSION_TTL_MS) {
    return _manifest;
  }
  if (_manifestInflight) return _manifestInflight;
  _manifestInflight = (async () => {
    try {
      const snap = await getDoc(doc(db, 'appConfig', MANIFEST_DOC_ID));
      _manifest = snap.exists() ? (snap.data() as Manifest) : {};
      _manifestFetchedAt = Date.now();
      return _manifest;
    } catch {
      return _manifest; // keep whatever we had on error — never throw on the hot path
    } finally {
      _manifestInflight = null;
    }
  })();
  return _manifestInflight;
}

async function readFetchState(key: string): Promise<{ v: number; ts: number }> {
  try {
    const raw = await AsyncStorage.getItem(FETCH_STATE_PREFIX + key);
    if (raw) {
      const s = JSON.parse(raw);
      return { v: Number(s.v) || 0, ts: Number(s.ts) || 0 };
    }
  } catch {
    // ignore — treat as never fetched
  }
  return { v: 0, ts: 0 };
}

/**
 * Should the caller re-read its full content collection from Firestore?
 *
 * Returns true when: never fetched, the safety TTL elapsed, or the admin
 * bumped this content type's manifest version since the last fetch. Otherwise
 * false — serve the local cache and skip the expensive read entirely.
 */
export async function shouldRefetchContent(
  key: string,
  opts?: { safetyTtlMs?: number },
): Promise<boolean> {
  const safetyTtl = opts?.safetyTtlMs ?? DEFAULT_SAFETY_TTL_MS;
  const { v: cachedVersion, ts: cachedTs } = await readFetchState(key);

  if (!cachedTs) return true; // never fetched on this device
  if (Date.now() - cachedTs >= safetyTtl) return true; // safety net for a missed bump

  const manifest = await loadManifest();
  const remoteVersion = Number(manifest?.[key]) || 0;
  return remoteVersion !== cachedVersion; // only refetch when admin actually changed it
}

/** Record that `key`'s full collection was just fetched at the current version. */
export async function markContentFetched(key: string): Promise<void> {
  const manifest = await loadManifest();
  const remoteVersion = Number(manifest?.[key]) || 0;
  try {
    await AsyncStorage.setItem(
      FETCH_STATE_PREFIX + key,
      JSON.stringify({ v: remoteVersion, ts: Date.now() }),
    );
  } catch {
    // ignore cache write failure — worst case we refetch next time
  }
}
